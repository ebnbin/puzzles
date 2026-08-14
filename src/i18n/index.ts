import { useSyncExternalStore } from 'react'
import { en } from './en'
import type { Strings } from './en'
import { zh } from './zh'

export type Lang = 'en' | 'zh'
export type { Strings }

const KEY = 'puzzles.lang'
const CATALOGUE: Record<Lang, Strings> = { en, zh }

const HTML_LANG: Record<Lang, string> = { en: 'en', zh: 'zh-Hans' }

function read(): Lang {
  try {
    const stored = window.localStorage.getItem(KEY)
    if (stored === 'en' || stored === 'zh') return stored
  } catch {
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function apply(lang: Lang) {
  document.documentElement.lang = HTML_LANG[lang]
}

let current = read()
apply(current)

const listeners = new Set<() => void>()

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== KEY) return
  const next = read()
  if (next === current) return
  current = next
  apply(next)
  for (const listener of listeners) listener()
})

export function setLang(next: Lang) {
  if (next === current) return
  current = next
  try {
    window.localStorage.setItem(KEY, next)
  } catch {
  }
  apply(next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => current

export function useLang(): [Lang, (next: Lang) => void] {
  return [useSyncExternalStore(subscribe, snapshot, snapshot), setLang]
}

export function useStrings(): Strings {
  return CATALOGUE[useSyncExternalStore(subscribe, snapshot, snapshot)]
}

export function docHref(lang: Lang, page = 'index.html'): string {
  return `/doc/${lang}/${page}`
}
