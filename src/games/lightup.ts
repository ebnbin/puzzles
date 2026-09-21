// Light Up:放灯照亮全盘。上游 lightup.c。放灯、打叉是上游自己的绝对键;
// 对方的记号上一按替换(先发对方的键擦掉再落自己)。第二下必然落得下:能挡它
// 的只有黑格,而黑格上邻居一个字不报。黑格上两个一起灰。
import type { Game } from './game'
import { still } from './game'
import type { Custom, Values } from './util/custom'
import { difficulty, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['Light', 'Mark', 'Clear']

const LIT_BLOBS: Prefer = {
  kind: 'flag',
  label: 'Draw non-light marks even when lit',
  glyph: 'litBlob',
}

// validate_params lightup.c:355-376:宽高 ≥ 2;full 下黑格百分比 5..100(362),4 重旋转
// 只许正方形(365-367),4 重对称宽高至少一维 ≥ 3(368)。INT_MAX 那条在 100 以内碰不到。
// 生成(lightup.c:1552-1611)是「这档解得出、低一档解不出」的重试:每 20 次失败把黑格
// 百分比加 5,到 90 就不再加。于是某个形状根本不存在该难度的谜面 = 永不结束。下面
// 「穷举」指把该形状的全部谜面(黑格布局 × 每个黑格有无数字及 0..4,对称模式只取对称
// 布局)逐个交给 puzzle_is_good 数过(scripts/upstream-probe/lu_enum.c),没穷举到的放行:
//  - 2×2 没有 Tricky/Hard;面积 ≤ 8 没有 Hard;3×3 带任一对称都没有 Hard;
//  - 4 重对称 3×3 以内没有 Tricky/Hard;2 重旋转 2×5/5×2、2 重镜像 N×2(N ≤ 8)没有 Hard;
//  - 4 重镜像 4×4 和 2×N(N ≤ 11)没有 Hard。
// 另一条是推理:白格 ≤ 3 的谜面要么 Easy 就解得出要么无独解(1 格自照,2 格相邻只能靠
// 一侧线索定,3 格同理),Tricky/Hard 必死。白格数按 set_blacks(600-668)算:区域
// rw×rh 里抽 floor(rw·rh·pc/100) 格再按对称复制;2 重旋转奇数高时中间行右半会被左半
// 覆盖(等于没抽),取最少黑格。起始百分比越低白格越多,所以只看起始值。
const NONE = 0
const REF2 = 1
const ROT2 = 2
const REF4 = 3
const ROT4 = 4
const HARD = 2
const four = (v: Values) => v.symm === ROT4 || v.symm === REF4
const half = (n: number) => Math.floor(n / 2)

// set_blacks 区域里每个格子抽中后在整盘上落下几个黑格,取抽中数个最小的加起来。
function minBlacks(w: number, h: number, pc: number, symm: number): number {
  const wodd = w % 2
  const hodd = h % 2
  const drops: number[] = []
  const put = (count: number, each: number) => {
    for (let i = 0; i < count; i++) drops.push(each)
  }
  if (symm === NONE) put(w * h, 1)
  else if (symm === REF2) {
    put(w * half(h), 2)
    put(hodd * w, 1)
  } else if (symm === ROT2) {
    put(w * half(h), 2)
    put(hodd * half(w), 2)
    put(hodd * wodd, 1)
    put(hodd * half(w), 0)
  } else if (symm === REF4) {
    put(half(w) * half(h), 4)
    put(wodd * half(h), 2)
    put(hodd * half(w), 2)
    put(wodd * hodd, 1)
  } else put(half(w) * (half(h) + hodd), 4)
  const picked = Math.floor((drops.length * pc) / 100)
  return drops
    .sort((a, b) => a - b)
    .slice(0, picked)
    .reduce((sum, n) => sum + n, 0)
}

const custom: Custom = {
  fields: [
    width(2),
    height(2),
    { kind: 'int', key: 'black', label: '%age of black squares', word: 'blackPc', min: 5, max: 100, role: 'count', suffix: '%' },
    {
      kind: 'pick',
      key: 'symm',
      label: 'Symmetry',
      word: 'symmetry',
      options: ['none', 'mirror2', 'rotational2', 'mirror4', 'rotational4'],
    },
    difficulty(['easy', 'tricky', 'hard']),
  ],
  rules: [
    rule('lightup.c:365', ['w', 'h', 'symm'], (v) => v.symm === ROT4 && v.w !== v.h),
    rule('lightup.c:368', ['w', 'h', 'symm'], (v) => four(v) && v.w < 3 && v.h < 3),
    rule('lightup.c:1595', ['w', 'h', 'diff'], (v) => v.diff > 0 && v.w === 2 && v.h === 2),
    rule('lightup.c:1595', ['w', 'h', 'diff'], (v) => v.diff === HARD && v.w * v.h <= 8),
    rule('lightup.c:1595', ['w', 'h', 'symm', 'diff'], (v) =>
      v.diff === HARD && v.w === 3 && v.h === 3 && v.symm !== NONE),
    rule('lightup.c:1595', ['w', 'h', 'symm', 'diff'], (v) => v.diff > 0 && four(v) && v.w <= 3 && v.h <= 3),
    rule('lightup.c:1595', ['w', 'h', 'symm', 'diff'], (v) =>
      v.diff === HARD && v.symm === ROT2 && Math.min(v.w, v.h) === 2 && Math.max(v.w, v.h) === 5),
    rule('lightup.c:1595', ['w', 'h', 'symm', 'diff'], (v) =>
      v.diff === HARD && v.symm === REF2 && v.h === 2 && v.w >= 5 && v.w <= 8),
    rule('lightup.c:1595', ['w', 'h', 'symm', 'diff'], (v) =>
      v.diff === HARD && v.symm === REF4 &&
      ((v.w === 4 && v.h === 4) || (Math.min(v.w, v.h) === 2 && Math.max(v.w, v.h) <= 11))),
    rule('lightup.c:1609', ['w', 'h', 'black', 'symm', 'diff'], (v) =>
      v.diff > 0 && v.w * v.h - minBlacks(v.w, v.h, v.black, v.symm) <= 3),
  ],
}

const lightup: Game = {
  id: 'lightup',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [2, 3], paper: true },
  pages: samePages('lightup'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: ({ prefs }) => preferKeys(prefs, [LIT_BLOBS]),
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'light',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'lamp', word: 'light' },
        words: WORDS,
        faces: {
          Light: { glyph: 'lamp', word: 'light' },
          Clear: { glyph: 'lamp', word: 'unlight', on: true },
        },
        replaces: 'Clear',
      }),
      act({
        id: 'mark',
        slot: 6,
        key: ' ',
        idle: { glyph: 'dotSquare', word: 'cannot' },
        words: WORDS,
        faces: {
          Mark: { glyph: 'dotSquare', word: 'cannot' },
          Clear: { glyph: 'dotSquare', word: 'uncannot', on: true },
        },
        replaces: 'Clear',
      }),
    ],
  },
  observe: still,
}

export default lightup
