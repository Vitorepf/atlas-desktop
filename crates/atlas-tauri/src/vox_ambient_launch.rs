//! Atlas Vox · Ambient Launch (V6-A).
//!
//! Caminho seguro pra abrir o Atlas Code já com Vox ouvindo sem que o usuário
//! precise abrir o app, clicar no botão de gravar e depois falar. Em V6-A:
//!
//!   1. O processo é lançado normalmente (LaunchAgent / Spotlight / script).
//!   2. Os argumentos da linha de comando ou as variáveis de ambiente carregam
//!      o sinal `--vox-start-listening` / `ATLAS_VOX_START_LISTENING=1`.
//!   3. `detect_ambient_launch_request` interpreta tudo no boot, antes de
//!      qualquer subsistema async, e guarda o resultado em
//!      `VoxAmbientLaunchState`.
//!   4. O frontend consome o sinal exatamente uma vez via o comando Tauri
//!      `vox_ambient_consume_pending_launch`. Single-shot — se o usuário
//!      atualizar o webview, não rebloqueia gravação.
//!
//! Segurança e privacidade (V6 canon):
//!   * Nenhum áudio cru persiste por causa desse atalho — o sinal só monta
//!     a sessão exatamente igual ao botão "Gravar" manual.
//!   * Não instala LaunchAgent invisível. O script é separado e exige uso
//!     explícito.
//!   * Microfone e permissões continuam a cargo do macOS — o Atlas só pede o
//!     que o `voxEdge*` normalmente pede.
//!   * Nenhuma execução de terminal automática.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

/// Flag de linha de comando aceita. O usuário também pode usar
/// `--vox-start-listening=1`, `=true`, `=yes`; valores `0`/`false`/`no`
/// desligam explicitamente.
pub const VOX_AMBIENT_CLI_FLAG: &str = "--vox-start-listening";

/// Variável de ambiente equivalente. Útil quando o app é aberto por um
/// helper que não pode passar argumentos (ex.: `open -a`).
pub const VOX_AMBIENT_ENV_VAR: &str = "ATLAS_VOX_START_LISTENING";

/// Resultado puro da inspeção do ambiente de boot. Determinístico —
/// `start_listening=true` exige sinal explícito (flag CLI ou env truthy).
/// `source` é só telemetria honesta pro overlay mostrar de onde veio.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AmbientLaunchRequest {
    pub start_listening: bool,
    pub source: AmbientLaunchSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AmbientLaunchSource {
    /// Sem sinal — caminho normal de abertura.
    None,
    /// `--vox-start-listening` na linha de comando.
    Cli,
    /// `ATLAS_VOX_START_LISTENING=1` no ambiente.
    Env,
    /// Ambos presentes (CLI venceu).
    CliAndEnv,
}

impl AmbientLaunchRequest {
    pub const fn idle() -> Self {
        Self {
            start_listening: false,
            source: AmbientLaunchSource::None,
        }
    }
}

fn parse_truthy(raw: &str) -> Option<bool> {
    let normalized = raw.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "" => None,
        "1" | "true" | "yes" | "y" | "on" => Some(true),
        "0" | "false" | "no" | "n" | "off" => Some(false),
        _ => None,
    }
}

/// Parser puro. Tolerante a:
///   * `--vox-start-listening`
///   * `--vox-start-listening=1` / `=true` / `=yes` / `=on`
///   * `--vox-start-listening=0` / `=false` (desliga mesmo se env=1)
///   * tudo após `--` é ignorado (convenção POSIX)
///
/// `env_value` é o valor literal de `ATLAS_VOX_START_LISTENING` (None quando a
/// variável não está setada).
pub fn detect_ambient_launch_request(
    cli_args: &[String],
    env_value: Option<&str>,
) -> AmbientLaunchRequest {
    let mut cli_flag: Option<bool> = None;
    let mut seen_separator = false;
    for arg in cli_args.iter() {
        if seen_separator {
            break;
        }
        if arg == "--" {
            seen_separator = true;
            continue;
        }
        if arg == VOX_AMBIENT_CLI_FLAG {
            // bare --vox-start-listening → liga (a menos que CLI já tenha negado)
            cli_flag = Some(cli_flag.unwrap_or(true) || true);
            continue;
        }
        if let Some(rest) = arg.strip_prefix(&format!("{VOX_AMBIENT_CLI_FLAG}=")) {
            if let Some(v) = parse_truthy(rest) {
                cli_flag = Some(v);
            }
        }
    }

    let env_flag = env_value.and_then(parse_truthy);

    match (cli_flag, env_flag) {
        // CLI explícito ganha (vale tanto pra ligar quanto desligar).
        (Some(true), Some(_)) => AmbientLaunchRequest {
            start_listening: true,
            source: AmbientLaunchSource::CliAndEnv,
        },
        (Some(true), None) => AmbientLaunchRequest {
            start_listening: true,
            source: AmbientLaunchSource::Cli,
        },
        (Some(false), _) => AmbientLaunchRequest::idle(),
        (None, Some(true)) => AmbientLaunchRequest {
            start_listening: true,
            source: AmbientLaunchSource::Env,
        },
        _ => AmbientLaunchRequest::idle(),
    }
}

/// Estado compartilhado entre o boot do app e o comando Tauri. Wrapper em
/// `AtomicBool` garante consumo single-shot sem usar Mutex async (o consumo
/// roda na thread principal do webview).
#[derive(Debug)]
pub struct VoxAmbientLaunchState {
    request: AmbientLaunchRequest,
    consumed: AtomicBool,
}

impl VoxAmbientLaunchState {
    pub fn new(request: AmbientLaunchRequest) -> Arc<Self> {
        Arc::new(Self {
            request,
            consumed: AtomicBool::new(false),
        })
    }

    pub fn from_process() -> Arc<Self> {
        let args: Vec<String> = std::env::args().collect();
        let env_raw = std::env::var(VOX_AMBIENT_ENV_VAR).ok();
        let request = detect_ambient_launch_request(&args, env_raw.as_deref());
        Self::new(request)
    }

    /// Snapshot sem mutar — útil para logs / telemetria. NÃO marca consumido.
    pub fn peek(&self) -> AmbientLaunchRequest {
        self.request.clone()
    }

    /// Single-shot. Devolve o estado original na primeira chamada e zera nas
    /// próximas (`start_listening=false`, `source=None`). Reentradas concorrentes
    /// — só a primeira ganha. Reload do webview NÃO rebloqueia o microfone.
    pub fn consume(&self) -> AmbientLaunchRequest {
        let already = self.consumed.swap(true, Ordering::SeqCst);
        if already {
            AmbientLaunchRequest::idle()
        } else {
            self.request.clone()
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Tauri command
// ──────────────────────────────────────────────────────────────────────────

use serde::Serialize;
use tauri::State;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VoxAmbientLaunchSnapshot {
    pub schema: &'static str,
    pub start_listening: bool,
    pub source: &'static str,
}

impl From<AmbientLaunchRequest> for VoxAmbientLaunchSnapshot {
    fn from(req: AmbientLaunchRequest) -> Self {
        VoxAmbientLaunchSnapshot {
            schema: "atlas.vox.ambient_launch.v1",
            start_listening: req.start_listening,
            source: match req.source {
                AmbientLaunchSource::None => "none",
                AmbientLaunchSource::Cli => "cli",
                AmbientLaunchSource::Env => "env",
                AmbientLaunchSource::CliAndEnv => "cli_and_env",
            },
        }
    }
}

/// Frontend consome o pedido ambient uma única vez no mount. Se o overlay já
/// estiver aberto, o overlay decide se está com sessão viva — esse comando só
/// reporta intenção.
#[tauri::command]
pub fn vox_ambient_consume_pending_launch(
    state: State<'_, Arc<VoxAmbientLaunchState>>,
) -> VoxAmbientLaunchSnapshot {
    state.consume().into()
}

// ──────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn args(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn no_signal_yields_idle() {
        let r = detect_ambient_launch_request(&args(&["atlas-code"]), None);
        assert!(!r.start_listening);
        assert_eq!(r.source, AmbientLaunchSource::None);
    }

    #[test]
    fn cli_bare_flag_starts_listening() {
        let r = detect_ambient_launch_request(
            &args(&["atlas-code", VOX_AMBIENT_CLI_FLAG]),
            None,
        );
        assert!(r.start_listening);
        assert_eq!(r.source, AmbientLaunchSource::Cli);
    }

    #[test]
    fn cli_explicit_true_starts_listening() {
        for value in ["1", "true", "yes", "on", "Y", "TRUE"] {
            let r = detect_ambient_launch_request(
                &args(&["atlas-code", &format!("{VOX_AMBIENT_CLI_FLAG}={value}")]),
                None,
            );
            assert!(r.start_listening, "value `{value}` should enable");
            assert_eq!(r.source, AmbientLaunchSource::Cli);
        }
    }

    #[test]
    fn cli_explicit_false_overrides_env() {
        let r = detect_ambient_launch_request(
            &args(&["atlas-code", &format!("{VOX_AMBIENT_CLI_FLAG}=false")]),
            Some("1"),
        );
        assert!(!r.start_listening);
        assert_eq!(r.source, AmbientLaunchSource::None);
    }

    #[test]
    fn env_truthy_starts_listening() {
        for value in ["1", "true", "yes", "on"] {
            let r = detect_ambient_launch_request(&args(&["atlas-code"]), Some(value));
            assert!(r.start_listening, "value `{value}` should enable via env");
            assert_eq!(r.source, AmbientLaunchSource::Env);
        }
    }

    #[test]
    fn env_falsy_stays_idle() {
        for value in ["0", "false", "no", "off", "", "garbage"] {
            let r = detect_ambient_launch_request(&args(&["atlas-code"]), Some(value));
            assert!(!r.start_listening, "value `{value}` should NOT enable");
        }
    }

    #[test]
    fn both_cli_and_env_reports_combined_source() {
        let r = detect_ambient_launch_request(
            &args(&["atlas-code", VOX_AMBIENT_CLI_FLAG]),
            Some("1"),
        );
        assert!(r.start_listening);
        assert_eq!(r.source, AmbientLaunchSource::CliAndEnv);
    }

    #[test]
    fn ignores_trailing_double_dash_flags() {
        // Convenção POSIX: tudo após `--` é argumento posicional, não flag.
        let r = detect_ambient_launch_request(
            &args(&["atlas-code", "--", VOX_AMBIENT_CLI_FLAG]),
            None,
        );
        assert!(!r.start_listening);
    }

    #[test]
    fn consume_is_single_shot() {
        let state = VoxAmbientLaunchState::new(AmbientLaunchRequest {
            start_listening: true,
            source: AmbientLaunchSource::Cli,
        });
        let first = state.consume();
        assert!(first.start_listening);
        let second = state.consume();
        assert!(
            !second.start_listening,
            "segundo consume() deve voltar idle"
        );
        assert_eq!(second.source, AmbientLaunchSource::None);
    }

    #[test]
    fn peek_does_not_consume() {
        let state = VoxAmbientLaunchState::new(AmbientLaunchRequest {
            start_listening: true,
            source: AmbientLaunchSource::Env,
        });
        assert!(state.peek().start_listening);
        assert!(state.peek().start_listening);
        let consumed = state.consume();
        assert!(consumed.start_listening);
        assert!(!state.consume().start_listening);
    }

    #[test]
    fn snapshot_serializes_source_as_kebab_lower() {
        let cases = [
            (AmbientLaunchSource::None, "none"),
            (AmbientLaunchSource::Cli, "cli"),
            (AmbientLaunchSource::Env, "env"),
            (AmbientLaunchSource::CliAndEnv, "cli_and_env"),
        ];
        for (source, expected) in cases {
            let snap: VoxAmbientLaunchSnapshot = AmbientLaunchRequest {
                start_listening: matches!(source, AmbientLaunchSource::None).not(),
                source,
            }
            .into();
            assert_eq!(snap.source, expected);
            assert_eq!(snap.schema, "atlas.vox.ambient_launch.v1");
        }
    }
}

#[cfg(test)]
trait BoolNot {
    fn not(self) -> bool;
}

#[cfg(test)]
impl BoolNot for bool {
    fn not(self) -> bool {
        !self
    }
}
