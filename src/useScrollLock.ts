import { useLayoutEffect } from 'react'

/**
 * Hold the page still while something modal is over it.
 *
 * A wheel or a flick over a dialog's dimmer otherwise lands on the document
 * behind it, and the launcher wanders under its own settings. Only overlays
 * that sit on a scrollable page need this — the puzzle screen is fixed to
 * the viewport and has nothing to hold.
 *
 * The body is pinned rather than the root's overflow hidden: `overflow:
 * hidden` on a scrolled document jumps it to the top. Fixing the body at
 * minus its scroll offset keeps the view where it was, and the offset is
 * handed back on release.
 *
 * The offset comes in as an argument, captured by the caller at the click
 * that opened the overlay — because opening a dialog scrolls the document to
 * the top on its own (a focus-into-view the browser does before this even
 * runs), so reading the position here would read zero. A scrollbar's worth
 * of freed width is paid back as padding so the page does not shift sideways.
 */
export function useScrollLock(y: number) {
  useLayoutEffect(() => {
    const body = document.body
    const gutter = window.innerWidth - document.documentElement.clientWidth
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      pad: body.style.paddingRight,
    }
    body.style.position = 'fixed'
    body.style.top = `${-y}px`
    body.style.width = '100%'
    if (gutter > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${current + gutter}px`
    }
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.paddingRight = prev.pad
      window.scrollTo(0, y)
    }
  }, [y])
}
