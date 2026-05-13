//! Local receipt-signing boundary.
//!
//! This crate signs payloads produced by the Kernel. It does not mint canonical
//! decisions by itself.

#[derive(Debug, Clone)]
pub struct ReceiptSigner;

impl ReceiptSigner {
    pub fn new() -> Self {
        Self
    }
}

impl Default for ReceiptSigner {
    fn default() -> Self {
        Self::new()
    }
}
