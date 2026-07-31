import { useSyncExternalStore } from 'react'
import { en } from './en'
import type { Strings } from './en'
import { zh } from './zh'

/**
 * Which language the app is speaking.
 *
 * Two, and the choice is one value — so it is kept the way `useTheme` keeps
 * the theme: read once, written to `<html lang>` and to local storage, and
 * held in a module rather than in a context. A provider would mean every
 * component that says a word has to sit under it, and there is nothing here
 * that a second, isolated copy of the app would want to answer differently.
 *
 * The manual is a separate set of static pages rather than a screen of the
 * app, so it cannot read this — it is two trees, and `docHref` picks one. The
 * language switch on those pages writes the same storage key back, which is
 * what keeps the two from drifting apart.
 */

export type Lang = 'en' | 'zh'
export type { Strings }

const KEY = 'puzzles.lang'
const CATALOGUE: Record<Lang, Strings> = { en, zh }

/** What `<html lang>` should say. `zh-Hans` so the right glyphs are chosen. */
const HTML_LANG: Record<Lang, string> = { en: 'en', zh: 'zh-Hans' }

function read(): Lang {
  try {
    const stored = window.localStorage.getItem(KEY)
    if (stored === 'en' || stored === 'zh') return stored
  } catch {
    // Private browsing; fall through to the system's answer.
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function apply(lang: Lang) {
  document.documentElement.lang = HTML_LANG[lang]
}

let current = read()
apply(current)

const listeners = new Set<() => void>()

export function setLang(next: Lang) {
  if (next === current) return
  current = next
  try {
    window.localStorage.setItem(KEY, next)
  } catch {
    // The choice just won't outlive the tab.
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

/**
 * Where a page of the manual lives. The English tree sits at the root of
 * `/doc/` and the translation hangs off it — an asymmetry that upstream's own
 * pages used to require, linking into it as `../doc/<game>.html` with paths
 * that were not ours to rewrite. Those pages are gone. Nothing forces the shape
 * now; it is simply where the tree already is, and where every link written to
 * it since points.
 */
export function docHref(lang: Lang, page = ''): string {
  return `/doc/${lang === 'zh' ? 'zh/' : ''}${page}`
}
