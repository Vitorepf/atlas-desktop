import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  TopBarLocationTrailContext,
  type TopBarLocationTrailItem,
} from './topBarLocationTrailContext'

export function TopBarLocationTrailProvider({ children }: { children: ReactNode }) {
  const [items, setItemsState] = useState<TopBarLocationTrailItem[]>([])

  const setItems = useCallback((nextItems: TopBarLocationTrailItem[]) => {
    setItemsState(nextItems)
  }, [])

  const clear = useCallback(() => {
    setItemsState([])
  }, [])

  const value = useMemo(() => ({ items, setItems, clear }), [clear, items, setItems])

  return (
    <TopBarLocationTrailContext.Provider value={value}>
      {children}
    </TopBarLocationTrailContext.Provider>
  )
}
