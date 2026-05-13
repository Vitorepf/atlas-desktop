//! Local receipt-signing boundary.
//!
//! Atlas Code never mints decisions — those come from the Kernel. This crate
//! takes the canonical Decision-Receipt payload, signs it with an ed25519
//! key stored in the macOS Keychain (or, on dev, a sidecar file), and
//! returns the signature for the desktop to POST back to the Kernel.
//!
//! Canonical payload format (must match server verifier):
//!
//!   "atlas-decision/v1\n{decisionId}\n{signedAt}\n{signerId}"
//!
//! Server verifier: AtlasCodeReceiptController::canonicalPayload + sodium.

#![forbid(unsafe_code)]

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::{DateTime, Utc};
use ed25519_dalek::{Signer, SigningKey, Verifier, VerifyingKey, SECRET_KEY_LENGTH};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use thiserror::Error;

const KEY_LABEL: &str = "atlas-code-decision-signer";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptSignaturePayload {
    pub signature: String,
    pub public_key: String,
    pub signed_at: DateTime<Utc>,
    pub signer_id: String,
}

#[derive(Debug, Error)]
pub enum SignerError {
    #[error("keychain unavailable: {0}")]
    KeychainUnavailable(String),
    #[error("signing failed: {0}")]
    SigningFailed(String),
    #[error("decoding failed: {0}")]
    DecodingFailed(String),
}

/// Single entry point. Lazily resolves a signing key (creating a new one
/// the first time), signs the canonical payload, returns base64 envelope.
pub struct ReceiptSigner;

impl Default for ReceiptSigner {
    fn default() -> Self {
        Self
    }
}

impl ReceiptSigner {
    pub fn new() -> Self {
        Self
    }

    /// Sign a canonical Decision-Receipt payload. The payload is built
    /// here so callers can't accidentally diverge from the server format.
    pub fn sign_decision(
        &self,
        decision_id: &str,
        signed_at: DateTime<Utc>,
        signer_id: Option<&str>,
    ) -> Result<ReceiptSignaturePayload, SignerError> {
        let signing_key = load_or_create_key()?;
        let signer = signer_id
            .map(|s| s.to_string())
            .unwrap_or_else(default_signer_id);
        let payload = canonical_payload(decision_id, &signed_at, &signer);
        let signature = signing_key.sign(payload.as_bytes());

        Ok(ReceiptSignaturePayload {
            signature: BASE64.encode(signature.to_bytes()),
            public_key: BASE64.encode(signing_key.verifying_key().to_bytes()),
            signed_at,
            signer_id: signer,
        })
    }

    /// Convenience for tests / smoke checks.
    pub fn verify(payload: &ReceiptSignaturePayload, decision_id: &str) -> Result<bool, SignerError> {
        let canonical = canonical_payload(decision_id, &payload.signed_at, &payload.signer_id);
        let pk_bytes = BASE64
            .decode(&payload.public_key)
            .map_err(|e| SignerError::DecodingFailed(e.to_string()))?;
        let sig_bytes = BASE64
            .decode(&payload.signature)
            .map_err(|e| SignerError::DecodingFailed(e.to_string()))?;
        let verifying_key = VerifyingKey::from_bytes(
            pk_bytes
                .as_slice()
                .try_into()
                .map_err(|_| SignerError::DecodingFailed("public key not 32 bytes".to_string()))?,
        )
        .map_err(|e| SignerError::DecodingFailed(e.to_string()))?;
        let signature = ed25519_dalek::Signature::from_slice(&sig_bytes)
            .map_err(|e| SignerError::DecodingFailed(e.to_string()))?;
        Ok(verifying_key.verify(canonical.as_bytes(), &signature).is_ok())
    }
}

pub fn canonical_payload(decision_id: &str, signed_at: &DateTime<Utc>, signer_id: &str) -> String {
    format!(
        "atlas-decision/v1\n{decision_id}\n{}\n{signer_id}",
        signed_at.format("%Y-%m-%dT%H:%M:%S+00:00")
    )
}

fn default_signer_id() -> String {
    let host = hostname::get()
        .ok()
        .and_then(|s| s.into_string().ok())
        .unwrap_or_else(|| "atlas-code".to_string());
    format!("operator@{host}")
}

#[cfg(target_os = "macos")]
fn load_or_create_key() -> Result<SigningKey, SignerError> {
    use security_framework::passwords::{get_generic_password, set_generic_password};

    match get_generic_password(KEY_LABEL, KEY_LABEL) {
        Ok(bytes) if bytes.len() == SECRET_KEY_LENGTH => Ok(SigningKey::from_bytes(
            bytes
                .as_slice()
                .try_into()
                .map_err(|_| SignerError::KeychainUnavailable("malformed key bytes".to_string()))?,
        )),
        _ => {
            // Generate fresh ed25519 keypair, persist private key in Keychain.
            let mut csprng = OsRng;
            let signing = SigningKey::generate(&mut csprng);
            set_generic_password(KEY_LABEL, KEY_LABEL, &signing.to_bytes())
                .map_err(|e| SignerError::KeychainUnavailable(e.to_string()))?;
            Ok(signing)
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn load_or_create_key() -> Result<SigningKey, SignerError> {
    // Dev fallback: file under XDG_DATA_HOME / ~/.atlas/decision-signer.key.
    use std::fs;
    use std::io::ErrorKind;
    use std::path::PathBuf;

    let mut path = if let Ok(p) = std::env::var("XDG_DATA_HOME") {
        PathBuf::from(p)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".atlas")
    } else {
        return Err(SignerError::KeychainUnavailable("no HOME".to_string()));
    };
    fs::create_dir_all(&path)
        .map_err(|e| SignerError::KeychainUnavailable(e.to_string()))?;
    path.push("decision-signer.key");
    match fs::read(&path) {
        Ok(bytes) if bytes.len() == SECRET_KEY_LENGTH => Ok(SigningKey::from_bytes(
            bytes
                .as_slice()
                .try_into()
                .map_err(|_| SignerError::KeychainUnavailable("malformed key bytes".to_string()))?,
        )),
        Ok(_) | Err(_) if matches!(fs::metadata(&path).map_err(|e| e.kind()), Err(ErrorKind::NotFound) | _) => {
            let mut csprng = OsRng;
            let signing = SigningKey::generate(&mut csprng);
            fs::write(&path, signing.to_bytes())
                .map_err(|e| SignerError::KeychainUnavailable(e.to_string()))?;
            Ok(signing)
        }
        Err(e) => Err(SignerError::KeychainUnavailable(e.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_canonical() {
        let payload = ReceiptSigner::new()
            .sign_decision("dec-test", Utc::now(), Some("local-test"))
            .expect("sign");
        assert!(ReceiptSigner::verify(&payload, "dec-test").unwrap());
    }
}
