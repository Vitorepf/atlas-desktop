/**
 * Layout presets nomeados · Feature #4.
 *
 * Permite salvar configurações de lane layout com nome ("foco em decide",
 * "overview wide", "leitura focada") e alternar entre elas via dropdown.
 *
 * Schema localStorage:
 *   key   = `atlas.cartografia.presets.${view}`
 *   value = JSON.stringify({ [name]: CustomLayoutMap, ... })
 *
 * Operations:
 *   savePreset(name, overlay)  — persiste preset com snapshot do overlay
 *   loadPreset(name)            — retorna overlay salvo ou null
 *   deletePreset(name)          — remove
 *   listPresets()               — array { name, lanesCount }
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { readCartografiaStorage, writeCartografiaStorage } from './browserStorage'
import type { CustomLayoutMap } from './useCustomLayout'

export type PresetsMap = Record<string, CustomLayoutMap>

export interface PresetSummary {
  name: string
  lanesCount: number
}

function storageKey(view: string): string {
  return `atlas.cartografia.presets.${view}`
}

function loadPresets(view: string): PresetsMap {
  const raw = readCartografiaStorage(storageKey(view))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as PresetsMap
  } catch {
    // corrupted JSON descartado silentemente
  }
  return {}
}

function savePresets(view: string, presets: PresetsMap): void {
  writeCartografiaStorage(storageKey(view), JSON.stringify(presets))
}

export function useLayoutPresets(view: string) {
  const [presets, setPresets] = useState<PresetsMap>(() => loadPresets(view))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresets(loadPresets(view))
  }, [view])

  const savePreset = useCallback(
    (name: string, overlay: CustomLayoutMap) => {
      const trimmed = name.trim()
      if (!trimmed) return false
      setPresets((prev) => {
        const next = { ...prev, [trimmed]: { ...overlay } }
        savePresets(view, next)
        return next
      })
      return true
    },
    [view]
  )

  const loadPreset = useCallback(
    (name: string): CustomLayoutMap | null => {
      return presets[name] ?? null
    },
    [presets]
  )

  const deletePreset = useCallback(
    (name: string) => {
      setPresets((prev) => {
        if (!(name in prev)) return prev
        const next = { ...prev }
        delete next[name]
        savePresets(view, next)
        return next
      })
    },
    [view]
  )

  const presetList = useMemo<PresetSummary[]>(
    () =>
      Object.entries(presets)
        .map(([name, overlay]) => ({ name, lanesCount: Object.keys(overlay).length }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [presets]
  )

  return {
    presets,
    presetList,
    savePreset,
    loadPreset,
    deletePreset,
    hasPresets: presetList.length > 0,
  }
}
