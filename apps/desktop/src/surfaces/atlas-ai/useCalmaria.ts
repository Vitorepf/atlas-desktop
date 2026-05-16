/**
 * Atlas AI · Calmaria Mode (TDAH-first noise reduction).
 *
 * Toggle global Cmd+Shift+. (period) que esconde TODOS os signals auxiliares:
 * decision badges, quality badges, open brain badges, tool receipts collapsed
 * even quando expanded, live activity footer, side panel. Resta apenas:
 *   - texto da mensagem
 *   - role + timestamp curto
 *   - composer
 *
 * Persistido em sessionStorage. Direito do usuário acessível em qualquer
 * estado (mesmo durante streaming).
 *
 * Inspiração: spec inovação #11 (atlas-feedback-innovation-spec.md).
 */
import { useEffect, useState } from 'react'

const CALMARIA_KEY = 'atlas-desktop:atlas-ai-calmaria'

function loadInitial(): boolean {
  try {
    return sessionStorage.getItem(CALMARIA_KEY) === '1'
  } catch {
    return false
  }
}

export function useCalmaria(): { calmaria: boolean; toggle: () => void } {
  const [calmaria, setCalmaria] = useState<boolean>(loadInitial)

  const toggle = () => {
    setCalmaria((v) => {
      const next = !v
      try {
        sessionStorage.setItem(CALMARIA_KEY, next ? '1' : '0')
      } catch {
        /* sandbox safe */
      }
      // Aplica classe no body para CSS global poder responder
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('atlas-calmaria', next)
      }
      return next
    })
  }

  // Aplica ao montar (cobre F5 / reload)
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('atlas-calmaria', calmaria)
    // só na montagem inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atalho global Cmd+Shift+. (period)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      const isShift = e.shiftKey
      // KeyCode '.' tem key === '.' OU '>'
      if (isMeta && isShift && (e.key === '.' || e.key === '>')) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { calmaria, toggle }
}
