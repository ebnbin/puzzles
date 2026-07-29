import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'

/**
 * The keys the puzzle asked for, as buttons.
 *
 * Solo, Keen, Towers, Unequal and Undead are entered by typing, which a touch
 * device cannot do — this is how they are played without a keyboard. The list
 * comes from the puzzle itself rather than from a table we maintain, so it is
 * right for every puzzle and stays right as upstream changes.
 */

const PREFERRED_PER_ROW = 5
const MAX_ROWS = 3
/** Six 40px keys and their gaps is what a 320px phone holds. Past that the
    row takes another line, which is cheaper than a key nobody can hit. */
const MAX_COLUMNS = 6

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
  // Before the early return: a hook cannot be skipped on some renders.
  const t = useStrings()
  const ref = useRef<HTMLDivElement>(null)

  /*
   * How many columns the landscape rail gets. Two, unless a key is wider than
   * a key has to be — Undead's are, because they say Vampire rather than 7 —
   * and then one, because that rail is width taken from the board and two
   * columns of a word is half as much again as two columns of a digit.
   *
   * Measured rather than worked out: a key is as wide as its label renders,
   * which is a question about the font, not about the string. Both numbers
   * come from the same place the layout does, so nothing here has to know
   * what --tap-w is set to.
   */
  const [railColumns, setRailColumns] = useState(2)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const buttons = [...el.children] as HTMLElement[]
    if (buttons.length === 0) return
    const floor = parseFloat(getComputedStyle(buttons[0]).minWidth)
    const widest = Math.max(...buttons.map((b) => b.getBoundingClientRect().width))
    setRailColumns(widest > floor + 0.5 ? 1 : 2)
  }, [keys])

  if (keys.length === 0) return null

  return (
    <div
      className="keypad"
      role="group"
      aria-label={t.play.keypad}
      ref={ref}
      style={
        {
          '--keys': columns(keys.length),
          '--rail-columns': railColumns,
        } as React.CSSProperties
      }
    >
      {keys.map((key) => (
        <button
          key={key.button}
          type="button"
          // Keep focus on the board: the puzzle reads the keyboard from it,
          // and a focused button would swallow arrow keys.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPress(key)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
