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
