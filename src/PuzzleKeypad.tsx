import Icon from './Icon'
import type { KeyArt, KeyGlyph, KeyIcon } from './Icon'
import type { KeyLabel } from './engine/types'
import { useStrings } from './i18n'
import { HoldTip, useHoldTip } from './useHoldTip'

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
 * ghost, vampire and zombie, lifted off it by scripts/build-monsters.mjs. They
 * carry their own colours, so unlike every other key they do not follow the
 * theme; that is the point, since the monster in the square does not either.
 *
 * Not lazy: the keypad is on screen the moment the puzzle is, three files come
 * to 9 KB between them, and a key that fills in after the fact is a key that
 * moves under a thumb already reaching for it.
 */
const ART: Record<KeyArt, string> = {
  ghost: '/monsters/ghost.png',
  vampire: '/monsters/vampire.png',
  zombie: '/monsters/zombie.png',
}

const art = (icon: KeyIcon) =>
  icon in ART ? (
    <img
      className="key-art"
      src={ART[icon as KeyArt]}
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
            {key.icon ? art(key.icon) : key.label}
          </button>
        )
      })}

      <HoldTip tip={tip} />
    </div>
  )
}
