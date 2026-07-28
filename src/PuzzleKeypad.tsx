import type { KeyLabel } from './engine/types'

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
  return Math.ceil(count / rows)
}

export default function PuzzleKeypad({
  keys,
  onPress,
}: {
  keys: KeyLabel[]
  onPress: (key: KeyLabel) => void
}) {
  if (keys.length === 0) return null

  return (
    <div
      className="keypad"
      role="group"
      aria-label="Puzzle keys"
      style={{ '--keys': columns(keys.length) } as React.CSSProperties}
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
