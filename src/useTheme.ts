// 主题解析和 index.html 内联脚本、build-doc.mjs 里的同一段联动改。只认 dark:
// 老用户存的 system(已删掉的第三档)和一切垃圾值都当 light 并规范化写回——
// 手册读同一个 key,不写回两边会对同一个读者给出不同答案。
import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

export type Resolved = Theme

const KEY = 'puzzles.theme'
// 这两个值和 tokens.css 的 --bg、index.html 的 theme-color 三处手写同值,一起改。
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
