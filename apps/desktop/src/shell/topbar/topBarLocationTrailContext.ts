import { createContext } from 'react'

export interface TopBarLocationTrailItem {
  id: string
  label: string
  current?: boolean
  onSelect?: () => void
}

export interface TopBarLocationTrailContextValue {
  items: TopBarLocationTrailItem[]
  setItems: (items: TopBarLocationTrailItem[]) => void
  clear: () => void
}

const noopSetItems = () => undefined
const noopClear = () => undefined

export const TopBarLocationTrailContext = createContext<TopBarLocationTrailContextValue>({
  items: [],
  setItems: noopSetItems,
  clear: noopClear,
})
