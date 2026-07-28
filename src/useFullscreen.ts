import { useCallback, useEffect, useState } from 'react'

/**
 * Fullscreen, for the sake of the board.
 *
 * A phone spends a good fifth of its screen on the browser's own furniture,
 * and the puzzle can have all of it. Not available everywhere — iOS Safari on
 * the phone has never implemented it — so the caller should hide the control
 * when `supported` is false rather than offer something that does nothing.
 */
export function useFullscreen() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => setActive(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch((error) => {
        // Refused, usually because the gesture was not trusted. Nothing is
        // broken; the puzzle just stays windowed.
        console.warn('could not enter fullscreen', error)
      })
    }
  }, [])

  const supported =
    document.fullscreenEnabled === true &&
    typeof document.documentElement.requestFullscreen === 'function'

  return { active, supported, toggle }
}
