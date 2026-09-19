// Mines:扫雷。上游 mines.c。Enter 开格/连开、Space 插旗/取旗,脸跟着标签换。
// 亮 ≠ 安全:旗插错了 Clear 照样亮,按下去踩雷——风险是这步棋本身的,和点
// 数字完全相同;但记住,一个亮着的按钮比一次点击更像背书。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { int, range } from './util/params'

const WORDS = ['Uncover', 'Clear', 'Mark', 'Unmark']

const area = (r: Read) => r.int('Width') * r.int('Height')

// 宽高 3..50 逐整数,长边 ≤ 短边 × 4,面积 ≥ 12。下限是上游自己夹出来的:勾着「Ensure
// solubility」时两维都要 > 2(mines.c:290),而雷数 ≤ 面积 − 9(309)又要求面积 ≥ 10,
// 于是最小的合法盘只有 3×4——面积那条在这里只去掉 3×3 一格。不勾时上游放到 2×5,但按它
// 自己的注释 2×n 造不出唯一解,不值得让下限跟着勾选框变。
const SIDES = range(3, 50)
const fits = (a: number, b: number) => a <= 4 * b && b <= 4 * a && a * b >= 12
// 宽高互推:两根滑块的档位都是全表,动了一根另一根若配不上就被推到最近的合法档;对方在
// 表外(Game ID 带进来的)时给全表,好把它拉回来。
const beside = (other: number) => {
  const list = SIDES.filter((s) => fits(s, other))
  return list.length ? list : SIDES
}

const mines: Game = {
  id: 'mines',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { relief: [[16, 17]] },
  pages: samePages('mines'),
  types: {
    menu: verbatim,
    params: [
      int('Width', () => SIDES, { within: (r) => beside(r.int('Height')) }),
      int('Height', () => SIDES, { within: (r) => beside(r.int('Width')) }),
      // 雷数按密度 10%–50% 换算,两头向内取整(下限进一、上限舍去),实际密度恒在区间内;
      // 面积 18 以下上游的「≤ 面积 − 9」(mines.c:309)比 50% 更紧,取小的那个。
      int('Mines', (r) => range(Math.ceil(area(r) / 10), Math.min(Math.floor(area(r) / 2), area(r) - 9)), {
        note: (n, r) => `${Math.round((100 * n) / area(r))}%`,
      }),
    ],
  },
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
