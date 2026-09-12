// Inertia:滑到底收宝石避地雷。上游 inertia.c。唯一走八方的:斜向借小键盘
// 的 7/9/1/3(inertia.c 认 MOD_NUM_KEYPAD 的方位数字),中间那格留给「重放
// 求解器下一步」,按过求解才出现(第二层)。没有键盘光标,方向键即走子。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, layerByWords, step } from './util/pad'
import { CAP, int, range } from './util/params'

const WORDS = ['Advance']

const inertia: Game = {
  id: 'inertia',
  upstream: { labels: 'live', cursor: { kind: 'none' } },
  touch: { hold: 'right' },
  dark: { relief: [[2, 3]] },
  pages: samePages('inertia'),
  types: {
    menu: verbatim,
    params: [
      // 宽高从 3 起:窄条的生成对长边是指数慢(短边 2 时每 +10 乘约 3.5 倍,
      // 2×100 要 171 秒),上游只查面积 ≥ 6。3 起之后面积恒 ≥ 9,那条再也触发
      // 不了,宽和高之间不再互相依赖。逐档实测在 docs/params.md。
      int('Width', () => range(3, CAP)),
      int('Height', () => range(3, CAP)),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    layer: layerByWords(WORDS, ['Advance']),
    keys: [
      step('downLeft', 1), step('down', 2), step('downRight', 3),
      step('left', 4), step('right', 6),
      step('upLeft', 7), step('up', 8), step('upRight', 9),
      act({
        id: 'advance',
        slot: 5,
        key: 'Enter',
        layer: 2,
        idle: { glyph: 'advance', word: 'advance' },
        words: WORDS,
        faces: { Advance: { glyph: 'advance', word: 'advance' } },
      }),
    ],
  },
  observe: still,
}

export default inertia
