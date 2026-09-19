// Same Game:整片消除同色块。上游 samegame.c。
// current_key_label 不查可见性标志,光标由宿主镜像。「取消选中」不是选中键的
// 工作(那个键的工作是「选中/消除脚下」),另开第二层;第二层 = 光标站在已
// 选块上,镜像光标睡着时永不开。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross, layerByWordsAwake } from './util/pad'
import type { Read } from './util/params'
import { CAP, int, range } from './util/params'

const WORDS = ['Select', 'Remove', 'Unselect']

const soluble = (r: Read) => r.flag('Ensure solubility')

// 色数上限:保证可解时每次插两格(奇数面积开头有一次三格,samegame.c:24-26),块数
// 就是 ⌊面积/2⌋,能出现的颜色不可能比块多——2×2 只出得来 2 色、3×3 只出得来 4 色,
// 实测取等。不保证可解时上游自己要求每色两格(309),两侧同一个式子。
const palette = (r: Read) => Math.min(9, Math.floor((r.int('Width') * r.int('Height')) / 2))

const samegame: Game = {
  id: 'samegame',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
    },
  },
  touch: { hold: 'right' },
  dark: { relief: [[12, 13]] },
  pages: samePages('samegame'),
  types: {
    menu: verbatim,
    params: [
      // 宽高从 2 起:上游只查面积(302/309),1×n 能生成也不崩,但消完的复位是「各列
      // 下落 + 空列左移」(1214),宽 1 没有列可移、高 1 没有格可落,都退化成一维消除。
      // 两维都 ≥ 2 后面积恒 ≥ 4,不勾时那条「面积 ≥ 2×色数 ⇒ ≥ 4」自动满足,高不用再看宽。
      int('Width', () => range(2, CAP)),
      int('Height', () => range(2, CAP)),
      // 下限:上游勾着要 ≥ 3(300)、不勾要 ≥ 2(305);勾着且宽 > 20 时再抬到 4——三色
      // 保证可解是拒绝采样,重来次数对宽是指数的(每加一列 ×1.7),而四色起整个 100×100
      // 最坏 0.21 秒(五色起一格最多四个邻居,鸽笼保证永不堵色,528)。
      // 2×2 勾着时上限比下限还低,取下限:那一格上游只认 3。
      int('No. of colours', (r) => {
        const lo = soluble(r) ? (r.int('Width') > 20 ? 4 : 3) : 2
        return range(lo, Math.max(lo, palette(r)))
      }),
    ],
  },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    layer: layerByWordsAwake(WORDS, ['Remove']),
    keys: [
      ...cross(),
      act({
        id: 'select',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'select', word: 'select' },
        words: WORDS,
        faces: {
          Select: { glyph: 'select', word: 'select' },
          Remove: { glyph: 'done', word: 'remove', on: true },
        },
      }),
      act({
        id: 'unselect',
        slot: 6,
        key: ' ',
        layer: 2,
        idle: { glyph: 'cancel', word: 'unselect' },
        words: WORDS,
        does: 'Unselect',
      }),
    ],
  },
  observe: still,
}

export default samegame
