import { useCallback, useEffect, useRef } from 'react'
import type { CanvasRenderer } from './engine/renderer'
import type { PuzzleApi } from './engine/types'

/** How long a touch must be held, with no movement, to count as a second press. */
const LONG_PRESS_MS = 350

/**
 * What a hold is worth, unless the puzzle says otherwise: the right button.
 *
 * The right button nearly everywhere, because it is the one half the collection
 * is played with: flagging a mine, pencilling a digit, marking a square
 * impossible. See HOLD_BUTTON in engine/keys for the puzzle that spends its
 * hold elsewhere, and why.
 */
const RIGHT_BUTTON = 2
/** Movement past this many CSS pixels means a drag, not a tap. */
const DRAG_SLOP = 8

type Pending = {
  pointerId: number
  x: number
  y: number
  clientX: number
  clientY: number
  timer: number
}

/**
 * Pointer handling for the board.
 *
 * A mouse is straightforward: buttons map through as they always did, with
 * Shift and Ctrl standing in for middle and right.
 *
 * Touch is not. Half these puzzles need a right-click — flagging a mine,
 * pencilling a Sudoku digit — and a finger has only one button. So a touch
 * press is not dispatched at once: it waits until the gesture reveals itself.
 * Lift quickly and it was a left click; hold still and it was the second press;
 * move and it was a drag all along, replayed from where it started so puzzles
 * that drag still work.
 *
 * Which leaves the question a puzzle can answer for itself: what a hold is
 * worth. Only a hold — the mouse below is upstream's, button for button, and
 * this used to be one number covering both.
 *
 * The argument for covering both was that a hold and a right click are the same
 * request made two ways, so answering them differently would make a mouse and a
 * finger disagree about a board they can both reach. What that missed is that
 * the two pointers do not have the same repertoire. A finger has two presses; a
 * mouse has three buttons and two modifiers, so it can reach the middle button
 * by the wheel or by Shift and does not need the right one spent on it. Net is
 * the whole of the difference: its hold has to be the lock, because on touch
 * nothing else can lock, but a mouse that gave up its right click for the lock
 * would be paying for something it already had — and paying in rotate-right,
 * which then has no mouse gesture at all.
 *
 * So the two disagree in exactly one place, and it is the place where their
 * hardware disagrees. Everywhere else a hold and a right click still mean the
 * same thing, because everywhere else HOLD_BUTTON is the right button.
 */
export function usePuzzlePointer(
  apiRef: React.RefObject<PuzzleApi | null>,
  rendererRef: React.RefObject<CanvasRenderer | null>,
  /**
   * The button a *hold* stands for, and only a hold. Defaults to the right one;
   * a puzzle whose right button is reachable another way, and whose middle
   * button is not, says so instead — see HOLD_BUTTON in engine/keys.
   */
  hold: number = RIGHT_BUTTON,
) {
  // Logical button per physical button, so a release is reported as whatever
  // the press was, and a move with nothing held is not reported at all.
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

  /** Commit a delayed touch press as `button`, and remember it is down. */
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
        // Upstream's own three-button convention, unaltered: Shift asks for the
        // middle button, Ctrl for the right one, and the rest map straight
        // through (emccpre.js:360-365). `hold` is deliberately not consulted —
        // a mouse can already reach every button a puzzle might want.
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
          // Held still long enough: this is the second press. Fire press and
          // release together, since there is nothing sensible to drag now.
          const p = flush(hold)
          if (!p) return
          apiRef.current?.mouseup(p.x, p.y, hold)
          held.current.delete(p.pointerId)
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
        // A drag. Start it from where the finger first went down, so the
        // puzzle sees the gesture it would have seen from a mouse.
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
    },
    [apiRef, at, flush],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      clearPending()
      held.current.delete(e.pointerId)
    },
    [],
  )

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
