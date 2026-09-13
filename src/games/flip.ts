// Flip:翻转一片做全亮。上游 flip.c。
// current_key_label 报一个常量词、不查可见性,光标由宿主镜像;按钮醒来之后
// 永不置灰。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { int, range } from './util/params'

// 上限封的是面积,不是边长:DESC 里原样编着那张「每格 × 每格」的矩阵(flip.c:596),
// 长度 = ⌈面积²/4⌉ 个字符,存档、菜单里的游戏 ID、Random 的生成耗时全跟着面积走,
// 和形状无关(同面积的 20×20 / 10×40 / 40×10 实测 DESC 一字不差、耗时同量级)。
const SIDE = 50
const AREA = 1000

const flip: Game = {
  id: 'flip',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
    },
  },
  touch: { hold: 'right' },
  dark: { keep: [1, 2, 3, 4] },
  pages: samePages('flip'),
  types: {
    menu: verbatim,
    params: [
      // 宽高从 2 起:1×n 时 Random 的矩阵被钉死——能加的候选数正好等于要加的数
      // (余量 4(宽−1)(高−1) 归零),加出来就是十字矩阵;而 1×2 的十字矩阵两行相同,
      // 撞上「不许两行相同」那条(508-524)就永远重来,死循环,和种子无关。
      int('Width', () => range(2, SIDE)),
      int('Height', (r) => range(2, Math.min(SIDE, Math.floor(AREA / r.int('Width'))))),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'flip', slot: 4, key: 'Enter', idle: { glyph: 'flip', word: 'flip' } }),
    ],
  },
  observe: still,
}

export default flip
