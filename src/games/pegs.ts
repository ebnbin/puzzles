// Pegs:单人跳棋。上游 pegs.c。Enter 选中一颗(给方向键上膛,跳跃是下一次
// 方向键),上了膛换成叉。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import { int, range } from './util/params'

const WORDS = ['Select', 'Cancel']

// 上游 pegs.c:206-228:十字板只有 {5,7,9}² 去掉 5×5 这八种,八角板只有 7×7。
const CROSS = [5, 7, 9]

// Random 封到 30(上游对它没有上限,只要求 > 3)。生成是拒绝采样:从中心反向走子
// 长出一片,要求四条边都够到,否则整盘重来、没有次数上限(pegs_generate)。而那一片
// 的面积恒是盘面的 57%(genmoves 走满 面积/2 步就收紧),形状又是团状,所以盘子越大
// 越难正好顶满四条边,越细长越是够不到两头——50×10 两万次尝试零通过。30 以内最瘦的
// 30×4 平均 1.6 秒、最坏 7.4 秒;30×30 是 0.015 秒。
const RANDOM_MAX = 30

const pegs: Game = {
  id: 'pegs',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[1, 2]] },
  pages: samePages('pegs'),
  types: {
    menu: verbatim,
    params: [
      int('Width', (r) => {
        const type = r.pick('Board type')
        return type === 0 ? CROSS : type === 1 ? [7] : range(4, RANDOM_MAX)
      }),
      int('Height', (r) => {
        const type = r.pick('Board type')
        if (type === 0) return r.int('Width') === 5 ? [7, 9] : CROSS
        return type === 1 ? [7] : range(4, RANDOM_MAX)
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    keys: [
      ...cross(),
      act({
        id: 'jump',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'jump', word: 'jump' },
        words: WORDS,
        faces: {
          Select: { glyph: 'jump', word: 'jump' },
          Cancel: { glyph: 'cancel', word: 'unjump', on: true },
        },
      }),
    ],
  },
  observe: still,
}

export default pegs
