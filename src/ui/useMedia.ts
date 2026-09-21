// 一条媒体查询此刻的答案,变了就重渲染。排版归 CSS;这里只给「排版之外的行为也要
// 跟着变」的地方:面板停靠成侧栏之后不再是覆盖层,键盘和焦点的规矩都不一样。
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
