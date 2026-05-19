/**
 * LayoutPresetsMenu · dropdown pra salvar/carregar/deletar named presets
 * de layout (Feature #4).
 *
 * Aparece SÓ em edit mode (lock destravado). Posicionado próximo aos
 * canvas-controls. Mantém o canon visual Patek editorial.
 */
import { useCallback, useRef, useState } from 'react'
import type { CustomLayoutMap } from '../state/useCustomLayout'
import type { PresetSummary } from '../state/useLayoutPresets'

interface LayoutPresetsMenuProps {
  presetList: PresetSummary[]
  currentOverlay: CustomLayoutMap
  hasOverrides: boolean
  onSavePreset: (name: string, overlay: CustomLayoutMap) => boolean
  onLoadPreset: (name: string) => CustomLayoutMap | null
  onDeletePreset: (name: string) => void
  onApplyOverlay: (overlay: CustomLayoutMap) => void
}

export function LayoutPresetsMenu({
  presetList,
  currentOverlay,
  hasOverrides,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onApplyOverlay,
}: LayoutPresetsMenuProps) {
  const [open, setOpen] = useState(false)
  const [namingMode, setNamingMode] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const toggle = useCallback(() => {
    setOpen((v) => !v)
    setNamingMode(false)
  }, [])

  const handleStartSave = useCallback(() => {
    if (!hasOverrides) return
    setNamingMode(true)
    setNewName('')
    queueMicrotask(() => inputRef.current?.focus())
  }, [hasOverrides])

  const handleConfirmSave = useCallback(() => {
    const ok = onSavePreset(newName, currentOverlay)
    if (ok) {
      setNamingMode(false)
      setNewName('')
    }
  }, [newName, currentOverlay, onSavePreset])

  const handleLoad = useCallback(
    (name: string) => {
      const overlay = onLoadPreset(name)
      if (overlay) {
        onApplyOverlay(overlay)
        setOpen(false)
      }
    },
    [onLoadPreset, onApplyOverlay]
  )

  return (
    <div className="layout-presets floater no-pan">
      <button
        type="button"
        className={`presets-toggle${open ? ' is-open' : ''}`}
        onClick={toggle}
        title="Layout presets"
        aria-label="Menu de presets de layout"
        aria-expanded={open}
      >
        ❖ presets
        {presetList.length > 0 ? <span className="presets-count">{presetList.length}</span> : null}
      </button>
      {open ? (
        <div className="presets-menu" role="menu">
          <div className="presets-header">
            <span>Layouts salvos</span>
            <button
              type="button"
              className="presets-close"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              ×
            </button>
          </div>

          {presetList.length === 0 ? (
            <div className="presets-empty">Nenhum preset salvo ainda.</div>
          ) : (
            <ul className="presets-list">
              {presetList.map((preset) => (
                <li key={preset.name} className="presets-item">
                  <button
                    type="button"
                    className="presets-item-load"
                    onClick={() => handleLoad(preset.name)}
                    title={`Carregar "${preset.name}"`}
                  >
                    <span className="presets-item-name">{preset.name}</span>
                    <span className="presets-item-meta">{preset.lanesCount} lanes</span>
                  </button>
                  <button
                    type="button"
                    className="presets-item-delete"
                    onClick={() => onDeletePreset(preset.name)}
                    aria-label={`Deletar "${preset.name}"`}
                    title="Deletar"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="presets-save">
            {namingMode ? (
              <>
                <input
                  ref={inputRef}
                  className="presets-name-input"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmSave()
                    if (e.key === 'Escape') setNamingMode(false)
                  }}
                  placeholder="nome do preset"
                  maxLength={40}
                />
                <button
                  type="button"
                  className="presets-confirm"
                  onClick={handleConfirmSave}
                  disabled={!newName.trim()}
                  title="Salvar preset"
                >
                  ✓
                </button>
                <button
                  type="button"
                  className="presets-cancel"
                  onClick={() => setNamingMode(false)}
                  title="Cancelar"
                >
                  ×
                </button>
              </>
            ) : (
              <button
                type="button"
                className="presets-save-btn"
                onClick={handleStartSave}
                disabled={!hasOverrides}
                title={hasOverrides ? 'Salvar layout atual como preset' : 'Faça mudanças no layout antes de salvar'}
              >
                + salvar layout atual
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
