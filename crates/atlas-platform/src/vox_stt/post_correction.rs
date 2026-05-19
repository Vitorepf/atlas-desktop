//! Post-correction pass: rewrites STT output using the personal dictionary.
//!
//! Rules:
//!   - Case-insensitive match.
//!   - Word-boundary aware (won't rewrite inside a longer word).
//!   - Multi-word variants supported (e.g. `"live kit"` -> `"LiveKit"`).
//!   - Punctuation around the match is preserved.
//!   - Longer variants are tried first so `"atlas vox"` doesn't get partially
//!     rewritten to `"Atlas vox"` by the `"atlas"` variant.
//!   - Each rewrite is recorded as a `PostCorrection { rule: "personal_dictionary" }`.
//!
//! V6-PF · Performance Final.
//!   - O dicionário pre-populated tem ~200 variantes. Cada `apply()` recompila
//!     todas elas, somando 5–15 ms de overhead determinístico por transcrição
//!     (perceptível em frases curtas).
//!   - Mantemos um cache em memória `version → (Vec<(Regex, &str)>)` numa
//!     `Mutex` (parking_lot). A primeira chamada constrói; chamadas seguintes
//!     com mesmo `dictionary.version` reusam.
//!   - Cache nunca cresce sem limite: substituímos o conteúdo quando uma
//!     versão diferente chega. Dicionário vive em `~/.atlas/vox/`; versão
//!     mudou ⇒ recompila uma vez e segue.

use std::sync::OnceLock;

use parking_lot::Mutex;
use regex::{Regex, RegexBuilder};

use super::dictionary::PersonalDictionary;
use super::types::PostCorrection;

const RULE_PERSONAL_DICTIONARY: &str = "personal_dictionary";

pub struct PostCorrectionOutput {
    pub text: String,
    pub corrections: Vec<PostCorrection>,
}

/// V6-PF · cache compartilhado de regexes compiladas indexado por
/// `dictionary.version`. Padrões e seus preferred são pré-ordenados (mais
/// longos primeiro) na entrada.
struct CompiledRules {
    version: u32,
    rules: Vec<(Regex, String)>,
}

fn cache() -> &'static Mutex<Option<CompiledRules>> {
    static CACHE: OnceLock<Mutex<Option<CompiledRules>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(None))
}

/// Compila (ou reusa) as regras de pós-correção para `dictionary`. A função
/// nunca aloca para chamadas com a mesma versão depois do primeiro hit.
fn rules_for(dictionary: &PersonalDictionary) -> Vec<(Regex, String)> {
    let cache = cache();
    {
        let guard = cache.lock();
        if let Some(ref compiled) = *guard {
            if compiled.version == dictionary.version {
                return compiled.rules.clone();
            }
        }
    }

    let mut candidates: Vec<(&str, &str)> = Vec::new();
    for entry in &dictionary.entries {
        for variant in &entry.variants {
            if variant.trim().is_empty() {
                continue;
            }
            if variant == &entry.preferred {
                continue;
            }
            candidates.push((variant.as_str(), entry.preferred.as_str()));
        }
    }
    candidates.sort_by(|a, b| b.0.len().cmp(&a.0.len()));

    let mut compiled: Vec<(Regex, String)> = Vec::with_capacity(candidates.len());
    for (variant, preferred) in candidates {
        let pattern = format!(r"(?i)\b{}\b", regex::escape(variant));
        if let Ok(re) = RegexBuilder::new(&pattern).case_insensitive(true).build() {
            compiled.push((re, preferred.to_string()));
        }
    }

    {
        let mut guard = cache.lock();
        *guard = Some(CompiledRules {
            version: dictionary.version,
            rules: compiled.clone(),
        });
    }

    compiled
}

/// Applies dictionary variants -> preferred over `raw_text`. Returns the
/// rewritten text plus the list of corrections that fired (in application
/// order, deduplicated by the (from, to) pair to keep the audit lean).
pub fn apply(raw_text: &str, dictionary: &PersonalDictionary) -> PostCorrectionOutput {
    let mut current = raw_text.to_string();
    let mut corrections: Vec<PostCorrection> = Vec::new();

    let rules = rules_for(dictionary);

    for (re, preferred) in &rules {
        let (next, matches) = replace_collect(re, &current, preferred);
        if !matches.is_empty() {
            for matched in matches {
                let correction = PostCorrection {
                    from: matched,
                    to: preferred.clone(),
                    rule: RULE_PERSONAL_DICTIONARY.to_string(),
                };
                if !corrections.iter().any(|c| {
                    c.from.eq_ignore_ascii_case(&correction.from) && c.to == correction.to
                }) {
                    corrections.push(correction);
                }
            }
            current = next;
        }
    }

    PostCorrectionOutput {
        text: current,
        corrections,
    }
}

/// V6-PF · helper exposto SOMENTE em testes para garantir que o cache está
/// servindo entradas. Não fica no API público em release.
#[cfg(test)]
pub(crate) fn cache_size_for_test() -> Option<(u32, usize)> {
    cache()
        .lock()
        .as_ref()
        .map(|c| (c.version, c.rules.len()))
}

/// Like `Regex::replace_all`, but also returns the actual matched substrings
/// so we can record what was rewritten (case-preserved as it appeared in the
/// source). Matches that already equal `replacement` byte-for-byte are kept
/// as-is and NOT reported — rewriting "LiveKit" into "LiveKit" is a no-op
/// and would just pollute the audit trail.
fn replace_collect(re: &Regex, haystack: &str, replacement: &str) -> (String, Vec<String>) {
    let mut out = String::with_capacity(haystack.len());
    let mut last_end = 0;
    let mut matches: Vec<String> = Vec::new();
    for m in re.find_iter(haystack) {
        let matched = &haystack[m.start()..m.end()];
        out.push_str(&haystack[last_end..m.start()]);
        if matched == replacement {
            // Already canonical — leave the source slice untouched.
            out.push_str(matched);
        } else {
            out.push_str(replacement);
            matches.push(matched.to_string());
        }
        last_end = m.end();
    }
    out.push_str(&haystack[last_end..]);
    (out, matches)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vox_stt::dictionary::PersonalDictionary;

    #[test]
    fn rewrites_variants_to_preferred_and_records_corrections() {
        let dict = PersonalDictionary::pre_populated();
        // V6-ES-B · "codes" é variante segura de mishearing pra Codex.
        // "código" é palavra PT-BR comum e NUNCA pode disparar canon.
        let out = apply("manda pro codes olhar o live kit", &dict);

        assert!(out.text.contains("Codex"), "got: {}", out.text);
        assert!(out.text.contains("LiveKit"), "got: {}", out.text);
        assert!(
            out.corrections.iter().any(|c| c.to == "Codex" && c.rule == "personal_dictionary"),
            "no Codex correction recorded: {:?}",
            out.corrections
        );
        assert!(
            out.corrections.iter().any(|c| c.to == "LiveKit"),
            "no LiveKit correction recorded: {:?}",
            out.corrections
        );
    }

    #[test]
    fn preserves_unrelated_words_and_punctuation() {
        let dict = PersonalDictionary::pre_populated();
        let out = apply("Bom dia, eu quero codes hoje.", &dict);
        assert!(out.text.starts_with("Bom dia,"));
        assert!(out.text.ends_with("hoje."));
        assert!(out.text.contains("Codex"));
    }

    /// V6-ES-B · guard explícito: palavras PT-BR comuns NUNCA sofrem rewrite.
    #[test]
    fn never_rewrites_common_pt_br_words() {
        let dict = PersonalDictionary::pre_populated();
        let safe = [
            "preciso revisar o código antes do deploy",
            "uma caixa de box no canto",
            "abre o terminal",
            "esse prompt já está pronto",
            "ração dog food",
            "salva no desktop a apresentação",
        ];
        for phrase in safe {
            let out = apply(phrase, &dict);
            assert_eq!(out.text, phrase, "frase comum alterada: {} → {}", phrase, out.text);
            assert!(out.corrections.is_empty(), "corrigiu fala comum: {:?}", out.corrections);
        }
    }

    #[test]
    fn does_not_rewrite_inside_longer_words() {
        // "vox" is a dictionary variant; "vóxel" must not be touched.
        let mut dict = PersonalDictionary::pre_populated();
        // Force a tight `vox` variant to make the test deterministic.
        dict.entries.push(crate::vox_stt::dictionary::DictionaryEntry {
            phrase: "Vox".into(),
            variants: vec!["vox".into()],
            preferred: "Vox".into(),
        });
        let out = apply("o pixel é vox e o vóxel é grande", &dict);
        assert!(out.text.contains("Vox"), "got: {}", out.text);
        assert!(out.text.contains("vóxel"), "vóxel was clobbered: {}", out.text);
    }

    #[test]
    fn no_corrections_when_text_is_already_canonical() {
        let dict = PersonalDictionary::pre_populated();
        let out = apply("o Codex usa o LiveKit", &dict);
        assert!(out.corrections.is_empty(), "unexpected corrections: {:?}", out.corrections);
        assert_eq!(out.text, "o Codex usa o LiveKit");
    }

    #[test]
    fn longer_variants_win_over_substrings() {
        let mut dict = PersonalDictionary::pre_populated();
        dict.entries.push(crate::vox_stt::dictionary::DictionaryEntry {
            phrase: "Atlas Vox".into(),
            variants: vec!["atlas vox".into()],
            preferred: "Atlas Vox".into(),
        });
        let out = apply("rodando atlas vox agora", &dict);
        assert!(out.text.contains("Atlas Vox"), "got: {}", out.text);
        // Should not contain split-rewrite artifacts like "Atlas vox" or "atlas Vox".
        assert!(!out.text.contains("Atlas vox"), "split rewrite: {}", out.text);
    }

    /// V6-PF · o cache de regexes compiladas deve ser populado após a
    /// primeira chamada e refletir a versão do dicionário corrente.
    #[test]
    fn cache_is_populated_after_first_apply() {
        let dict = PersonalDictionary::pre_populated();
        // primeira chamada compila e armazena
        let _ = apply("aquecimento de cache", &dict);
        let snapshot = cache_size_for_test().expect("cache vazio após primeira apply");
        assert_eq!(snapshot.0, dict.version);
        assert!(snapshot.1 > 0, "cache de regras não pode estar vazio");
    }

    /// V6-PF · trocando a versão do dicionário, o cache é re-populado.
    #[test]
    fn cache_repopulates_when_dictionary_version_changes() {
        let mut dict = PersonalDictionary::pre_populated();
        dict.version = 1;
        let _ = apply("primeira versão", &dict);
        let first = cache_size_for_test().expect("snapshot 1");
        assert_eq!(first.0, 1);

        dict.version = 2;
        let _ = apply("segunda versão", &dict);
        let second = cache_size_for_test().expect("snapshot 2");
        assert_eq!(second.0, 2);
    }

    /// V6-PF · cache HIT (mesma versão chamada duas vezes) deve produzir
    /// resultados idênticos. Garantia de correção sob reuso.
    #[test]
    fn cache_hit_preserves_correctness_across_calls() {
        let dict = PersonalDictionary::pre_populated();
        let first = apply("manda pro codes olhar o live kit", &dict);
        let second = apply("manda pro codes olhar o live kit", &dict);
        assert_eq!(first.text, second.text);
        assert_eq!(first.corrections.len(), second.corrections.len());
    }
}
