// 两块屏幕(画廊、谜题)互相替换,没有层级:地址永远是 /,全 app 只有一次
// replaceState,Back 从哪块都离开 app——这是语义不是缺陷。不要引入 router,
// 也不要往 hash 里塞状态;被拆掉的正是「假装它们是层级」的那套复杂度。
import { useSyncExternalStore } from 'react'
import { readScroll, writeScroll } from './engine/saves'
import { withViewTransition } from './transition'

let view: string | null = null

let galleryScroll: number | null = readScroll()

const listeners = new Set<() => void>()

if ('scrollRestoration' in window.history)
  window.history.scrollRestoration = 'manual'

export function takeGalleryScroll(): number | null {
  return galleryScroll
}

export function rememberGalleryScroll(y: number): void {
  galleryScroll = y
  writeScroll(y)
}

function announce() {
  for (const listener of listeners) listener()
}

function show(name: string | null) {
  if (view === name) return
  if (view === null && name !== null) rememberGalleryScroll(window.scrollY)
  view = name
  withViewTransition(announce)
}

export function start(name: string | null) {
  view = name
  window.history.replaceState(null, '', '/')
}

export const openGame = (name: string) => show(name)

export const showGallery = () => show(null)

export function useView(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => view,
  )
}
