// Solo:数独(含 Killer、Jigsaw、X 变体)。上游 solo.c。
// 数字键盘按参数推(重新实现 request_keys 的结果,emcc.c 不调用它),认不出的
// 参数一律不显示键盘;对不对得上由 scripts/check-keys.mjs 去问引擎。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, rule } from './util/custom'
import { keepPencil, samePages, verbatim } from './util/declare'
import { PENCIL_HIGHLIGHT, clearKey, digitKeys, marksKey, preferKeys } from './util/keys'
import { act, cross } from './util/pad'

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

// 自定义参数:validate_params solo.c:514-527(不看 full)加 custom_params solo.c:501-505
// 的转换——勾了 Jigsaw 提交时列数变成列×行、行数变成 1,行数 1 本身就是拼图模式
// (solo.c:3698)。于是规则全按乘积(阶数)写,两种模式一样:阶数 ≤ 31(520);Killer
// 阶数 ≤ 9(522);X 阶数 ≥ 4(524);255 那条(518)被 31 盖住。校验只查了列数 ≥ 2
// (516),行数 1 在拼图模式下合法;0 校验里漏了,但 0×0 的盘生不出来,下限取 1。2×2 和
// 阶数小于 4 的拼图上游会把难度压到 Trivial(solo.c:3672),是降级不是失败。
const custom: Custom = {
  fields: [
    { kind: 'int', key: 'c', label: 'Columns of sub-blocks', word: 'blockCols', min: 2, max: 31, role: 'dim' },
    { kind: 'int', key: 'r', label: 'Rows of sub-blocks', word: 'blockRows', min: 1, max: 15, role: 'dim' },
    { kind: 'flag', key: 'x', label: '"X" (require every number in each main diagonal)', word: 'xtype' },
    { kind: 'flag', key: 'jigsaw', label: 'Jigsaw (irregularly shaped sub-blocks)', word: 'jigsaw' },
    { kind: 'flag', key: 'killer', label: 'Killer (digit sums)', word: 'killer' },
    {
      kind: 'pick',
      key: 'symm',
      label: 'Symmetry',
      word: 'symmetry',
      options: ['none', 'rot2', 'rot4', 'mirror2', 'diag2', 'mirror4', 'diag4', 'mirror8'],
    },
    difficulty(['trivial', 'basic', 'intermediate', 'advanced', 'extreme', 'unreasonable']),
  ],
  rules: [
    rule('solo.c:520', ['c', 'r'], (v) => v.c * v.r > 31),
    rule('solo.c:522', ['c', 'r', 'killer'], (v) => !!v.killer && v.c * v.r > 9),
    rule('solo.c:524', ['c', 'r', 'x'], (v) => !!v.x && v.c * v.r < 4),
  ],
}

const solo: Game = {
  id: 'solo',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('solo'),
  types: { menu: verbatim, custom },
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
