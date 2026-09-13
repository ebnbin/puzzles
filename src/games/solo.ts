// Solo:数独(含 Killer、Jigsaw、X 变体)。上游 solo.c。
// 数字键盘按参数推(重新实现 request_keys 的结果,emcc.c 不调用它),认不出的
// 参数一律不显示键盘;对不对得上由 scripts/check-keys.mjs 去问引擎。
import type { Game } from './game'
import { still } from './game'
import { keepPencil, samePages, verbatim } from './util/declare'
import { PENCIL_HIGHLIGHT, clearKey, digitKeys, marksKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { int, range } from './util/params'

function params(text: string): { c: number; r: number } | null {
  const first = /^(\d+)/.exec(text)
  if (!first) return null
  let c = Number(first[1])
  let r = c
  let seenR = false
  let at = first[1].length

  if (text[at] === 'x') {
    const second = /^(\d+)/.exec(text.slice(at + 1))
    if (!second) return null
    r = Number(second[1])
    seenR = true
    at += 1 + second[1].length
  }

  while (at < text.length) {
    const ch = text[at]
    if (ch === 'j') {
      at += 1
      if (seenR) c *= r
      r = 1
    } else if (ch === 'x' || ch === 'k') {
      at += 1
    } else if (ch === 'r' || ch === 'm' || ch === 'a') {
      at += 1
      if (ch === 'm' && text[at] === 'd') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    } else if (ch === 'd') {
      at += 1
      if (!'tbiaeu'.includes(text[at])) return null
      at += 1
    } else {
      return null
    }
  }

  const cr = c * r
  if (!Number.isInteger(cr) || cr < 1 || cr > 36) return null
  return { c, r }
}

// 上游 solo.c:514-527:阶数 c·r ≤ 31,Killer 时 ≤ 9,X 时 ≥ 4,列数 ≥ 2。勾了 Jigsaw
// 时 C 侧先把两数相乘再把行数归 1(solo.c:502),「≥ 2」落在乘积上,列数本身可以是 1。
// 行数 = 1 在上游就是 Jigsaw 布局(solo.c:471),没勾 Jigsaw 时行数从 2 起——否则
// 勾掉 Jigsaw 提交回去的还是 r = 1,勾不掉;列数相应封到 order/2。
// 二阶(2j 或 2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像,以及二阶 Killer,上游生成不终止。
const order = (r: Read) => (r.flag('Killer (digit sums)') ? 9 : 31)
const jigsaw = (r: Read) => r.flag('Jigsaw (irregularly shaped sub-blocks)')
const NO_ORDER2 = [2, 5, 7]

const solo: Game = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: {
    menu: verbatim,
    params: [
      int('Columns of sub-blocks', (r) =>
        jigsaw(r) ? range(1, order(r)) : range(2, Math.floor(order(r) / 2)),
      ),
      int('Rows of sub-blocks', (r) => {
        const c = r.int('Columns of sub-blocks')
        const x = r.flag('"X" (require every number in each main diagonal)')
        const j = jigsaw(r)
        const least = Math.max(j ? Math.ceil(2 / c) : 2, x ? Math.ceil(4 / c) : 1)
        const stuck = NO_ORDER2.includes(r.pick('Symmetry')) || r.flag('Killer (digit sums)')
        return range(least, Math.floor(order(r) / c)).filter(
          (rows) => !(stuck && (j ? c * rows === 2 : c === 2 && rows === 2)),
        )
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false, defaults: keepPencil },
  keypad: ({ params: p, prefs }) => {
    const parsed = params(p)
    if (!parsed) return null
    const cr = parsed.c * parsed.r
    return [
      ...digitKeys(cr),
      clearKey(),
      marksKey(),
      ...preferKeys(prefs, [PENCIL_HIGHLIGHT]),
    ]
  },
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'pencil', slot: 4, key: 'Enter', idle: { glyph: 'pencil', word: 'pencil' } }),
    ],
  },
  observe: still,
}

export default solo
