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
 * The three are drawn differently, which is `key.whose` and index.css. See
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
 * A key that is a picture of a board colour rather than of a glyph: Guess's
 * pegs, and so far only those.
 *
 * Painted from the colours the board is drawing with this instant — see
 * `slot` on KeyLabel and `colour` on the renderer — rather than from anything
 * written here, so the key and the peg it puts down are the same colour in
 * both themes. The rim and the digit come from the board too: guess.c draws a
 * peg as `draw_circle(..., COL_EMPTY + col, COL_FRAME)` and writes its number
 * on it in COL_FRAME, and this is that call.
 *
 * Null when the colours have not arrived, which is one render at start-up:
 * the back end names them after it deals the first board, and the key falls
 * back to the character it sends until then.
 */
const peg = (key: KeyLabel, swatches: ReadonlyMap<number, string>) => {
  const fill = key.slot === undefined ? undefined : swatches.get(key.slot)
  if (!fill) return null
  const ink = key.ink === undefined ? undefined : swatches.get(key.ink)
  return (
    <span
      className="key-peg"
      // Map's second row of swatches is the same colour said as a maybe, and
      // the board says it the same way: a stipple is drawn as a scatter of dots
      // in the region rather than as a fill (map.c:2872). The dots are the
      // colour and the ground is the key's, which is what the region looks
      // like. See `dotted` on KeyLabel.
      data-dotted={key.dotted ? '' : undefined}
      style={{
        [key.dotted ? 'color' : 'background']: fill,
        borderColor: ink ?? 'transparent',
        ...(key.dotted ? {} : { color: ink }),
      }}
    >
      {key.label}
    </span>
  )
}

/**
 * How many of this value are still to be placed, or null for a key that has no
 * such number — every key that is not a plain one, every puzzle whose board
 * this side cannot read, and
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
  swatches,
  labels,
  onPress,
}: {
  keys: KeyLabel[]
  left: Map<number, number> | null
  swatches: ReadonlyMap<number, string>
  /**
   * What the back end says its own two keys would do, for the one key here that
   * is drawn always and live only sometimes — see `needs` on KeyLabel.
   */
  labels: { enter: string; space: string }
  onPress: (key: KeyLabel) => void
}) {
  const t = useStrings()
  const theme = useResolvedTheme()

  /*
   * What a key does, said in words. Only the ones that are a picture need it:
   * a digit says what it is. The glyph names the string, since a glyph is
   * only ever used for one thing — bar Dominosa's, which are digits doing a
   * board-wide key's job and are named by the number they carry.
   *
   * A swatch needs it most of all, and needs it whichever way the board is
   * drawn: with the labels off there is nothing on the key to read at all, and
   * with them on there is a digit whose meaning is the colour around it. Both
   * are "the third colour", which is what the board's own numbering calls it.
   */
  const describe = (key: KeyLabel) =>
    // Map's first, because its palette is the one place a swatch and a glyph
    // are the same kind of key and have to be named together: two of these
    // carry a colour and the third is a picture of an empty region.
    key.paints
      ? key.paints.colour < 0
        ? t.keys.clearRegion
        : key.paints.pencil
          ? t.keys.maybeRegion(key.paints.colour + 1)
          : t.keys.fillRegion(key.paints.colour + 1)
      : key.icon
        ? t.keys[key.icon]
        : key.slot !== undefined
          ? t.keys.peg(key.value ?? 0)
          : key.whose
            ? t.keys.highlight(key.label ?? '')
            : undefined

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
        {keys.map((key, i) => {
          const said = describe(key)
          const count = countOn(key, left)
          const swatch = peg(key, swatches)
          return (
            <button
              // By position, because a button value is not an identity here:
              // every key this side answers sends nothing, so Map's nine would
              // all be zero. The list is rebuilt whole for each deal and never
              // reordered within one, so the index is as stable as the row is.
              key={i}
              type="button"
              data-whose={key.whose}
              // Out, but still its own picture: this key has one job and is
              // waiting to be able to do it. See `needs`, and CursorFace.idle,
              // which argues the same shape for the row below.
              disabled={key.needs !== undefined && labels.enter !== key.needs}
              // A digit says what it is, so it needs no name — until it carries a
              // count, which would otherwise be read out beside it as a second
              // digit, and "9 1" is not what the key says.
              aria-label={
                key.icon || key.slot !== undefined
                  ? said
                  : count !== null
                    ? t.keys.left(key.label ?? '', count)
                    : undefined
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
              {/* The character last, for the one key that can have neither a
                  swatch nor a label: an unlabelled peg in the render before
                  the board's colours arrive. Showing what it sends is the
                  right answer there and would be the right answer for any
                  other key that ever turned up with nothing on it. */}
              {swatch ??
                (key.icon
                  ? art(key.icon, theme)
                  : (key.label ?? String.fromCharCode(key.button)))}
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
