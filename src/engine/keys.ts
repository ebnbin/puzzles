// 区域 A 那排键(棋盘正下方)。重新实现上游 request_keys() 的结果(emcc.c 不调用
// 它),按 game id 里的参数推;认不出的 id 一律不显示键盘,而不是显示错的。逐游戏的
// 判据和踩过的坑在 docs/keys.md,改这里要同步改它。方向键那一块在 pad.ts——
// 只有 Map 和 Guess 的颜色键例外,它们属于方向键那一类('aim')却住在这儿,
// 因为方向键块封死在 3×3、装不下十种颜色。
// 这份推导和上游的真答案对不对得上,由 scripts/check-keys.mjs 去问引擎
// (midend_request_keys 已经导出);改 RULES、升级 vendor 之后跑它。
import { COLOURS } from './map'
import type { DialogControl, KeyLabel } from './types'

const MAX_SYMBOLS = 36

// 最宽的那排上非符号键的个数(unequal:36 个符号 + 这些)。它只用来给 keysFor 的
// 长度守卫定上界——守卫是拿来挡认错的 id 的,所以只要不小于任何一排的真实长度即可。
// 加键之前先跟这个上界比一比:超了整排不显示,而且只在最宽的合法棋盘上才看得见。
const MAX_EXTRAS = 6

// 字符与数值是两回事:unequal 超过 9 阶从 '0' 起标以保持一字宽,此时 '0' 键的
// value 是 1——value: i + 1 不是 off-by-one,键面显示前者、角标按后者计数。
function digits(count: number, startAtZero = false): KeyLabel[] {
  const first = startAtZero ? 0 : 1
  return Array.from({ length: count }, (_, i) => {
    const shown = first + i
    const button =
      shown <= 9 ? '0'.charCodeAt(0) + shown : 'a'.charCodeAt(0) + shown - 10
    return { kind: 'need', button, label: String.fromCharCode(button), value: i + 1 }
  })
}

const CLEAR: KeyLabel = { kind: 'need', button: 8, icon: 'clear' }

const MARKS: KeyLabel = { kind: 'aid', button: 'M'.charCodeAt(0), icon: 'marks', whose: 'upstream' }
const HINT: KeyLabel = { kind: 'aid', button: 'H'.charCodeAt(0), icon: 'hint', whose: 'upstream' }
const JUMBLE: KeyLabel = { kind: 'aid', button: 'J'.charCodeAt(0), icon: 'jumble', whose: 'upstream' }

const POSSIBLE: KeyLabel = { kind: 'aid', button: 0, action: 'possible', icon: 'possible', whose: 'ours' }
const SINGLE: KeyLabel = { kind: 'aid', button: 0, action: 'single', icon: 'single', whose: 'ours' }
const BLANK: KeyLabel = { kind: 'aid', button: 0, action: 'blank', icon: 'blank', whose: 'ours' }

function params(gameId: string): string {
  return gameId.split(':')[0]
}

function size(p: string): number | null {
  const m = p.match(/^(\d+)/)
  if (!m) return null
  const n = +m[1]
  return n >= 1 && n <= MAX_SYMBOLS ? n : null
}

// 故意按 answers 列表逐项匹配、不按名字(keyword 过不了边界):上游改名仍读对;
// 答案增删换序时宁可漏配(回落默认脸)也不把 value 对到换过序的表上。下面的
// flag 是被迫按 label 匹配的唯一例外——boolean 没有答案可匹配。
export function preference(
  prefs: readonly DialogControl[],
  answers: readonly string[],
): number | null {
  for (const control of prefs)
    if (
      control.kind === 'choices' &&
      control.choices.length === answers.length &&
      control.choices.every((answer, i) => answer === answers[i])
    )
      return control.value
  return null
}

const MONSTERS = ['Pictures', 'Letters']

// 引擎调色板里这几号是我们按名字认下来的:map 的四个区域色从 2 号起,guess 的
// 钉子色从 6 号起、边框借 1 号。升级 vendor 后要重新核对。
const COL_MAP = 2
const COL_FRAME = 1
const COL_1 = 6

const LABELLED = 'Label colours with numbers'

function flag(prefs: readonly DialogControl[], label: string): boolean {
  for (const control of prefs)
    if (control.kind === 'boolean' && control.label === label) return control.value
  return false
}

const UNDEAD = [
  { letter: 'G', icon: 'ghost' },
  { letter: 'V', icon: 'vampire' },
  { letter: 'Z', icon: 'zombie' },
] as const

const RULES: Record<
  string,
  (p: string, prefs: readonly DialogControl[]) => KeyLabel[] | null
> = {
  solo(p) {
    const m = p.match(/^(\d+)(?:x(\d+))?(.*)$/)
    if (!m) return null
    let c = +m[1]
    let r = m[2] === undefined ? c : +m[2]
    if (m[3].split('d')[0].includes('j')) {
      if (m[2] !== undefined) c *= r
      r = 1
    }
    const cr = c * r
    if (cr < 1 || cr > MAX_SYMBOLS) return null
    return [...digits(cr), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK]
  },
  keen(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK] : null
  },
  towers(p) {
    const w = size(p)
    return w ? [...digits(w), CLEAR, MARKS, POSSIBLE, SINGLE, BLANK] : null
  },
  unequal(p) {
    const order = size(p)
    if (!order) return null
    return [...digits(order, order > 9), CLEAR, MARKS, HINT, POSSIBLE, SINGLE, BLANK]
  },
  filling: () => [...digits(9), CLEAR],
  undead(_p, prefs) {
    const letters = preference(prefs, MONSTERS) === MONSTERS.indexOf('Letters')
    return [
      ...UNDEAD.map(({ letter, icon }): KeyLabel => ({
        kind: 'need',
        button: letter.charCodeAt(0),
        ...(letters ? { label: letter } : { icon }),
      })),
      CLEAR,
      MARKS,
      POSSIBLE,
      SINGLE,
      BLANK,
    ]
  },
  // guess 的一排颜色钉。一次按键展开成上游的一串:先把调色板光标顶到这个颜色
  // (取近的那一头顶,顶满一趟保证到头),再按 Enter 落子——就是上游「上下选色 +
  // 确认」那条路,我们只是把它缩成一个键。落完光标不动,和上游一致;数字键那条
  // 路(落子并自动前进)我们不用。
  guess(p, prefs) {
    const m = p.match(/^c(\d+)p(\d+)g\d+/)
    if (!m) return null
    const n = +m[1]
    if (n < 2 || n > 10 || +m[2] < 1) return null
    const labelled = flag(prefs, LABELLED)
    return [
      ...Array.from({ length: n }, (_, i): KeyLabel => {
        const fromTop = i <= (n - 1) / 2
        return {
          kind: 'aim',
          button: 0,
          slot: COL_1 + i,
          ink: COL_FRAME,
          value: i + 1,
          ...(labelled ? { label: String((i + 1) % 10) } : {}),
          aims: {
            home: fromTop ? 'ArrowUp' : 'ArrowDown',
            step: fromTop ? 'ArrowDown' : 'ArrowUp',
            span: n,
            at: fromTop ? i : n - 1 - i,
          },
        }
      }),
      HINT,
    ]
  },

  // map 的四个区域色。上游没有任何键能说出一个颜色,所以这四个不发按键,走存档门。
  map: () =>
    Array.from({ length: COLOURS }, (_, i): KeyLabel => ({
      kind: 'aim',
      button: 0,
      slot: COL_MAP + i,
      value: i + 1,
      paints: { colour: i },
    })),

  galaxies: () => [HINT],
  net: () => [JUMBLE],
  fifteen: () => [HINT],
  bridges: () => [HINT],
  range: () => [HINT],
  pearl: () => [HINT],
  dominosa(p) {
    const n = size(p)
    if (n === null) return null
    return digits(n + 1, true).map(({ value: _, ...key }): KeyLabel => ({
      ...key,
      kind: 'aid',
      whose: 'upstream',
    }))
  },
}

// 键盘长什么样要问偏好设置的游戏:PuzzleHost 见到这些名字,才会在偏好可能
// 动过之后回来重读一遍。
export const READS_PREFS = new Set(['undead', 'guess', 'palisade'])

export const HOLD_BUTTON: Record<string, number> = {
  net: 1,
}

// 开着「可能」时 map 那排改画点状铅笔色,按下去也落铅笔——一处改两件事。
export const asMaybes = (keys: KeyLabel[]): KeyLabel[] =>
  keys.map((k) =>
    k.paints && k.paints.colour >= 0
      ? { ...k, dotted: true, paints: { ...k.paints, pencil: true } }
      : k,
  )

export function keysFor(
  name: string,
  gameId: string,
  prefs: readonly DialogControl[] = [],
): KeyLabel[] {
  const rule = RULES[name]
  if (!rule) return []
  const keys = rule(params(gameId), prefs)
  if (!keys || keys.length < 1 || keys.length > MAX_SYMBOLS + MAX_EXTRAS) return []
  return keys
}
