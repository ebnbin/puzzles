import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'
import { buzz } from './useHaptics'

/**
 * The keys the puzzle asked for, as buttons.
 *
 * Two sorts in one run. First the keys that put something in a square — the
 * digits of Solo and Keen, Undead's three monsters, clear — which is how
 * those puzzles are played, and a touch device has no other way to do it.
 * After them, in the same grid but drawn in the accent, the keys that ask
 * the puzzle to do something to the whole board: fill in every pencil mark,
 * play one deduction, deal the network again. Those are keys the games read
 * but never advertise, and this is the only way to reach them without a
 * keyboard.
 *
 * See engine/keys.ts for which puzzle gets which.
 */

/** A press has to be still for this long before it is asking what a key is. */
const HOLD_MS = 400

export default function PuzzleKeypad({
  keys,
  onPress,
}: {
  keys: KeyLabel[]
  onPress: (key: KeyLabel) => void
}) {
  const t = useStrings()

  /*
   * What a key does, said in words. Only the ones that are a picture need it:
   * a digit says what it is. The glyph names the string, since a glyph is
   * only ever used for one thing — bar Dominosa's, which are digits doing an
   * aid's job and are named by the number they carry.
   */
  const describe = (key: KeyLabel) =>
    key.icon ? t.keys[key.icon] : key.aid ? t.keys.highlight(key.label ?? '') : undefined

  /*
   * Hold a key to be told what it is, rather than press it. The word is what
   * used to be written on the key, before the key became small enough to fit
   * a row of them on a phone.
   */
  const [tip, setTip] = useState<{ text: string; left: number; top: number } | null>(
    null,
  )
  const timer = useRef(0)
  const held = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const hold = (e: React.PointerEvent<HTMLButtonElement>, text?: string) => {
    if (!text) return
    const el = e.currentTarget
    held.current = false
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      held.current = true
      buzz()
      const box = el.getBoundingClientRect()
      setTip({
        text,
        // Kept clear of both edges: a key in the corner of a phone would
        // otherwise hang its label off the screen.
        left: Math.min(Math.max(box.left + box.width / 2, 84), window.innerWidth - 84),
        top: box.top,
      })
    }, HOLD_MS)
  }
  const release = () => {
    window.clearTimeout(timer.current)
    setTip(null)
  }

  if (keys.length === 0) return null

  return (
    <div className="keypad" role="group" aria-label={t.play.keypad}>
      {keys.map((key) => {
        const said = describe(key)
        return (
          <button
            key={key.button}
            type="button"
            data-aid={key.aid ? 'true' : undefined}
            aria-label={key.icon ? said : undefined}
            title={said}
            // Keep focus on the board: the puzzle reads the keyboard from
            // it, and a focused button would swallow arrow keys.
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => hold(e, said)}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onClick={() => {
              // The press that ended a hold was a question, not an
              // instruction.
              if (held.current) {
                held.current = false
                return
              }
              onPress(key)
            }}
          >
            {key.icon ? <Icon name={key.icon} /> : key.label}
          </button>
        )
      })}

      {tip && (
        <div className="keypad-tip" role="status" style={{ left: tip.left, top: tip.top }}>
          {tip.text}
        </div>
      )}
    </div>
  )
}
