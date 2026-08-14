import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

export type Resolved = Theme

const KEY = 'puzzles.theme'
const BAR = { light: '#fafaf9', dark: '#101013' }

function read(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function write(theme: Theme) {
  try {
    window.localStorage.setItem(KEY, theme)
  } catch {
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR[theme])
}

let theme = read()
apply(theme)

try {
  if (window.localStorage.getItem(KEY) !== theme) write(theme)
} catch {
}

const listeners = new Set<() => void>()

function settle(next: Theme) {
  if (next === theme) return
  theme = next
  apply(next)
  for (const listener of listeners) listener()
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== KEY) return
  settle(read())
})

export function setTheme(next: Theme) {
  if (next === theme) return
  write(next)
  settle(next)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const take = () => theme

export function useTheme(): [Theme, (next: Theme) => void] {
  return [useSyncExternalStore(subscribe, take, take), setTheme]
}

export function useResolvedTheme(): Resolved {
  return useSyncExternalStore(subscribe, take, take)
}
