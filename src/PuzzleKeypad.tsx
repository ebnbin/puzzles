import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'

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

const PREFERRED_PER_ROW = 5
const MAX_ROWS = 3
/** Six 40px keys and their gaps is what a 320px phone holds. Past that the
    row takes another line, which is cheaper than a key nobody can hit. */
const MAX_COLUMNS = 6

/** A press has to be still for this long before it is asking what a key is. */
const HOLD_MS = 400

/**
 * How many columns to lay the keys out in.
 *
 * Wrapping leaves the last row as whatever is left over: ten keys become eight
 * across and then a stranded two. Dividing evenly instead needs a row count,
 * and rows are the cheap dimension here — a portrait phone has spare height
 * above the board, while a key narrower than a thumb is a key you miss. So
 * five to a row, more only once that would need a fourth row.
 *
 * Five and five for Solo's nine digits and a clear; six, six and five for the
 * seventeen a 4x4 grid asks for.
 */
function columns(count: number) {
  const rows = Math.min(MAX_ROWS, Math.ceil(count / PREFERRED_PER_ROW))
  return Math.min(MAX_COLUMNS, Math.ceil(count / rows))
}

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
    <div
      className="keypad"
      role="group"
      aria-label={t.play.keypad}
      style={{ '--keys': columns(keys.length) } as React.CSSProperties}
    >
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
