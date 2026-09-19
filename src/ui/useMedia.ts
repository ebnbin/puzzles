// 一条媒体查询此刻的答案,变了重渲染。排版的事归 CSS,这里只给「排版之外行为也要
// 跟着改」的地方:类型面板停靠成侧栏时不再算覆盖层,键盘得继续归谜题。
import { useCallback, useSyncExternalStore } from 'react'

export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
