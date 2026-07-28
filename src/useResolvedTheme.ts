import { useEffect, useState } from 'react'

/**
 * Light or dark, as decided — never "system".
 *
 * Read off the root element's `data-theme`, which is the one place the answer
 * exists: the pre-paint script writes it, useTheme keeps it, and the stylesheet
 * keys off it. Watching the attribute rather than being handed the value means
 * the board cannot disagree with the page around it, whoever changed it and
 * whenever.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
  )

  useEffect(() => {
    const root = document.documentElement
    const sync = () =>
      setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
