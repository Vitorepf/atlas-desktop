import { useContext, useEffect } from 'react'
import {
  TopBarLocationTrailContext,
  type TopBarLocationTrailContextValue,
  type TopBarLocationTrailItem,
} from './topBarLocationTrailContext'

export function useTopBarLocationTrail() {
  return useContextValue().items
}

export function usePublishTopBarLocationTrail(items: TopBarLocationTrailItem[]) {
  const { setItems, clear } = useContextValue()

  useEffect(() => {
    setItems(items)
    return clear
  }, [clear, items, setItems])
}

function useContextValue(): TopBarLocationTrailContextValue {
  return useContext(TopBarLocationTrailContext)
}
