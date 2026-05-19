//! Atlas Vox · Ambient Hotkey Helper (V6-B).
//!
//! Pequeno binário macOS que existe por UM único motivo: registrar
//! `Option+Space` quando o `Atlas Code.app` está fechado e, ao ser
//! pressionado, lançar o app com o sinal canônico
//! `--vox-start-listening` (V6-A). O app sobe já ouvindo.
//!
//! Princípios duros (canon V6-B):
//!
//!   * **Nunca abre o microfone.** Áudio é responsabilidade exclusiva do
//!     `Atlas Code.app`. O helper só registra hotkey + spawn `open`.
//!   * **Nunca chama Kernel/provider.** Sem rede, sem HTTP, sem WebSocket.
//!   * **Nunca executa comandos de terminal além de `/usr/bin/open` e
//!     `/usr/bin/pgrep`** (com argumentos fixos).
//!   * **Cede o hotkey assim que o app abre.** Se o `Atlas Code.app`
//!     estiver rodando, o helper libera `Option+Space` para o runtime
//!     in-process (Wave 6.5). Isso evita contenção de hotkey no macOS.
//!   * **Recompõe o registro assim que o app fecha.** Volta a escutar
//!     `Option+Space` para a próxima vez.
//!   * **Falha humana.** Erros vão para o log; o LaunchAgent reinicia o
//!     processo se ele morrer. Nenhum estado escondido.
//!
//! Lifecycle:
//!
//!   1. Lê configuração (env `ATLAS_VOX_AMBIENT_BUNDLE` ou caminho default).
//!   2. Inicia o `VoxHotkeyRuntime` reaproveitado de `atlas-platform`.
//!   3. Loop principal a cada 750 ms:
//!        a. `pgrep -x "Atlas Code"` → app rodando? sim/não.
//!        b. Se mudou de estado, registra/desregistra hotkey.
//!        c. Drena receiver de eventos (não-bloqueante): se veio
//!           `ToggleRecording`, spawn `open -n -a <bundle> --args
//!           --vox-start-listening` com env `ATLAS_VOX_START_LISTENING=1`.
//!        d. Logs honestos a cada transição.
//!   4. Sai limpo em SIGTERM/SIGINT.
//!
//! Quando o app abre o `vox_ambient_consume_pending_launch` (V6-A) consome
//! o sinal uma única vez. Reload do webview não rebloqueia o microfone.

use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::time::{Duration, Instant};

use atlas_platform::vox::{VoxHotkeyEvent, VoxHotkeyRuntime};
use tokio::signal::unix::{signal, SignalKind};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

const DEFAULT_BUNDLE_PATH: &str = "/Applications/Atlas Code.app";
const FALLBACK_DEV_BUNDLE_PATH_REL: &str = "target/release/bundle/macos/Atlas Code.app";
const ATLAS_CODE_PROCESS_NAME: &str = "Atlas Code";
const POLL_INTERVAL_MS: u64 = 750;
const HOTKEY_DEBOUNCE_MS: u64 = 1_500;
const LOG_FILE_NAME: &str = "ambient-helper.log";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AppRunningState {
    NotRunning,
    Running,
}

/// Caminho do bundle resolvido em ordem honesta:
///   1. `--bundle=<path>` na linha de comando.
///   2. `ATLAS_VOX_AMBIENT_BUNDLE` no env.
///   3. `/Applications/Atlas Code.app` (instalação final).
///   4. Fallback dev: `<repo>/target/release/bundle/macos/Atlas Code.app`
///      onde `<repo>` é detectado a partir do binário do helper.
pub fn resolve_bundle_path(
    cli_args: &[String],
    env_value: Option<&str>,
    helper_executable: Option<&Path>,
) -> PathBuf {
    for arg in cli_args.iter().skip(1) {
        if let Some(rest) = arg.strip_prefix("--bundle=") {
            let trimmed = rest.trim();
            if !trimmed.is_empty() {
                return PathBuf::from(trimmed);
            }
        }
    }
    if let Some(raw) = env_value {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    let canonical = PathBuf::from(DEFAULT_BUNDLE_PATH);
    if canonical.exists() {
        return canonical;
    }
    // Fallback dev: sobe da posição do binário até achar `target/`.
    if let Some(exe) = helper_executable {
        let mut cursor = exe.to_path_buf();
        while let Some(parent) = cursor.parent() {
            let candidate = parent.join(FALLBACK_DEV_BUNDLE_PATH_REL);
            if candidate.exists() {
                return candidate;
            }
            // Para evitar varredura infinita, paramos em `/`.
            if parent.parent().is_none() {
                break;
            }
            cursor = parent.to_path_buf();
        }
    }
    canonical
}

fn detect_app_running(process_name: &str) -> AppRunningState {
    match Command::new("/usr/bin/pgrep")
        .args(["-x", process_name])
        .status()
    {
        Ok(s) if s.success() => AppRunningState::Running,
        _ => AppRunningState::NotRunning,
    }
}

fn log_dir() -> PathBuf {
    let home = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    PathBuf::from(home).join(".atlas").join("vox").join("logs")
}

fn init_logging() {
    // Mantém logs append em ~/.atlas/vox/logs/ambient-helper.log + stderr.
    // Sem rotação automática (LaunchAgent gerencia tamanho via plist).
    let dir = log_dir();
    let _ = std::fs::create_dir_all(&dir);
    let file_appender = tracing_appender::rolling::never(&dir, LOG_FILE_NAME);
    // tracing-subscriber: dois targets — arquivo e stderr.
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("atlas_vox_ambient_helper=info"));
    let subscriber = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .with_ansi(false)
        .with_writer(file_appender)
        .compact()
        .finish();
    let _ = tracing::subscriber::set_global_default(subscriber);
}

/// Decisão pura sobre como invocar `/usr/bin/open` quando o operador
/// pressiona Option+Space. Mantida sem efeito colateral para ser testável.
///
/// Regras:
///   * Atlas Code não rodando → spawn com `--args --vox-start-listening` para
///     que o boot sign-up dispare a sessão Vox.
///   * Atlas Code rodando     → só traz a janela para frente, SEM `-n` e SEM
///     `--args`. Isso elimina a janela de race do poll de 750 ms onde um
///     `open -n` criaria uma segunda instância. O hotkey in-process (Wave
///     6.5) decide se inicia/finaliza gravação na própria UI viva.
///
/// Em ambos os ramos NÃO usamos `-n` — `open -a` foca a instância existente
/// quando há uma, ou lança quando não há. O risco era exatamente o `-n`.
#[derive(Debug, Clone, PartialEq, Eq)]
struct OpenInvocation {
    args: Vec<String>,
    pass_start_listening_flag: bool,
}

fn plan_open_invocation(bundle: &Path, app_state: AppRunningState) -> OpenInvocation {
    match app_state {
        AppRunningState::NotRunning => OpenInvocation {
            args: vec![
                "-a".to_string(),
                bundle.to_string_lossy().into_owned(),
                "--args".to_string(),
                "--vox-start-listening".to_string(),
            ],
            pass_start_listening_flag: true,
        },
        AppRunningState::Running => OpenInvocation {
            // Só foca a instância viva. O hotkey in-process do app vai
            // tratar Option+Space como toggle (start/finish) — não passamos
            // `--args` porque a instância já em execução não relê argv.
            args: vec!["-a".to_string(), bundle.to_string_lossy().into_owned()],
            pass_start_listening_flag: false,
        },
    }
}

/// Spawn não-bloqueante. Faz uma **re-checagem** de pgrep imediatamente antes
/// de invocar `open` para fechar a janela de race do poll do loop principal.
/// Devolve `Ok` se conseguiu disparar; o app pode ainda assim falhar — o
/// helper só registra que o gatilho saiu.
fn spawn_atlas_code_listening(bundle: &Path) -> Result<(), String> {
    let app_state = detect_app_running(ATLAS_CODE_PROCESS_NAME);
    let invocation = plan_open_invocation(bundle, app_state);
    let mut cmd = Command::new("/usr/bin/open");
    for a in &invocation.args {
        cmd.arg(a);
    }
    if invocation.pass_start_listening_flag {
        // Helper continua exportando o env var como amortecedor. `open` não
        // propaga env vars para o .app por padrão, mas se um dia trocarmos
        // para `osascript` ou `launchctl asuser` o flag já está aqui.
        cmd.env("ATLAS_VOX_START_LISTENING", "1");
    }
    match cmd.spawn() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("falha ao spawn /usr/bin/open: {e}")),
    }
}

struct HotkeyController {
    runtime: Arc<VoxHotkeyRuntime>,
    /// Sender para o orquestrador async que drena o canal de eventos do
    /// `VoxHotkeyRuntime`. Recriado a cada `start()` (o runtime entrega um
    /// novo receiver toda vez).
    event_task: Mutex<Option<tokio::task::JoinHandle<()>>>,
    started: Mutex<bool>,
}

impl HotkeyController {
    fn new(runtime: Arc<VoxHotkeyRuntime>) -> Self {
        Self {
            runtime,
            event_task: Mutex::new(None),
            started: Mutex::new(false),
        }
    }

    async fn ensure_registered<F>(&self, mut on_event: F) -> Result<bool, String>
    where
        F: FnMut(VoxHotkeyEvent) + Send + 'static,
    {
        let mut started = self.started.lock().await;
        if *started {
            return Ok(false);
        }
        let mut rx = self
            .runtime
            .start()
            .map_err(|e| format!("hotkey start: {e:?}"))?;
        *started = true;
        let task = tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                on_event(event);
            }
        });
        *self.event_task.lock().await = Some(task);
        info!("Option+Space registrado · helper escutando.");
        Ok(true)
    }

    async fn ensure_unregistered(&self) -> bool {
        let mut started = self.started.lock().await;
        if !*started {
            return false;
        }
        self.runtime.stop();
        *started = false;
        if let Some(task) = self.event_task.lock().await.take() {
            task.abort();
        }
        info!("Option+Space liberado · Atlas Code em foco, hotkey in-process assume.");
        true
    }
}

async fn shutdown_signal() {
    // Espera SIGTERM (default do launchctl unload) OU SIGINT (Ctrl+C ao
    // rodar manualmente). O LaunchAgent envia SIGTERM em unload.
    let mut term = signal(SignalKind::terminate()).expect("install SIGTERM handler");
    let mut intr = signal(SignalKind::interrupt()).expect("install SIGINT handler");
    tokio::select! {
        _ = term.recv() => info!("SIGTERM recebido — encerrando helper."),
        _ = intr.recv() => info!("SIGINT recebido — encerrando helper."),
    }
}

fn cli_args_owned() -> Vec<String> {
    env::args().collect()
}

#[tokio::main(flavor = "multi_thread", worker_threads = 2)]
async fn main() {
    init_logging();

    let exe_path = env::current_exe().ok();
    let env_bundle = env::var("ATLAS_VOX_AMBIENT_BUNDLE").ok();
    let bundle = resolve_bundle_path(
        &cli_args_owned(),
        env_bundle.as_deref(),
        exe_path.as_deref(),
    );

    info!(
        bundle = %bundle.display(),
        "Atlas Vox Ambient Helper iniciado · canon `atlas.vox.ambient_helper.v1`."
    );

    if !bundle.exists() {
        warn!(
            bundle = %bundle.display(),
            "Bundle não encontrado. Helper segue rodando, mas só vai abrir quando o app existir no caminho — instale o Atlas Code primeiro."
        );
    }

    // Estado de debounce, compartilhado entre callback síncrono do hotkey
    // e o loop principal.
    let last_trigger = Arc::new(std::sync::Mutex::new(Instant::now() - Duration::from_secs(60)));
    let bundle_for_cb = bundle.clone();
    let last_trigger_cb = Arc::clone(&last_trigger);

    let runtime = Arc::new(VoxHotkeyRuntime::new());
    let controller = HotkeyController::new(Arc::clone(&runtime));

    let on_event = move |event: VoxHotkeyEvent| {
        if !matches!(event, VoxHotkeyEvent::ToggleRecordingRequested) {
            return; // ignoramos open/eclipse/cancel — não são nosso papel.
        }
        let mut guard = match last_trigger_cb.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        if guard.elapsed() < Duration::from_millis(HOTKEY_DEBOUNCE_MS) {
            warn!("Hotkey ignorada por debounce (< {HOTKEY_DEBOUNCE_MS} ms).");
            return;
        }
        *guard = Instant::now();
        drop(guard);

        match spawn_atlas_code_listening(&bundle_for_cb) {
            Ok(()) => info!(
                bundle = %bundle_for_cb.display(),
                "Option+Space disparado → /usr/bin/open com --vox-start-listening."
            ),
            Err(e) => error!(error = %e, "Falha ao spawn do Atlas Code."),
        }
    };

    // Liga ou não dependendo do estado inicial.
    let mut app_state = detect_app_running(ATLAS_CODE_PROCESS_NAME);
    if app_state == AppRunningState::NotRunning {
        if let Err(e) = controller.ensure_registered(on_event.clone()).await {
            error!(error = %e, "Falha ao registrar Option+Space inicialmente.");
        }
    } else {
        info!("Atlas Code já está rodando — helper segue em standby.");
    }

    let mut poll = tokio::time::interval(Duration::from_millis(POLL_INTERVAL_MS));
    // Pula o primeiro tick imediato (o estado inicial já foi avaliado).
    poll.tick().await;

    loop {
        tokio::select! {
            _ = poll.tick() => {
                let next = detect_app_running(ATLAS_CODE_PROCESS_NAME);
                if next == app_state { continue; }
                app_state = next;
                match next {
                    AppRunningState::Running => {
                        if controller.ensure_unregistered().await {
                            info!("Transição: app fechado → app aberto.");
                        }
                    }
                    AppRunningState::NotRunning => {
                        info!("Transição: app aberto → app fechado.");
                        if let Err(e) = controller.ensure_registered(on_event.clone()).await {
                            error!(error = %e, "Falha ao re-registrar Option+Space depois que app fechou.");
                        }
                    }
                }
            }
            _ = shutdown_signal() => {
                let _ = controller.ensure_unregistered().await;
                info!("Helper encerrado.");
                return;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(parts: &[&str]) -> Vec<String> {
        parts.iter().map(|s| (*s).to_string()).collect()
    }

    #[test]
    fn cli_bundle_arg_overrides_everything() {
        let path = resolve_bundle_path(
            &argv(&["atlas-vox-ambient-helper", "--bundle=/tmp/Foo.app"]),
            Some("/tmp/Bar.app"),
            None,
        );
        assert_eq!(path, PathBuf::from("/tmp/Foo.app"));
    }

    #[test]
    fn env_overrides_canonical_when_set() {
        let path = resolve_bundle_path(
            &argv(&["atlas-vox-ambient-helper"]),
            Some("/tmp/FromEnv.app"),
            None,
        );
        assert_eq!(path, PathBuf::from("/tmp/FromEnv.app"));
    }

    #[test]
    fn whitespace_bundle_arg_is_ignored() {
        let path = resolve_bundle_path(
            &argv(&["atlas-vox-ambient-helper", "--bundle=   "]),
            Some("/tmp/Real.app"),
            None,
        );
        assert_eq!(path, PathBuf::from("/tmp/Real.app"));
    }

    #[test]
    fn canonical_path_when_nothing_else() {
        let path = resolve_bundle_path(
            &argv(&["atlas-vox-ambient-helper"]),
            None,
            None,
        );
        assert_eq!(path, PathBuf::from(DEFAULT_BUNDLE_PATH));
    }

    #[test]
    fn first_bundle_arg_wins_over_second() {
        let path = resolve_bundle_path(
            &argv(&[
                "atlas-vox-ambient-helper",
                "--bundle=/tmp/A.app",
                "--bundle=/tmp/B.app",
            ]),
            None,
            None,
        );
        assert_eq!(path, PathBuf::from("/tmp/A.app"));
    }

    #[test]
    fn pgrep_smoke_does_not_panic_with_nonexistent_process() {
        // Nome forjado pra garantir que mesmo na ausência do binário pgrep
        // a fn devolve `NotRunning` honesto (Command::status falha → branch _).
        let state = detect_app_running("__atlas_nonexistent_process_for_test__");
        assert_eq!(state, AppRunningState::NotRunning);
    }

    // ── plan_open_invocation: duplicate-instance guard ─────────────────────

    #[test]
    fn plan_when_app_not_running_passes_start_listening_flag() {
        let plan = plan_open_invocation(
            Path::new("/Applications/Atlas Code.app"),
            AppRunningState::NotRunning,
        );
        assert!(plan.pass_start_listening_flag);
        assert!(
            plan.args.iter().any(|a| a == "--vox-start-listening"),
            "spawn deve carregar --vox-start-listening quando app fechado"
        );
        assert!(
            plan.args.iter().any(|a| a == "--args"),
            "deve usar --args para passar a flag"
        );
        assert!(
            !plan.args.iter().any(|a| a == "-n"),
            "NUNCA use -n: força nova instância e duplica sessão"
        );
    }

    #[test]
    fn plan_when_app_running_only_focuses_no_dup_no_flag() {
        let plan = plan_open_invocation(
            Path::new("/Applications/Atlas Code.app"),
            AppRunningState::Running,
        );
        assert!(!plan.pass_start_listening_flag);
        assert!(
            !plan.args.iter().any(|a| a == "--vox-start-listening"),
            "app já rodando: helper não pode pedir start_listening (UI in-process toggla)"
        );
        assert!(
            !plan.args.iter().any(|a| a == "--args"),
            "app já rodando: nada de --args porque a instância viva não relê argv"
        );
        assert!(
            !plan.args.iter().any(|a| a == "-n"),
            "NUNCA use -n: força nova instância e duplica sessão"
        );
        // O foco depende de `open -a <bundle>`.
        assert_eq!(plan.args[0], "-a");
        assert!(plan.args[1].ends_with("Atlas Code.app"));
    }

    #[test]
    fn plan_never_uses_n_flag() {
        for state in [AppRunningState::Running, AppRunningState::NotRunning] {
            let plan = plan_open_invocation(Path::new("/Applications/Atlas Code.app"), state);
            assert!(
                !plan.args.iter().any(|a| a == "-n"),
                "regressão crítica: -n duplica instância (state={state:?})"
            );
        }
    }
}
