import { useEffect, useRef, useState } from 'react'

/**
 * Hold a button to be told what it is.
 *
 * Both rows along the foot of the board are glyphs. The keys are glyphs
 * because a row of them has to fit across a phone; the four fixed buttons are
 * glyphs because words there would push them apart and make where each one sits
 * depend on how long it is in the reader's language. Either way the name is
 * gone from the face of the button, and a press is the only way to find out
 * what happens — which is fine for Undo and not fine for Solve.
 *
 * So: a long press asks rather than acts. The word appears above the button,
 * the press that ends the hold is swallowed, and nothing happens to the board.
 *
 * This was written once for the keypad and the four buttons had nothing. It is
 * one behaviour, and it is here rather than in either of them.
 */

/** Long enough not to fire on a press that meant it. */
const HOLD_MS = 400

/** Half the tip's own width, near enough: it must clear both screen edges. */
const MARGIN = 84

/**
 * How much room above the button the tip needs before it will go there.
 *
 * It sits above by default, which is right for both rows along the foot of the
 * board and wrong for the one thing that raises it from the top bar — the
 * status pill, which has a bar's worth of space above it and would have hung
 * its label off the top of the screen. Generous rather than measured: the tip
 * is a small font in a small box, but it wraps to three lines at its widest,
 * and the cost of flipping when it did not have to is that the label appears
 * under the finger's own knuckle instead of over it.
 */
const ABOVE = 96

type Tip = { text: string; left: number; top: number; below: boolean }

export function useHoldTip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const timer = useRef(0)
  const held = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const release = () => {
    window.clearTimeout(timer.current)
    setTip(null)
  }

  /**
   * Spread onto the button, with what it should say. No text — a key that is
   * a digit, and says what it is already — and the press is left alone.
   */
  const holdToAsk = (text?: string) =>
    !text
      ? {}
      : {
          onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            const el = e.currentTarget
            held.current = false
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => {
              held.current = true
              const box = el.getBoundingClientRect()
              const below = box.top < ABOVE
              setTip({
                text,
                // Kept clear of both edges: a button in the corner of a phone
                // would otherwise hang its label off the screen.
                left: Math.min(
                  Math.max(box.left + box.width / 2, MARGIN),
                  window.innerWidth - MARGIN,
                ),
                top: below ? box.bottom : box.top,
                below,
              })
            }, HOLD_MS)
          },
          onPointerUp: release,
          onPointerCancel: release,
          onPointerLeave: release,
          // The browser's own long-press menu would race this one. Both rows
          // were letting it through — measured — so a hold on a key or on Undo
          // could raise "open in new tab" over the word it was asking for. The
          // gallery's tiles and the board already refuse it for the same
          // reason; this is the third place a long press means something, and
          // the last one that did not say so.
          onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        }

  /**
   * Whether the click now arriving is the end of a hold, in which case it was
   * a question and not an instruction. Answering clears the flag, so the next
   * press starts fresh whether or not it was ever asked about.
   */
  const wasHeld = () => {
    if (!held.current) return false
    held.current = false
    return true
  }

  return { tip, holdToAsk, wasHeld }
}

/** What the button would have said, if it were big enough to say it. */
export function HoldTip({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div
      className="hold-tip"
      role="status"
      data-below={tip.below ? 'true' : undefined}
      style={{ left: tip.left, top: tip.top }}
    >
      {tip.text}
    </div>
  )
}
