/**
 * The same board, played on a dark surface.
 *
 * The back end names its colours once at startup and hands them over as hex
 * strings; every draw then refers to them by index. That makes the palette a
 * lookup table we own, and re-theming a matter of rewriting the table — the
 * wasm never learns anything happened.
 *
 * The rule is one line of intent: **flip the greys, dim the colours.** A
 * puzzle's structure lives in its neutrals — the board, the shading, the ink,
 * the rules drawn in black — and those want to be the other way up on a dark
 * surface. Its meaning lives in its hues: Mines' numbers, Map's regions,
 * Guess's pegs. Those mean something, and inverting them would be a lie.
 *
 * Because the flip is monotonic in lightness, every "is lighter than" relation
 * in the original survives as "is darker than" here, which is what keeps a
 * game's shading readable without knowing anything about what it draws. Two
 * distinct colours also cannot become one — but the flipped greys land among
 * the dimmed hues, so a collision pass afterwards is cheap insurance rather
 * than an assumption.
 *
 * The hues are kept but not left alone. Upstream picked them for a light board
 * and they are full-strength: on a dark one, Guess's yellow and Net's cyan are
 * the brightest thing on the screen by a distance. So each gets a black veil
 * — see `VEIL` — which changes no hue and no ordering, only how much light
 * comes off it.
 *
 * Measured over all forty palettes: 426 colours, no collisions, and every
 * lightness ordering preserved.
 */

/** Below this saturation a colour is carrying structure, not meaning. */
const ACHROMATIC = 0.15

/**
 * The flipped range, held off pure black and pure white. Upstream's own
 * backgrounds sit near the top of the scale, and mapping them to the very
 * bottom would leave a game's shadows nowhere to go.
 */
const FLOOR = 0.06
const CEILING = 0.94

/** How far to nudge a colour that would otherwise duplicate another. */
const NUDGES = [0.09, -0.09, 0.17, -0.17, 0.25, -0.25, 0.33, -0.33]

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

export function forDarkBoard(light: readonly string[]): string[] {
  const flipped = light.map((css) => {
    const colour = parse(css)
    if (!colour) return css
    if (colour.s >= ACHROMATIC) return veil(colour)
    return format({ ...colour, l: FLOOR + (1 - colour.l) * (CEILING - FLOOR) })
  })

  // Two indices the game drew differently must still be drawn differently.
  const taken = new Map<string, number>()
  return flipped.map((css, index) => {
    const held = taken.get(css)
    if (held === undefined || light[held] === light[index]) {
      taken.set(css, index)
      return css
    }
    const hsl = parse(css)
    for (const nudge of hsl ? NUDGES : []) {
      const moved = format({ ...hsl!, l: hsl!.l + nudge })
      if (!taken.has(moved)) {
        taken.set(moved, index)
        return moved
      }
    }
    return css
  })
}
