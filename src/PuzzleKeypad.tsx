import type { KeyLabel } from './engine/types'

/**
 * The keys the puzzle asked for, as buttons.
 *
 * Solo, Keen, Towers, Unequal and Undead are entered by typing, which a touch
 * device cannot do — this is how they are played without a keyboard. The list
 * comes from the puzzle itself rather than from a table we maintain, so it is
 * right for every puzzle and stays right as upstream changes.
 */
export default function PuzzleKeypad({
  keys,
  onPress,
}: {
  keys: KeyLabel[]
  onPress: (key: KeyLabel) => void
}) {
  if (keys.length === 0) return null

  return (
    <div className="keypad" role="group" aria-label="Puzzle keys">
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
