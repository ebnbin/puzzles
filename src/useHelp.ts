import { useEffect, useState } from 'react'

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
 */

let pending: Promise<Record<string, string>> | null = null

export function useHelp(name: string) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    pending ??= fetch('/help.json').then((response) => {
      if (!response.ok) throw new Error(`help.json: ${response.status}`)
      return response.json()
    })
    pending
      .then((all) => {
        if (live) setHtml(all[name] ?? null)
      })
      .catch(() => {
        // Let the next reader try again; the caller has the one-line
        // description to fall back on meanwhile.
        pending = null
      })
    return () => {
      live = false
    }
  }, [name])

  return html
}
