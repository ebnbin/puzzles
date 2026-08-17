// localStorage 里的一份可订阅状态:启动读一次、此后内存为准、写回尽力而为。
// 垃圾值和读不出来(隐私模式、配额满)一律回落默认——和别处读 puzzles.* 的
// 规矩一样,容忍垃圾,不猜。theme 和语言不搭这个工厂:一个有跟随系统的派生态,
// 一个要同步 <html lang> 和跨标签广播,各自多出的那点就是它们独立成文件的理由。
import { useSyncExternalStore } from 'react'

export function makeStore<T>(
  read: () => T,
  write: (value: T) => void,
): [() => T, (next: T | ((was: T) => T)) => void] {
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
    (next) => {
      current = typeof next === 'function' ? (next as (was: T) => T)(current) : next
      write(current)
      for (const listener of listeners) listener()
    },
  ]
}

// 布尔开关:默认关、只认字面的 'true'。
export function makeFlag(key: string): [() => boolean, (on: boolean) => void] {
  return makeStore<boolean>(
    () => {
      try {
        return window.localStorage.getItem(key) === 'true'
      } catch {
        return false
      }
    },
    (on) => {
      try {
        window.localStorage.setItem(key, String(on))
      } catch {
      }
    },
  )
}
