import { useEffect } from 'react'
import type { PuzzleApi } from './engine/types'

/**
 * Keep the board sized to the room it has been given.
 *
 * Upstream's pages let the back end pick a size once and leave it: fine on a
 * desktop, but on a phone it means a board a third of the screen wide with
 * tiles too small to hit. The element being watched is sized entirely by CSS
 * and never by its contents, so resizing the board cannot feed back into the
 * measurement and start a loop.
 */
export function usePuzzleFit(
  areaRef: React.RefObject<HTMLElement | null>,
  apiRef: React.RefObject<PuzzleApi | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const area = areaRef.current
    if (!area || !enabled) return

    let last = ''
    let frame = 0

    const fit = () => {
      const api = apiRef.current
      if (!api) return
      const { width, height } = area.getBoundingClientRect()
      if (width < 1 || height < 1) return
      const key = `${Math.round(width)}x${Math.round(height)}`
      if (key === last) return
      last = key
      const dpr = window.devicePixelRatio || 1
      api.resize(Math.round(width * dpr), Math.round(height * dpr))
    }

    // Coalesce the burst of callbacks an orientation change produces.
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    }

    const observer = new ResizeObserver(schedule)
    observer.observe(area)
    schedule()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [areaRef, apiRef, enabled])
}
