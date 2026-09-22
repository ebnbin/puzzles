// 一条媒体查询此刻的答案,变了就重渲染;只给排版之外的行为也要跟着变的地方用。
import { useCallback, useSyncExternalStore } from 'react'

export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', listener)
      return () => list.removeEventListener('change', listener)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
