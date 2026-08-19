import { useCallback, useEffect, useRef } from 'react'
import type { CanvasRenderer } from '../../engine/renderer'
import type { PuzzleApi } from '../../engine/types'

const LONG_PRESS_MS = 350

const RIGHT_BUTTON = 2
const DRAG_SLOP = 8

type Pending = {
  pointerId: number
  x: number
  y: number
  clientX: number
  clientY: number
  timer: number
}

export function usePuzzlePointer(
  apiRef: React.RefObject<PuzzleApi | null>,
  rendererRef: React.RefObject<CanvasRenderer | null>,
  hold: number = RIGHT_BUTTON,
  // 一次手势结束。偏好会被指针改掉的游戏拿它重读(singles 点棋盘外沿就翻一条,
  // singles.c:1560);别的游戏不传,一次都不多借。
  settled?: () => void,
) {
  const held = useRef<Map<number, number>>(new Map())
  const pending = useRef<Pending | null>(null)

  const at = useCallback(
    (e: { clientX: number; clientY: number }) =>
      rendererRef.current?.eventCoords(e) ?? { x: 0, y: 0 },
    [rendererRef],
  )

  const clearPending = () => {
    if (pending.current) {
      window.clearTimeout(pending.current.timer)
      pending.current = null
    }
  }

  useEffect(() => clearPending, [])

  const flush = useCallback(
    (button: number) => {
      const p = pending.current
      const api = apiRef.current
      if (!p || !api) return null
      window.clearTimeout(p.timer)
      pending.current = null
      api.mousedown(p.x, p.y, button)
      held.current.set(p.pointerId, button)
      return p
    },
    [apiRef],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const api = apiRef.current
      if (!api) return
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.focus()

      if (e.pointerType === 'mouse') {
        if (e.button >= 3) return
        const button = e.shiftKey ? 1 : e.ctrlKey ? 2 : e.button
        const { x, y } = at(e)
        if (api.mousedown(x, y, button)) e.preventDefault()
        held.current.set(e.pointerId, button)
        return
      }

      clearPending()
      const { x, y } = at(e)
      pending.current = {
        pointerId: e.pointerId,
        x,
        y,
        clientX: e.clientX,
        clientY: e.clientY,
        timer: window.setTimeout(() => {
          flush(hold)
        }, LONG_PRESS_MS),
      }
    },
    [apiRef, at, flush, hold],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const api = apiRef.current
      if (!api) return

      const p = pending.current
      if (p && p.pointerId === e.pointerId) {
        const moved = Math.hypot(e.clientX - p.clientX, e.clientY - p.clientY)
        if (moved < DRAG_SLOP) return
        flush(0)
      }

      const button = held.current.get(e.pointerId)
      if (button === undefined) return
      const { x, y } = at(e)
      if (api.mousemove(x, y, 1 << button)) e.preventDefault()
    },
    [apiRef, at, flush],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const api = apiRef.current
      if (!api) return

      const p = pending.current
      if (p && p.pointerId === e.pointerId) flush(0)

      const button = held.current.get(e.pointerId)
      if (button === undefined) return
      const { x, y } = at(e)
      if (api.mouseup(x, y, button)) e.preventDefault()
      held.current.delete(e.pointerId)
      settled?.()
    },
    [apiRef, at, flush, settled],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      clearPending()
      // 按下那一刻就可能已经翻了偏好(取消的只是后半程),照样重读。
      if (held.current.delete(e.pointerId)) settled?.()
    },
    [settled],
  )

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
