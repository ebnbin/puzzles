import { useEffect, useState } from 'react'

/**
 * The manual's own description of a puzzle.
 *
 * Extracted from the chapter halibut builds, at build time, into one small file
 * fetched on demand — forty descriptions of prose is 42 KB, which is a lot to
 * carry in the bundle for text that is read once, if ever. Started when the
 * puzzle loads rather than when the dialog opens, so by the time anyone asks
 * for it, it is already here.
 *
 * The markup is narrow by construction: the extraction keeps a handful of tags
 * and no attribute but `href`.
 */

let pending: Promise<Record<string, string>> | null = null

export function useManual(name: string) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    pending ??= fetch('/manual.json').then((response) => {
      if (!response.ok) throw new Error(`manual.json: ${response.status}`)
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
