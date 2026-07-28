import { useCallback, useEffect, useState } from 'react'

/**
 * Light, dark, or whatever the system says.
 *
 * The choice is resolved to a concrete value here and written to the root as
 * `data-theme`, so the stylesheet never has to ask the system anything: one set
 * of tokens, one attribute, no duplicated dark block. The same six lines run
 * inline in the document head before first paint, which is what stops a dark
 * reader being shown a white page for a frame.
 *
 * The browser's own chrome is told too. A page that forces dark while the
 * system is light would otherwise keep a white address bar.
 */

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'puzzles.theme'
const DARK = '(prefers-color-scheme: dark)'
const BAR = { light: '#fafaf9', dark: '#101013' }

function read(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function apply(theme: Theme) {
  const dark =
    theme === 'dark' || (theme !== 'light' && window.matchMedia(DARK).matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? BAR.dark : BAR.light)
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(read)

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    // Only worth following while it is being followed.
    const query = window.matchMedia(DARK)
    const sync = () => apply('system')
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [theme])

  const update = useCallback((next: Theme) => {
    setTheme(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // Private browsing or a blocked store — the choice just won't persist.
    }
  }, [])

  return [theme, update]
}
