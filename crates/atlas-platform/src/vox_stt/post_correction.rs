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

use regex::{Regex, RegexBuilder};

use super::dictionary::PersonalDictionary;
use super::types::PostCorrection;

const RULE_PERSONAL_DICTIONARY: &str = "personal_dictionary";

pub struct PostCorrectionOutput {
    pub text: String,
    pub corrections: Vec<PostCorrection>,
}

/// Applies dictionary variants -> preferred over `raw_text`. Returns the
/// rewritten text plus the list of corrections that fired (in application
/// order, deduplicated by the (from, to) pair to keep the audit lean).
pub fn apply(raw_text: &str, dictionary: &PersonalDictionary) -> PostCorrectionOutput {
    let mut current = raw_text.to_string();
    let mut corrections: Vec<PostCorrection> = Vec::new();

    let mut candidates: Vec<(&str, &str)> = Vec::new();
    for entry in &dictionary.entries {
        for variant in &entry.variants {
            if variant.trim().is_empty() {
                continue;
            }
            // Skip the variant when it is already exactly the preferred form
            // (case-sensitive). Self-rewrites are noise.
            if variant == &entry.preferred {
                continue;
            }
            candidates.push((variant.as_str(), entry.preferred.as_str()));
        }
    }
    // Longest variants win so multi-word forms are matched before their
    // single-word substrings.
    candidates.sort_by(|a, b| b.0.len().cmp(&a.0.len()));

    for (variant, preferred) in candidates {
        let pattern = format!(r"(?i)\b{}\b", regex::escape(variant));
        let re = match RegexBuilder::new(&pattern)
            .case_insensitive(true)
            .build()
        {
            Ok(re) => re,
            Err(_) => continue,
        };

        let (next, matches) = replace_collect(&re, &current, preferred);
        if !matches.is_empty() {
            for matched in matches {
                let correction = PostCorrection {
                    from: matched,
                    to: preferred.to_string(),
                    rule: RULE_PERSONAL_DICTIONARY.to_string(),
                };
                if !corrections.iter().any(|c| c.from.eq_ignore_ascii_case(&correction.from) && c.to == correction.to) {
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
        let out = apply("manda pro código olhar o live kit", &dict);

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
}
