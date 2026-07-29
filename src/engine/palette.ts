/**
 * The same board, played on a dark surface.
 *
 * The back end names its colours once at startup and hands them over as hex
 * strings; every draw then refers to them by index. That makes the palette a
 * lookup table we own, and re-theming a matter of rewriting the table — the
 * wasm never learns anything happened.
 *
 * ---------------------------------------------------------------------------
 * THREE RULES, IN THE ORDER `forDarkBoard` APPLIES THEM
 * ---------------------------------------------------------------------------
 *
 * 1. `compress` — a grey whose being black or white is something the rules
 *    say. Kept the way up it started, only pulled into the dark board's
 *    range. Black stays black. See `SEMANTIC`; 26 of the 426.
 *
 * 2. `veil` — anything with a hue. Kept, but with black laid over it in
 *    proportion to how much light it throws, because upstream chose these
 *    against a white board and at full strength they are the brightest thing
 *    on a dark one. See `VEIL`; 200 of the 426.
 *
 * 3. `flip` — every other grey: the board, the shading, the ink, the lines.
 *    Turned over. See `FLOOR` and `CEILING`; the remaining 200.
 *
 * Behind them is one distinction. A puzzle's *structure* lives in its
 * neutrals and wants to be the other way up on a dark surface; its *meaning*
 * lives in its hues — Mines' digits, Map's regions, Tents' grass — and
 * inverting those would be a lie. Rule 1 exists because that line is not
 * quite where saturation puts it: Pearl's two circles carry meaning and have
 * no hue at all, and flipping them states the puzzle backwards.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS COMPUTED AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 *
 * No colour in this file is chosen. All 426 dark values are the output of the
 * three functions above, and nothing hand-picks a hex.
 *
 * Which rule a slot takes is computed too — from its saturation — for 400 of
 * them. The other 26 come from `SEMANTIC`, a table, because the fact that
 * *this* black is a rule and *that* black is a line is not in the colour: it
 * is in the game. That table is the one piece of knowledge here that no
 * amount of arithmetic could have recovered, and it was assembled from
 * evidence rather than taste — see its comment.
 *
 * Five constants are tuned: `ACHROMATIC`, `FLOOR`, `CEILING`, `VEIL`,
 * `SEMANTIC_BOARD`. Each carries the measurement that fixed it.
 *
 * ---------------------------------------------------------------------------
 * WHAT HOLDS AFTERWARDS
 * ---------------------------------------------------------------------------
 *
 * The flip is monotonic in lightness, so every "is lighter than" in the
 * original survives as "is darker than" here — which keeps a game's shading
 * readable without knowing anything about what it draws. Two slots the game
 * drew differently must still be drawn differently; the flipped greys land
 * among the dimmed hues, so the collision pass at the end is cheap insurance
 * rather than an assumption. Measured over all forty palettes: 426 colours,
 * no collisions, every ordering preserved.
 *
 * ---------------------------------------------------------------------------
 * THE TWO PIECES OF THIS STORY THAT ARE NOT IN THIS FILE
 * ---------------------------------------------------------------------------
 *
 * - `CanvasRenderer.defaultColour` in renderer.ts, which deliberately hands
 *   the back end *nothing* in either theme. That is why every light board is
 *   still exactly upstream's, and why the dark one has to come from here.
 * - `--board` in tokens.css, the grey the launcher's thumbnails sit on. It is
 *   the light board's value and stays constant across themes, because the
 *   thumbnails are rendered once, in light.
 */

/** Below this saturation a colour is carrying structure, not meaning. */
const ACHROMATIC = 0.15

/**
 * The range a grey is mapped into, held off pure black and pure white.
 * Upstream's own backgrounds sit near the top of the scale, and mapping them
 * to the very bottom would leave a game's shadows nowhere to go.
 *
 * The ceiling is not 1, and not near it. Black ink flipped to #f0f0f0 threw
 * more light than anything else on a dark board — twice the worst hue even
 * after that hue had been veiled — because it is the ink, the lines and the
 * text that were black to begin with, and all of them landed at the top of
 * the scale together. At 0.82 the same ink comes out #d1d1d1: a quarter less
 * light, still 9.8:1 against the board, and still unmistakably the light
 * thing drawn on it.
 */
const FLOOR = 0.06
const CEILING = 0.82

/**
 * Slots whose being black, or being white, is something the rules say.
 *
 * The flip is a photographic negative, and a negative is exactly wrong for a
 * puzzle played in black and white: Pearl's white circles would come out
 * black, and the chapter that tells you what a white circle means would be
 * describing a board you cannot see. So these are not flipped. They keep
 * their order — black stays the dark one — and are compressed into the same
 * range instead, which leaves black at #0f0f0f and white at #d1d1d1.
 *
 * The list is not a guess. Every entry is a game whose manual chapter states
 * the rule in terms of the colour ("black squares", "black and white
 * circles", "black or white respectively"), cross-referenced against the
 * `COL_*` enum in its C to find which slots those words are about.
 *
 * Deliberately not here: Mines' 7 and 8, which are black and grey only by
 * Minesweeper convention and are drawn on a cell that has itself turned over
 * — keeping them dark would put dark ink on a dark tile. Flip, and Guess's
 * pegs beyond the two markers, where light and dark are decoration and the
 * manual never appeals to them.
 */
const SEMANTIC: Record<string, readonly number[]> = {
  /* COL_EMPTY, COL_FULL, COL_UNKNOWN — "black or white", "grey" for unknown */
  pattern: [1, 2, 4],
  /* COL_BLACK, COL_WHITE — "black and white circles", different rules each */
  pearl: [3, 4],
  /* COL_0 and COL_1 with their bevels — "black and white squares" */
  unruly: [3, 4, 5, 6, 7, 8],
  /* COL_MARKED, COL_BLANK — "black or white respectively" */
  mosaic: [3, 4],
  /* COL_BLACK, COL_WHITE, COL_BLACKNUM — "white squares must all..." */
  singles: [3, 4, 5],
  /* One aliased slot: grid, black squares, text and your entries together */
  range: [1],
  /* COL_BLACK, COL_LIGHT — the C's own comments say black and white */
  lightup: [2, 3],
  /* COL_CORRECTPLACE, COL_CORRECTCOLOUR — Mastermind's black and white pegs */
  guess: [16, 17],
  /* COL_BALL — the manual calls them black circles */
  blackbox: [8],
  /* COL_WHITEBG, COL_BLACKBG, COL_WHITEDOT, COL_BLACKDOT */
  galaxies: [1, 2, 3, 4],
}

/**
 * Where the board sits for those games.
 *
 * A two-tone puzzle needs a surface between its two tones. Upstream does not
 * need one — its board is near-white and sits beside the white half — but on
 * a dark board there is no room below the bottom of the scale, so leaving the
 * background where the flip puts it (0.13) would leave the black half of the
 * puzzle nowhere to be. A black pearl on that board comes to 1.18:1 — put
 * beside the same position on a raised one, it is a disc you can find if you
 * look for it rather than a black circle you read. The white pearls beside it
 * are at 12:1, so the two halves of the puzzle stop being each other's equal
 * and opposite, which is the whole of what the rules are about. #424242 has
 * #0f0f0f visibly below it and #d1d1d1 well above, and still reads as a dark
 * board.
 *
 * Applied only where it is needed, and whether it is needed is computed: see
 * `needsRoom`.
 *
 * Tried at the midpoint of the range too, which is the safe answer on paper
 * and the wrong one on screen: the board stops looking dark, and Guess loses
 * its empty peg holes into it. Lower is better as long as the black half
 * survives, and at this value it does.
 *
 * It is the price of the exception, and it is paid honestly: these ten boards
 * are a lighter grey than the other thirty.
 */
const SEMANTIC_BOARD = 0.26

/** Every game names its background first. */
const BACKGROUND = 0

/**
 * How far to nudge a colour that would otherwise duplicate another.
 *
 * Downwards first, and never outside [FLOOR, CEILING]. A nudge upwards from
 * the top of the range is how Pattern's text ended up at #e8e8e8 — brighter
 * than the ceiling exists to allow — after the white cells had already
 * claimed #d1d1d1.
 */
const NUDGES = [-0.09, 0.09, -0.17, 0.17, -0.25, 0.25, -0.33, 0.33]

/**
 * How opaque the veil over a hue gets at its brightest.
 *
 * Not a flat percentage. A single opacity for every colour has to be chosen
 * for the worst offender, and by the time it tames Guess's yellow it has also
 * taken Mines' navy — already the darkest thing on the board — down with it.
 * Measured over all 200 hues: a flat 35% pushes 33 of them under 1.5:1
 * against their own background, where scaling by brightness reaches the same
 * peak with 10.
 *
 * So the opacity is the colour's own luminance times this. Yellow ends up
 * under a 32% veil, cyan 28%, pure red 7%, pure blue 3%: the ones that glare
 * are pressed down, and the ones that were never the problem are left where
 * upstream put them.
 *
 * The value is where the two measurements cross. Raising it stops buying much
 * — the brightest hue in the collection falls from 0.93 to 0.39 by here and
 * only to 0.30 by 0.45 — while the cost keeps accruing, because a veil scaled
 * by brightness pulls a bright colour further than a dark one and so closes
 * the gap between them. Past this point that gap starts to matter: at 0.45,
 * five games have two hues within a just-noticeable distance of each other,
 * against three both here and before any of this.
 */
const VEIL = 0.35

type Colour = { h: number; s: number; l: number; r: number; g: number; b: number }

/** The back end always sends `#rrggbb`; anything else is left alone. */
function parse(css: string): Colour | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css)
  if (!m) return null
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l, r, g, b }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    (max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4) / 6
  return { h, s, l, r, g, b }
}

/**
 * How much light a colour actually throws, which is not its lightness: at the
 * same HSL lightness, yellow is thirteen times the luminance of blue, and it
 * is yellow that hurts on a dark board. sRGB relative luminance, as WCAG
 * defines it.
 */
function luminance({ r, g, b }: Colour): number {
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/**
 * Black at `VEIL x luminance`, composited over the colour. Since the veil is
 * pure black, that composite is one multiplication per channel — which scales
 * lightness and leaves hue and saturation exactly where they were. The colour
 * still means what it meant; there is just less of it.
 */
function veil(colour: Colour): string {
  const keep = 1 - VEIL * luminance(colour)
  const channel = (v: number) =>
    Math.round(v * keep * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(colour.r)}${channel(colour.g)}${channel(colour.b)}`
}

function format({ h, s, l }: { h: number; s: number; l: number }): string {
  const bounded = Math.min(1, Math.max(0, l))
  const channel = (t: number) => {
    const q = bounded < 0.5 ? bounded * (1 + s) : bounded + s - bounded * s
    const p = 2 * bounded - q
    const x = (t + 1) % 1
    const v =
      x < 1 / 6
        ? p + (q - p) * 6 * x
        : x < 1 / 2
          ? q
          : x < 2 / 3
            ? p + (q - p) * (2 / 3 - x) * 6
            : p
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(h + 1 / 3)}${channel(h)}${channel(h - 1 / 3)}`
}

/** Where the flip would put a lightness — the ordinary case. */
const flip = (l: number) => FLOOR + (1 - l) * (CEILING - FLOOR)

/** Where a kept colour goes: same range, same direction as it started. */
const compress = (l: number) => FLOOR + l * (CEILING - FLOOR)

export function forDarkBoard(light: readonly string[], game = ''): string[] {
  const semantic = SEMANTIC[game]

  /*
   * Whether this game's board has to move, worked out rather than asserted:
   * it does if anything the rules call black would end up below the board the
   * flip would otherwise give it, because then there is nothing to see it
   * against. As it happens that is true of all ten — which is the answer to
   * "why can these boards not just stay as dark as the rest?". They cannot;
   * a game whose darkest kept colour still cleared the board would keep it.
   */
  const board = parse(light[BACKGROUND])
  const needsRoom =
    !!semantic &&
    !!board &&
    semantic.some((i) => {
      const kept = parse(light[i])
      return !!kept && compress(kept.l) < flip(board.l)
    })

  const flipped = light.map((css, index) => {
    const colour = parse(css)
    if (!colour) return css
    if (semantic) {
      if (index === BACKGROUND && needsRoom)
        return format({ ...colour, l: SEMANTIC_BOARD })
      // Compressed, not inverted: same range as the flip, same direction as
      // the original.
      if (semantic.includes(index))
        return format({ ...colour, l: compress(colour.l) })
    }
    if (colour.s >= ACHROMATIC) return veil(colour)
    return format({ ...colour, l: flip(colour.l) })
  })

  // Two indices the game drew differently must still be drawn differently.
  // Semantic slots claim their value first: if a bevel and a black pearl land
  // on the same grey, it is the bevel that should move.
  const taken = new Map<string, number>()
  for (const index of semantic ?? []) taken.set(flipped[index], index)

  return flipped.map((css, index) => {
    if (semantic?.includes(index)) return css
    const held = taken.get(css)
    if (held === undefined || light[held] === light[index]) {
      taken.set(css, index)
      return css
    }
    const hsl = parse(css)
    for (const nudge of hsl ? NUDGES : []) {
      const l = hsl!.l + nudge
      if (l < FLOOR || l > CEILING) continue
      const moved = format({ ...hsl!, l })
      if (!taken.has(moved)) {
        taken.set(moved, index)
        return moved
      }
    }
    return css
  })
}
