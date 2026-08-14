import { useCallback, useRef } from 'react'

const SLOP = 6
const DISMISS_PX = 88
const DISMISS_VELOCITY = 0.4
const OUT_MS = 180
const BACK_MS = 220
// 必须和 Sheet(components/ui/sheet.tsx)变居中卡片的断点(md=48rem)一致,两处一起改。
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
    if (!target.closest('[data-sheet-grip]') && el.scrollTop > 0) return

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
