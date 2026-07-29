import { useEffect, useRef } from 'react'
import type { CanvasRenderer } from './engine/renderer'
import type { PuzzleApi } from './engine/types'

/**
 * How far past its natural size a board may be stretched.
 *
 * Every game declares a preferred tile size — 32 for Net, 48 for Solo, 20 for
 * Mines — and that times its grid is the size upstream's own pages come up at:
 * Net's default is 193x193 and stays 193x193 whatever the window does. It is
 * the size the puzzle was drawn for.
 *
 * Filling the screen from that is right on a phone, where the alternative is a
 * board a third of the screen wide with tiles too small to hit. It stops being
 * right somewhere before a 27-inch monitor, where the same five-by-five grid
 * becomes a wall of tiles the size of a fist. Two is where that is capped for
 * now; it is a number to look at rather than a law.
 */
const MAX_ZOOM = 2

/**
 * The room inside an element, padding excluded.
 *
 * getBoundingClientRect measures the border box, which is not where the board
 * goes: sizing the puzzle to that puts it over the padding and the overflow is
 * silently clipped.
 */
function contentBox(element: HTMLElement) {
  const style = getComputedStyle(element)
  return {
    width:
      element.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height:
      element.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom),
  }
}

/**
 * The size this puzzle would come up at if nobody sized it, in CSS pixels.
 *
 * Asked of the back end rather than worked out here, because the answer is
 * `game_compute_size` over the current parameters and that lives in the C. The
 * trick is only to stop answering its question first: with no room declared,
 * `restore_puzzle_size` resets the tile size to the game's own preference and
 * lays the board out at it.
 *
 * Leaves the board at that size and the renderer with no answer to give: the
 * caller states the room again immediately, and because both redraws happen
 * inside one task nothing is painted on the way past.
 */
function naturalSize(api: PuzzleApi, renderer: CanvasRenderer) {
  renderer.forgetAvailable()
  api.restoreSize()
  return renderer.cssSize()
}

/**
 * Keep the board sized to the room it has been given, up to a point.
 *
 * Upstream's pages let the back end pick a size once and leave it: fine on a
 * desktop, but on a phone it means a board a third of the screen wide with
 * tiles too small to hit. The element being watched is sized entirely by CSS
 * and never by its contents, so resizing the board cannot feed back into the
 * measurement and start a loop.
 *
 * The cap is in CSS pixels, which is the only unit in which it means anything.
 * The back end measures in device pixels and a 3x phone gives it 579 for Net
 * where a 1x screen gives 193 — the same board, the same physical size. What
 * has to be bounded is how much bigger than intended the thing looks, and that
 * is a question about CSS pixels.
 */
export function usePuzzleFit(
  areaRef: React.RefObject<HTMLElement | null>,
  apiRef: React.RefObject<PuzzleApi | null>,
  rendererRef: React.RefObject<CanvasRenderer | null>,
  enabled: boolean,
  /** Changes when the parameters do, which is when the natural size can. */
  params: string,
) {
  const natural = useRef<{ w: number; h: number } | null>(null)

  // A new set of parameters is a new grid, so the measurement is stale.
  useEffect(() => {
    natural.current = null
  }, [params])

  useEffect(() => {
    const area = areaRef.current
    if (!area || !enabled) return

    let last = ''
    let frame = 0

    const fit = () => {
      const api = apiRef.current
      const renderer = rendererRef.current
      if (!api || !renderer) return
      const { width, height } = contentBox(area)
      if (width < 1 || height < 1) return

      if (!natural.current) natural.current = naturalSize(api, renderer)

      const w = Math.min(width, natural.current.w * MAX_ZOOM)
      const h = Math.min(height, natural.current.h * MAX_ZOOM)

      // The room the back end is told about is the capped room, not the real
      // one. It resizes itself without being asked — after a new game, a
      // preset, a preferences change, a loaded save — and all it does is ask
      // this question again; answering with the whole area would let those
      // paths grow the board straight past the cap.
      renderer.setAvailable(w, h)

      const key = `${Math.round(w)}x${Math.round(h)}`
      if (key === last) return
      last = key
      const dpr = window.devicePixelRatio || 1
      api.resize(Math.round(w * dpr), Math.round(h * dpr))
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
  }, [areaRef, apiRef, rendererRef, enabled, params])
}
