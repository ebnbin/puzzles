// 生成期间的忙态。生成本身跑在 worker 里(见 engine/generate.ts),主线程照常
// 响应,所以这里只管两件事:什么时候把遮罩露出来,以及取消。
//
// 低于 GRACE 不露面——绝大多数换局是几毫秒,每次都闪一下会很吵;超过才浮出来。
// 取消 = abort 那个 worker,主线程的引擎从头到尾没被碰过,等于什么都没发生。
import { useCallback, useEffect, useRef, useState } from 'react'

const GRACE = 150

export function useBusy() {
  const [shown, setShown] = useState(false)
  const live = useRef<AbortController | null>(null)
  const timer = useRef<number | null>(null)

  const settle = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    live.current = null
    setShown(false)
  }, [])

  // 卸载时必须掐掉在飞的那次,否则 worker 会活到页面关掉。
  useEffect(() => () => {
    live.current?.abort()
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  const run = useCallback(
    async <T,>(work: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
      // 上一次还没回来就又点了:顶掉旧的,只认最后一次。
      live.current?.abort()
      if (timer.current !== null) window.clearTimeout(timer.current)
      const mine = new AbortController()
      live.current = mine
      timer.current = window.setTimeout(() => {
        if (live.current === mine) setShown(true)
      }, GRACE)
      try {
        const got = await work(mine.signal)
        return mine.signal.aborted ? null : got
      } catch (error) {
        if (mine.signal.aborted) return null
        throw error
      } finally {
        if (live.current === mine) settle()
      }
    },
    [settle],
  )

  const cancel = useCallback(() => {
    live.current?.abort()
    settle()
  }, [settle])

  return { busy: shown, run, cancel }
}
