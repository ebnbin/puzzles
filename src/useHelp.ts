import { useEffect, useState } from 'react'
import { useLang } from './i18n'
import type { Lang } from './i18n'

/**
 * How to play, in upstream's own words.
 *
 * Extracted at build time from the blurb upstream shows under the puzzle on
 * each game's own page, into one small file fetched on demand — forty of them
 * is 23 KB, which is a lot to carry in the bundle for text read once, if ever.
 * Started when the puzzle loads rather than when the dialog opens, so by the
 * time anyone asks for it, it is already here.
 *
 * The markup is narrow by construction: the extraction keeps a handful of tags
 * and no attribute but `href`.
 *
 * One file per language, fetched only if that language is asked for, and each
 * remembered once fetched — switching back and forth costs nothing after the
 * first time.
 */

/** One directory, one file per language, the way the manual is laid out. */
const FILE: Record<Lang, string> = {
  en: '/help/en.json',
  zh: '/help/zh.json',
}

const pending: Partial<Record<Lang, Promise<Record<string, string>>>> = {}

export function useHelp(name: string) {
  const [lang] = useLang()
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setHtml(null)
    pending[lang] ??= fetch(FILE[lang]).then((response) => {
      if (!response.ok) throw new Error(`${FILE[lang]}: ${response.status}`)
      return response.json()
    })
    pending[lang]
      .then((all) => {
        if (live) setHtml(all[name] ?? null)
      })
      .catch(() => {
        // Let the next reader try again; the caller has the one-line
        // description to fall back on meanwhile.
        pending[lang] = undefined
      })
    return () => {
      live = false
    }
  }, [name, lang])

  return html
}
