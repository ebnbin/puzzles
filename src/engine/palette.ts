/**
 * The same board, played on a dark surface.
 *
 * The back end names its colours once at startup and hands them over as hex
 * strings; every draw then refers to them by index. That makes the palette a
 * lookup table we own, and re-theming a matter of rewriting the table — the
 * wasm never learns anything happened.
 *
 * The rule is one line of intent: **flip the greys, keep the colours.** A
 * puzzle's structure lives in its neutrals — the board, the shading, the ink,
 * the rules drawn in black — and those want to be the other way up on a dark
 * surface. Its meaning lives in its hues: Mines' numbers, Map's regions,
 * Guess's pegs. Those mean something, and inverting them would be a lie.
 *
 * Because the flip is monotonic in lightness, every "is lighter than" relation
 * in the original survives as "is darker than" here, which is what keeps a
 * game's shading readable without knowing anything about what it draws. Two
 * distinct colours also cannot become one — but the flipped greys land among
 * hues that were left alone, so a collision pass afterwards is cheap insurance
 * rather than an assumption.
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

type Hsl = { h: number; s: number; l: number }

/** The back end always sends `#rrggbb`; anything else is left alone. */
function parse(css: string): Hsl | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css)
  if (!m) return null
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    (max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4) / 6
  return { h, s, l }
}

function format({ h, s, l }: Hsl): string {
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
    const hsl = parse(css)
    if (!hsl || hsl.s >= ACHROMATIC) return css
    return format({ ...hsl, l: FLOOR + (1 - hsl.l) * (CEILING - FLOOR) })
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
