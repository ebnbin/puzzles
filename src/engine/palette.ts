// 深色主题 = 把后端报上来的颜色表整表翻译一遍,wasm 全程不知情。SEMANTIC/BEVEL/
// FIGURE/RIM 这些表的不变量由 scripts/verify-palette.mjs 用代码强制,改表就跑它;
// 表要保持顶格 const 声明——那个脚本靠改写行首加 export 才 import 得到它们。
const ACHROMATIC = 0.15

const FLOOR = 0.05
const CEILING = 0.8

const LIFT_CEILING = 0.64

const SEMANTIC: Record<string, readonly number[]> = {
  pattern: [1, 2, 4, 5],
  flip: [1, 2, 3, 4],
  pearl: [3, 4],
  unruly: [1, 2, 3, 4, 5, 6, 7, 8],
  mosaic: [3, 4, 5],
  singles: [3, 4, 5, 6],
  range: [1],
  lightup: [2, 3],
  guess: [16, 17],
}

export const RIM: Record<string, Readonly<Record<number, number>>> = {
  pearl: { 3: 4 },
}

export const FIGURE: Record<string, readonly number[]> = {
  undead: [0, 2],
}


const PAPER_BOARD = 0.5

const BOARD_IS_PAPER: ReadonlySet<string> = new Set(['lightup', 'singles', 'range'])


const BEVEL: Record<string, readonly (readonly [number, number])[]> = {
  fifteen: [[2, 3]],
  sixteen: [[2, 3]],
  twiddle: [
    [2, 4],
    [3, 5],
    [6, 7],
  ],
  mines: [[16, 17]],
  samegame: [[12, 13]],
  pegs: [[1, 2]],
  blackbox: [[5, 6]],
  inertia: [[2, 3]],
  flood: [[12, 13]],
  // unruly 这两对目前是空跑(SEMANTIC 的 compress 已保持方向,交换不触发),
  // 留着是护栏:哪天 unruly 离开 SEMANTIC,靠它们接住;verify-palette 不查这件事。
  unruly: [
    [4, 5],
    [7, 8],
  ],
}

export const BACKGROUND = 0


const VEIL = 0.4


type Colour = { h: number; s: number; l: number; r: number; g: number; b: number }

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

function luminance({ r, g, b }: Colour): number {
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

function ratio(a: number, b: number): number {
  const [x, y] = a > b ? [a, b] : [b, a]
  return (x + 0.05) / (y + 0.05)
}

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

// flip 和 compress 共享 FLOOR/CEILING、方向相反,端点必然重合:两个不同浅色落到
// 同一暗色是量过并接受的(Mines 的 1 和 4 同蓝),不要为此加扰动。
const flip = (l: number) => FLOOR + (1 - l) * (CEILING - FLOOR)

const compress = (l: number) => FLOOR + l * (CEILING - FLOOR)

export const figureInk = (css: string): string => {
  const colour = parse(css)
  return colour ? format({ ...colour, l: compress(colour.l) }) : css
}


export function forDarkBoard(light: readonly string[], game = ''): string[] {
  const semantic = SEMANTIC[game]

  const board = parse(light[BACKGROUND])
  const rimmed = RIM[game] ?? {}
  const needsRoom =
    BOARD_IS_PAPER.has(game) &&
    !!semantic &&
    !!board &&
    semantic.some((i) => {
      if (i in rimmed) return false
      const kept = parse(light[i])
      return !!kept && compress(kept.l) < flip(board.l)
    })

  const flipped = light.map((css, index) => {
    const colour = parse(css)
    if (!colour) return css
    if (semantic) {
      if (index === BACKGROUND && needsRoom)
        return format({ ...colour, l: PAPER_BOARD })
      if (semantic.includes(index))
        return format({ ...colour, l: compress(colour.l) })
    }
    if (colour.s >= ACHROMATIC) return veil(colour)
    return format({ ...colour, l: flip(colour.l) })
  })

  const darkBoard = parse(flipped[BACKGROUND])

  const standOff = (
    colour: Colour, ground: number, want: number, from: number, ceiling: number,
  ) => {
    let lo = from
    let hi = ceiling
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      const at = parse(format({ ...colour, l: mid }))
      if (at && ratio(ground, luminance(at)) < want) lo = mid
      else hi = mid
    }
    return format({ ...colour, l: (lo + hi) / 2 })
  }

  for (let index = 0; index < light.length; index++) {
    if (index === BACKGROUND) continue
    if (semantic?.includes(index)) continue
    const was = parse(light[index])
    const now = parse(flipped[index])
    if (!was || !now || !board || !darkBoard) continue
    if (was.s < ACHROMATIC) continue
    const ground = luminance(darkBoard)
    const want = ratio(luminance(board), luminance(was))
    if (ratio(ground, luminance(now)) >= want) continue
    flipped[index] = standOff(now, ground, want, now.l, LIFT_CEILING)
  }

  for (const [lit, shade] of BEVEL[game] ?? []) {
    const a = parse(flipped[lit])
    const b = parse(flipped[shade])
    if (!a || !b || a.l >= b.l) continue
    ;[flipped[lit], flipped[shade]] = [flipped[shade], flipped[lit]]
  }

  // 这个 pass 不冗余:所有规则同色入同色出,唯一能打破的是 BEVEL 交换(值在槽位
  // 间搬家),所以用交换过的对播种、同浅色槽跟走;SEMANTIC 槽故意豁免(Pattern
  // 的两个黑本该分开)。
  const settled = new Map<string, string>()
  for (const index of BEVEL[game]?.flat() ?? [])
    if (!semantic?.includes(index)) settled.set(light[index], flipped[index])

  return flipped.map((css, index) => {
    if (semantic?.includes(index)) return css
    const twin = settled.get(light[index])
    if (twin !== undefined) return twin
    settled.set(light[index], css)
    return css
  })
}
