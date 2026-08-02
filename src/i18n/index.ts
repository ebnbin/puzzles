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

/* The manual writes this key too, from its own tab. See the same listener in
   useTheme, and the reason for both of them there. */
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
 * Where a page of the manual lives: one directory per language, named after it,
 * neither of them the default. The English tree used to sit at the root of
 * `/doc/` with the translation hanging off it — an asymmetry upstream's own
 * gallery pages once required, linking in as `../doc/<game>.html` with paths
 * that were not ours to rewrite. Those pages are not published here.
 *
 * Asked for no page in particular, it names the contents page rather than the
 * directory holding it. Both reach it, and `/doc/en/` is the prettier of the
 * two, but it would be the only address of that page anywhere: halibut writes
 * the Contents link at the head of all 45 chapters as `index.html`, and the
 * language switch on the contents page itself names it in full. Two addresses
 * for one document is two entries in the service worker's cache, which keys on
 * the whole URL — so the link from the settings joins the ones already there
 * rather than minting a second one.
 */
export function docHref(lang: Lang, page = 'index.html'): string {
  return `/doc/${lang}/${page}`
}
