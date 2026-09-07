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
// 行数上游没查下限(0 也放行,生成时才出事),这里按语义从 1 起。
const order = (r: Read) => (r.flag('Killer (digit sums)') ? 9 : 31)
const jigsaw = (r: Read) => r.flag('Jigsaw (irregularly shaped sub-blocks)')

const solo: Game = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: {
    menu: verbatim,
    params: [
      int('Columns of sub-blocks', (r) => range(jigsaw(r) ? 1 : 2, order(r))),
      int('Rows of sub-blocks', (r) => {
        const c = r.int('Columns of sub-blocks')
        const x = r.flag('"X" (require every number in each main diagonal)')
        const least = Math.max(jigsaw(r) ? Math.ceil(2 / c) : 1, x ? Math.ceil(4 / c) : 1)
        return range(least, Math.floor(order(r) / c))
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
