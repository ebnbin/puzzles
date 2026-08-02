import Icon from './Icon'
import type { KeyArt, KeyGlyph, KeyIcon } from './Icon'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'
import { HoldTip, useHoldTip } from './useHoldTip'
import { useTheme } from './useTheme'
import type { Theme } from './useTheme'

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
 */
const ART: readonly KeyArt[] = ['ghost', 'vampire', 'zombie']

const art = (icon: KeyIcon, theme: Theme) =>
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

export default function PuzzleKeypad({
  keys,
  onPress,
}: {
  keys: KeyLabel[]
  onPress: (key: KeyLabel) => void
}) {
  const t = useStrings()
  const [theme] = useTheme()

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
            {...holdToAsk(said)}
            onClick={() => {
              if (wasHeld()) return
              onPress(key)
            }}
          >
            {key.icon ? art(key.icon, theme) : key.label}
          </button>
        )
      })}

      <HoldTip tip={tip} />
    </div>
  )
}
