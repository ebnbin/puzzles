// 四类(辅助)键的总开关。和 useArrows 唯一的区别是默认相反:这些键一直都在,
// 所以只有明确存了 'false' 才算关——垃圾值和读不出来都按「开」算,宁可多给几个键,
// 也不要因为一次读失败把玩家的提示键弄没。
import { useSyncExternalStore } from 'react'

const KEY = 'puzzles.aid'

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'false'
  } catch {
    return true
  }
}

let current = read()

const listeners = new Set<() => void>()

export function setAid(on: boolean) {
  current = on
  try {
    window.localStorage.setItem(KEY, String(on))
  } catch {
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => current

export function useAid(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
