import Icon from './Icon'
import type { KeyArt, KeyGlyph, KeyIcon } from './Icon'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'
import { HoldTip, useHoldTip } from './useHoldTip'
import { useResolvedTheme } from './useTheme'
import type { Resolved } from './useTheme'

/**
 * The keys the puzzle asked for, as buttons.
 *
 * Three sorts in one run, in the order a reader meets them. First the keys
 * that put something in a square — the digits of Solo and Keen, Undead's
 * three monsters, clear — which is how those puzzles are played, and a touch
 * device has no other way to do it. Then the keys the games read but never
 * advertise — fill in every pencil mark, play the solver, deal the network
 * again — which this is the only way to reach without a keyboard. Last the
 * three this side answers, which work out what each square can still take.
 *
 * The three are drawn differently, which is `key.aid` and index.css. See
 * engine/keys.ts for which puzzle gets which.
 */

/**
 * Undead's three monsters are pictures rather than glyphs — the board's own
 * ghost, vampire and zombie, lifted off it by scripts/build-art.mjs. One pair
 * each, because the monster in the square is not the same drawing on a dark
 * board: its skin is veiled and `FIGURE` re-serves its paper and its ink. The
 * key follows the board, which is the whole reason these are photographs of it.
 *
 * Not lazy: the keypad is on screen the moment the puzzle is, the three come to
 * a few KB between them, and a key that fills in after the fact is a key that
 * moves under a thumb already reaching for it.
 *
 * The same three keys arrive as plain G, V and Z when the reader has Undead
 * drawing letters instead — which is keys.ts's decision, made from the same
 * preference the board reads, and nothing here has to know about it.
 */
const ART: readonly KeyArt[] = ['ghost', 'vampire', 'zombie']

const art = (icon: KeyIcon, theme: Resolved) =>
  (ART as readonly string[]).includes(icon) ? (
    <img
      className="key-art"
      src={`/art/${icon}-${theme}.png`}
      alt=""
      width={24}
      height={24}
      draggable={false}
    />
  ) : (
    <Icon name={icon as KeyGlyph} />
  )

/**
 * How many of this value are still to be placed, or null for a key that has no
 * such number — every aid, every puzzle whose board this side cannot read, and
 * the digits that are done.
 *
 * Nothing is shown at zero, and nothing at less than zero either. Zero is worth
 * more as an empty corner than as a nought: the badges go out one at a time as
 * the board fills, which is a shrinking list of what is left rather than a row
 * of noughts to read past at exactly the moment there is most else to look at.
 * Below zero means the same digit has been put down too many times, which is a
 * mistake the board is already drawing in red — and a minus sign at this size
 * would be a smudge.
 */
const countOn = (key: KeyLabel, left: Map<number, number> | null) => {
  if (key.value === undefined || !left) return null
  const n = left.get(key.value)
  return n !== undefined && n > 0 ? n : null
}

export default function PuzzleKeypad({
  keys,
  left,
  onPress,
}: {
  keys: KeyLabel[]
  left: Map<number, number> | null
  onPress: (key: KeyLabel) => void
}) {
  const t = useStrings()
  const theme = useResolvedTheme()

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
   * a row of them on a phone. Shared with the four fixed buttons below the
   * keypad, which are glyphs for a different reason and just as unlabelled.
   */
  const { tip, holdToAsk, wasHeld } = useHoldTip()

  if (keys.length === 0) return null

  return (
    <>
      <div className="keypad" role="group" aria-label={t.play.keypad}>
        {keys.map((key) => {
          const said = describe(key)
          const count = countOn(key, left)
          return (
            <button
              // A key this side answers has no button value to be told apart by.
              key={key.action ?? key.button}
              type="button"
              data-aid={key.aid}
              // A digit says what it is, so it needs no name — until it carries a
              // count, which would otherwise be read out beside it as a second
              // digit, and "9 1" is not what the key says.
              aria-label={
                key.icon ? said : count !== null ? t.keys.left(key.label ?? '', count) : undefined
              }
              title={said}
              // Keep focus on the board: the puzzle reads the keyboard from
              // it, and a focused button would swallow arrow keys.
              onMouseDown={(e) => e.preventDefault()}
              {...holdToAsk(said)}
              onClick={() => {
                if (wasHeld()) return
                onPress(key)
              }}
            >
              {key.icon ? art(key.icon, theme) : key.label}
              {count !== null && (
                // Said by the button's own name above, so this is a picture of it
                // and not a second thing to read out.
                <span className="key-left" aria-hidden="true">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Outside the row, for the reason written on HoldTip: `.keypad` is a
          stacking context, and a tip inside it cannot rise past whatever that
          row's own level is. */}
      <HoldTip tip={tip} />
    </>
  )
}
