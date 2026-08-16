// 存在 localStorage 里的一个开关。默认关、只认字面的 'true':垃圾值和读不出来
// (隐私模式、配额满)都算关,和别处读 puzzles.* 的规矩一样——容忍垃圾,不猜。
import { useSyncExternalStore } from 'react'

export function makeFlag(key: string): [() => boolean, (on: boolean) => void] {
  const read = () => {
    try {
      return window.localStorage.getItem(key) === 'true'
    } catch {
      return false
    }
  }

  let current = read()
  const listeners = new Set<() => void>()

  // subscribe 要在这儿定死:每次渲染新造一个,useSyncExternalStore 会退订重订。
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const snapshot = () => current

  return [
    () => useSyncExternalStore(subscribe, snapshot, snapshot),
    (on: boolean) => {
      current = on
      try {
        window.localStorage.setItem(key, String(on))
      } catch {
      }
      for (const listener of listeners) listener()
    },
  ]
}
