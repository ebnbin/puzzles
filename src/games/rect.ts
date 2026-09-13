// Rect:把棋盘切成带数字的矩形。上游 rect.c。
// 键盘可以自己拉一次拖拽(rect.c:2191)。标签四态(rect.c:2374):没拖拽
// Mark/Erase;拖拽没动过两键同报 Cancel;动过之后开拖的键 Done、另一键 Cancel。
// 「哪个键开的拖拽」标签说不出来,自己记一位:四个状态里三个标签说得清,只有
// 「开了没动」靠记,猜错免费——那一格两个键本来都是放弃。
import type { Game, Labels, View } from './game'
import { keyOf, plain } from './game'
import { samePages, verbatim } from './util/declare'
import type { ActSpec, FaceSpec } from './util/pad'
import { act, cross, wordOf } from './util/pad'
import type { Read } from './util/params'
import { CAP, float, formatFloat, int, range } from './util/params'

// 面板上那一档枚举的是 base 棋盘:上游只通过 (base_w, base_h) 这一对整数看见扩展
// 因子(rect.c:1165-1168),同一对 base 配同一种子的局面逐字节相同,所以一对一档才
// 是有意义的刻度——档数因此随棋盘变(7×7 六档,100×99 一百九十五档)。写进控件的
// 仍是上游要的 e,取每一对 base 那段区间里最小的一个可表示值。
const DIGITS = 6

// 上游拿到 e 之后每一维各算一次:单精度、截尾、不足 2 钉 2(rect.c:1165-1168)。
// 照着算一遍才知道这个 e 真正会生成哪一对 base——连 float 也要学像。
const baseOf = (side: number, e: number) =>
  Math.max(2, Math.trunc(Math.fround(Math.fround(side) / Math.fround(1 + Math.fround(e)))))

const pairOf = (w: number, h: number, e: number) => `${baseOf(w, e)}×${baseOf(h, e)}`

// e 能带几位小数:上游用 %g 把它回显进参数框(rect.c:196),超过六位有效数字回来就
// 变了样,再落定时会被当成表外值。整数部分占几位,小数就少几位。
const decimals = (x: number) => (x < 1 ? 6 : x < 10 ? 5 : 4)

// 分界点是算出来的,不是扫出来的:⌊边/(1+e)⌋ 在 1+e = 边/k 处换档(k = 3..边),
// 两维的分界点并起来就是全部台阶。每个分界点取到它下面最近的可表示 e(区间左开右
// 闭,往下取才落在里面),按 e 递增去重 base 对。
const build = (w: number, h: number): number[] => {
  const top = Math.max(w, h) / 2 - 1 // 到这里两维都缩成 2,再往上是同一局
  const cand = new Set<number>([0, top])
  for (const side of [w, h])
    for (let k = 3; k <= side; k++) {
      const x = side / k - 1
      const d = decimals(x)
      const p = 10 ** d
      const v = Math.floor(x * p) / p
      // 分界点本身和它下面一格都试:单精度除法正好落在分界点上时往哪边倒说不准。
      if (v >= 0) cand.add(v)
      if (v - 1 / p >= 0) cand.add(Number((v - 1 / p).toFixed(d)))
    }
  const out: number[] = []
  const seen = new Set<string>()
  for (const e of [...cand].sort((a, b) => a - b)) {
    const key = pairOf(w, h, e)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

// 一张表要算几百次除法,拖动时每帧都问一遍;宽高没变就还是那一张。
let memo: { key: string; list: number[] } = { key: '', list: [] }

const bases = (r: Read): number[] => {
  const w = r.int('Width')
  const h = r.int('Height')
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return []
  const key = `${w}x${h}`
  if (memo.key !== key) memo = { key, list: build(w, h) }
  return memo.list
}

type Facts = { opened: string | null }

const WORDS = ['Mark', 'Erase', 'Done', 'Cancel']

// 拖拽中还没动过(两键同报 Cancel)时,开拖的那一侧亮的是灰勾:承诺的是
// 「这里将来落 Done」,不是现在能按。
const PENDING = '\0pending'

const opener = (labels: Labels, was: string | null) =>
  labels.enter === 'Done'
    ? 'Enter'
    : labels.space === 'Done'
      ? ' '
      : labels.enter === 'Cancel'
        ? was
        : null

const opens = (key: string, labels: Labels) =>
  (key === 'Enter' || key === ' ') && labels.enter === 'Mark'

const dragging = (view: View<Facts>, key: string) => {
  const word = wordOf(key, view.labels)
  if (
    view.labels.enter === 'Cancel' &&
    view.labels.space === 'Cancel' &&
    view.facts.opened === key
  )
    return PENDING
  return word
}

const duo = (spec: Pick<ActSpec<Facts>, 'id' | 'slot' | 'key' | 'idle'>) =>
  act<Facts>({
    ...spec,
    words: WORDS,
    word: (view) => dragging(view, spec.key),
    faces: {
      [spec.idle.word === 'mark' ? 'Mark' : 'Erase']: spec.idle,
      Done: { glyph: 'done', word: 'done' },
      Cancel: { glyph: 'cancel', word: 'cancel' },
      [PENDING]: { glyph: 'done', word: 'done', idle: true },
    } as Record<string, FaceSpec>,
  })

const rect: Game<Facts> = {
  id: 'rect',
  // 拖拽没动过时两键同报 Cancel(rect.c:2374),要申报给边界复原。
  upstream: { labels: 'live', echoes: ['Cancel'], cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('rect'),
  types: {
    menu: verbatim,
    params: [
      // 宽高从 2 起:上游允许 1×n(只查 w·h ≥ 2),但生成时 base 边长 = ⌊1/(1+e)⌋ = 0
      // ——钳位那句写的是 w >= 2,救不了它——扩展因子一动就把引擎打死
      // (random.c:275 断言)。两维都 ≥ 2 时 base 必 ≥ 2×2。
      int('Width', () => range(2, CAP)),
      int('Height', () => range(2, CAP)),
      // 上游只要求非负(rect.c:229)。读数就是这一档的 base 对,轨道下面那行是算出来
      // 的 e。换了棋盘整套枚举都换了,旧的 e 落在新表哪一档都没有意义,所以表外的值
      // 一律回到第一档(e = 0,base 就是棋盘本身)。
      float('Expansion factor', DIGITS, bases, {
        show: (e, r) => pairOf(r.int('Width'), r.int('Height'), e),
        foot: (e) => `e ${formatFloat(e, DIGITS)}`,
        reset: true,
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross<Facts>(),
      duo({ id: 'mark', slot: 4, key: 'Enter', idle: { glyph: 'mark', word: 'mark' } }),
      duo({ id: 'erase', slot: 6, key: ' ', idle: { glyph: 'erase', word: 'erase' } }),
    ],
  },
  observe: {
    init: { opened: null },
    next: (facts, saw) => {
      if ('spoke' in saw) return { opened: opener(saw.spoke, facts.opened) }
      if ('sent' in saw && plain(saw.sent) && opens(keyOf(saw.sent), saw.before))
        return { opened: keyOf(saw.sent) }
      if ('deal' in saw) return { opened: null }
      return facts
    },
  },
}

export default rect
