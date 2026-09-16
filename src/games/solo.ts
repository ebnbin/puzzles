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

// 上游 solo.c:514-527:阶数 c·r ≤ 31,Killer 时 ≤ 9,X 时 ≥ 4,列数 ≥ 2。
// 行数 = 1 与 Jigsaw 是同一件事:勾选框只是 r == 1 的显示(solo.c:471),生成器也只认
// r == 1(solo.c:3698)。所以行数不给 1 这一档——勾着 Jigsaw 时钉死 1、整行不画(这时
// 列数就是阶数),勾掉时从 2 起。勾选与取消都不动列数,只在它落到新表外时才被吸走。
// 二阶(2j 或 2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像,以及二阶 Killer,上游生成不终止。
const order = (r: Read) => (r.flag('Killer (digit sums)') ? 9 : 31)
const jigsaw = (r: Read) => r.flag('Jigsaw (irregularly shaped sub-blocks)')
const xtype = (r: Read) => r.flag('"X" (require every number in each main diagonal)')
const NO_ORDER2 = [2, 5, 7]
const stuck = (r: Read) => NO_ORDER2.includes(r.pick('Symmetry')) || r.flag('Killer (digit sums)')

const solo: Game = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: {
    menu: verbatim,
    params: [
      // 勾着 Jigsaw 时这根滑块就是阶数(行数钉在 1),下限直接是上游对阶数的要求;
      // 勾掉时它是子块列数,上限留一半给行数(行数至少 2)。
      int('Columns of sub-blocks', (r) =>
        jigsaw(r)
          ? range(xtype(r) ? 4 : 2, order(r)).filter((c) => !(stuck(r) && c === 2))
          : range(2, Math.floor(order(r) / 2)),
      ),
      int(
        'Rows of sub-blocks',
        (r) => {
          if (jigsaw(r)) return [1]
          const c = r.int('Columns of sub-blocks')
          return range(2, Math.floor(order(r) / c)).filter(
            (rows) => !(stuck(r) && c === 2 && rows === 2),
          )
        },
        { hide: jigsaw },
      ),
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
