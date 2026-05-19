import type { AtlasRichInputPayload } from './types'

/**
 * Drop a rich-input payload when it carries no attachments.
 *
 * Lives in a side-effect-free module so callers and tests can import it
 * without booting Vite's `import.meta.env` (the bridge module is Vite-specific
 * because of HTTP/Tauri mode detection).
 *
 * The hook always emits a non-null canonical payload (schema_version +
 * possibly populated source_manifest) but plain-text Obra creation should NOT
 * inflate the HTTP body with empty arrays.
 *
 * `source_manifest` alone does NOT count as a real attachment for the
 * compact decision — it's metadata that survives even when no actual upload
 * happened (forward-compat slot for future surfaces).
 */
export function compactRichInput(
  rich: AtlasRichInputPayload | null | undefined,
): AtlasRichInputPayload | null {
  if (!rich) return null
  const hasAttachments =
    rich.uploaded_image_ids.length > 0 ||
    rich.uploaded_document_ids.length > 0 ||
    rich.url_attachments.length > 0 ||
    rich.text_blocks.length > 0
  return hasAttachments ? rich : null
}
