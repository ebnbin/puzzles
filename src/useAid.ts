// 四类(辅助)键的总开关。默认关,和方向键那个一样是选进来的:提示、铺标记这些
// 一局不用照样玩得完(判据见 docs/keys.md),默认的键盘只留必要键。
import { useSyncExternalStore } from 'react'

const KEY = 'puzzles.aid'

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'true'
  } catch {
    return false
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
