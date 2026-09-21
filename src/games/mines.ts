// Mines:扫雷。上游 mines.c。Enter 开格/连开、Space 插旗/取旗,脸跟着标签换。
// 亮 ≠ 安全:旗插错了 Clear 照样亮,按下去踩雷——风险是这步棋本身的,和点
// 数字完全相同;但记住,一个亮着的按钮比一次点击更像背书。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { BOARD_MAX, height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'

// validate_params mines.c:274-320:宽高 ≥ 1(292),确保有解时都 > 2(290,full);雷数
// 1 到 面积 − 9(308-310),留出首次点开的 3×3。SHRT_MAX 和 2^28 那两条在 100 以内碰
// 不到;上游文本框接受的 "n%" 写法 slider 不会产生。布局在首次点击时才生成,有解模式是
// 无限重试(mines.c:1866-1971),最高密度反而平凡可解,没有必然失败的组合。
const custom: Custom = {
  fields: [
    width(1),
    height(1),
    { kind: 'int', key: 'n', label: 'Mines', word: 'mines', min: 1, max: BOARD_MAX * BOARD_MAX - 9, role: 'count' },
    { kind: 'flag', key: 'unique', label: 'Ensure solubility', word: 'soluble' },
  ],
  rules: [
    rule('mines.c:290', ['w', 'unique'], (v) => !!v.unique && v.w <= 2),
    rule('mines.c:290', ['h', 'unique'], (v) => !!v.unique && v.h <= 2),
    rule('mines.c:309', ['n', 'w', 'h'], (v) => v.n > v.w * v.h - 9),
  ],
}

const WORDS = ['Uncover', 'Clear', 'Mark', 'Unmark']

const mines: Game = {
  id: 'mines',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[16, 17]] },
  pages: samePages('mines'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'uncover',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'uncover', word: 'uncover' },
        words: WORDS,
        faces: {
          Uncover: { glyph: 'uncover', word: 'uncover' },
          Clear: { glyph: 'chord', word: 'chord' },
        },
      }),
      act({
        id: 'flag',
        slot: 6,
        key: ' ',
        idle: { glyph: 'flag', word: 'flag' },
        words: WORDS,
        faces: {
          Mark: { glyph: 'flag', word: 'flag' },
          Unmark: { glyph: 'flag', word: 'unflag' },
        },
      }),
    ],
  },
  observe: still,
}

export default mines
