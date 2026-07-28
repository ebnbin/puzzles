import { useCallback, useEffect, useState } from 'react'

/**
 * Hand a link to whatever the device does with links.
 *
 * The native share sheet where there is one, the clipboard where there is not.
 * A cancelled share sheet is a decision, not a failure, so nothing is copied
 * behind the reader's back — only a share that could not happen at all falls
 * through to the clipboard.
 */
export function useShare() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timer)
  }, [copied])

  const share = useCallback(async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // No clipboard either — an insecure origin. Nothing useful to say.
    }
  }, [])

  return { share, copied }
}
