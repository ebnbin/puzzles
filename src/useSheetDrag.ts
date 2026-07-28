import { useCallback, useRef } from 'react'

/**
 * Pull the sheet down to close it.
 *
 * The grip is a promise, and it was not being kept: it looked draggable and
 * nothing happened. This makes it true.
 *
 * A drag starts from the handle, or from anywhere in the sheet that is not a
 * control and is not scrolled — a sheet that has been scrolled down should
 * scroll back up first, which is what the finger means there. Controls are
 * excluded outright, so no press on a button can be mistaken for a pull and no
 * click has to be swallowed afterwards.
 *
 * Not on wide screens: the sheet is a centred dialog there, with no bottom edge
 * to push it past.
 */

/** Ignore the first few pixels; a press is not a drag. */
const SLOP = 6
/** Far enough to have meant it… */
const DISMISS_PX = 88
/** …or fast enough. A flick should not have to travel. */
const DISMISS_VELOCITY = 0.4
const OUT_MS = 180
const BACK_MS = 220
const DESKTOP = '(min-width: 48em)'
const CONTROLS = 'button, a, input, select, textarea, label'

type Drag = {
  id: number
  from: number
  lastY: number
  lastT: number
  velocity: number
  live: boolean
}

export function useSheetDrag(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  const offset = (y: number, ms = 0) => {
    const el = ref.current
    if (!el) return
    el.style.transition = ms ? `transform ${ms}ms var(--ease)` : 'none'
    el.style.transform = y ? `translateY(${y}px)` : ''
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || drag.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (window.matchMedia(DESKTOP).matches) return

    const target = e.target as HTMLElement
    if (target.closest(CONTROLS)) return
    if (!target.closest('.sheet-handle') && el.scrollTop > 0) return

    drag.current = {
      id: e.pointerId,
      from: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      live: false,
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return

    const travelled = e.clientY - d.from
    if (!d.live) {
      // Upwards past the slop is a scroll, not a pull; let go of it.
      if (travelled < -SLOP) drag.current = null
      if (travelled < SLOP) return
      d.live = true
    }

    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    offset(Math.max(0, travelled))
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current
      const el = ref.current
      if (!d || e.pointerId !== d.id) return
      drag.current = null
      if (!el || !d.live) return offset(0)

      const travelled = Math.max(0, d.lastY - d.from)
      if (travelled > DISMISS_PX || d.velocity > DISMISS_VELOCITY) {
        offset(el.getBoundingClientRect().height, OUT_MS)
        window.setTimeout(onClose, OUT_MS)
      } else {
        offset(0, BACK_MS)
      }
    },
    [onClose],
  )

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
