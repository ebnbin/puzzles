// Guess:猜色版 Mastermind。上游 guess.c。
// 只自己造了一样东西:一键选色——一按 = 上下把调色板光标顶到那个颜色 + Enter,
// 正是上游「上下选色、确认落子」那条路缩成一个键(move_cursor 夹边不绕回,
// 连按 ncolours 次「上」必到第一格:推导,不是记忆;取近的那一头顶)。落完光标
// 不动,和上游的 CURSOR_SELECT 一致;数字键那条路(落色并前进)不用,两条路
// 混着走会让「按一下到底动了什么」说不清。
// 三个功能键的死活全由标签定(guess.c 的 current_key_label 报什么就是什么):
//   光标在钉子上   Place / Hold   → 保留、删除亮,看结果灰
//   光标在看结果位 Submit / ""    → 只有看结果亮
//   解出来了       "" / ""        → 全灰
// ⌫ 在「看结果」位会读写 pegs[npegs](数组外,guess.c 唯独没防这一支),
// 置灰是唯一一道拦;labels.enter !== 'Place' 就是那个传感器。
// 颜色钉在「看结果」位一起灰:那时 Enter 是交卷,不灰就成了「按颜色变成交卷」。
// 按下之前再问一次标签,挡的是状态刚变、按钮还没重画完那一瞬间的点击。
// 'l' 键能切换「数字标签」偏好,所以偏好 volatile。
import type { ArrowKey, Game, Key, Slot } from './game'
import { still } from './game'
import { fill } from '../i18n/fill'
import { samePages, verbatim } from './util/declare'
import { flag, hintKey, preferKeys } from './util/keys'
import { step } from './util/pad'

// 引擎调色板里按名字认下来的槽号:钉子色从 6 号起、边框借 1 号。升级 vendor
// 后要重新核对。
const COL_FRAME = 1
const COL_1 = 6

const LABELLED = 'Label colours with numbers'

// 全靠颜色分辨的唯一一个游戏,手机上钉子还小:把上游默认的「不标数字」翻过来。
// 数字同时落在棋盘的钉子和键区的色钉上(下面 swatch 的 label 读的是同一个真值)。
const NUMBERED = { 'show-labels': 'true' } as const

const fixed = (
  id: string,
  slot: Slot,
  glyph: 'lock' | 'clear' | 'done',
  saysOf: 'lock' | 'clear' | 'done',
  livesWhen: (labels: { enter: string; space: string }) => boolean,
  sends: string,
): ArrowKey<null> => ({
  id,
  slot,
  face: (view) => ({
    art: { glyph },
    says: view.words.keys[saysOf],
    tip: true,
    dead: !livesWhen(view.labels),
  }),
  press: (board) => board.send(sends),
})

const guess: Game = {
  id: 'guess',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [16, 17] },
  pages: samePages('guess'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: true, defaults: NUMBERED },
  keypad: ({ params, prefs }) => {
    const m = /^c(\d+)p(\d+)g\d+/.exec(params)
    if (!m) return null
    const n = +m[1]
    if (n < 2 || n > 10 || +m[2] < 1) return null
    const labelled = flag(prefs, LABELLED)
    return [
      ...Array.from({ length: n }, (_, i): Key<null> => {
        const fromTop = i <= (n - 1) / 2
        const home = fromTop ? 'ArrowUp' : 'ArrowDown'
        const walk = fromTop ? 'ArrowDown' : 'ArrowUp'
        const at = fromTop ? i : n - 1 - i
        return {
          group: 'pick',
          face: (view) => ({
            art: {
              swatch: {
                fill: COL_1 + i,
                edge: COL_FRAME,
                ...(labelled ? { label: String((i + 1) % 10) } : {}),
              },
            },
            says: fill(view.words.keys.peg, { n: i + 1 }),
            dead: view.labels.enter !== 'Place',
          }),
          button: 0,
          press: (board) => {
            for (let k = 0; k < n; k++) board.send(home)
            for (let k = 0; k < at; k++) board.send(walk)
            // 顶完再问一次标签:上下只动调色板光标,钉子光标没动,答案照样准。
            // 光标要是停在「看结果」位,这一下 Enter 就是交卷了——那时什么都不发。
            if (board.view().labels.enter === 'Place') board.send('\r')
          },
        }
      }),
      hintKey(),
      ...preferKeys(prefs, [{ kind: 'flag', label: LABELLED, glyph: 'numberPeg' }]),
    ]
  },
  arrows: {
    keys: [
      step('left', 1),
      step('right', 3),
      fixed('hold', 4, 'lock', 'lock', (l) => l.space === 'Hold', ' '),
      fixed('erase', 5, 'clear', 'clear', (l) => l.enter === 'Place', '\b'),
      fixed('submit', 6, 'done', 'done', (l) => l.enter === 'Submit', '\r'),
    ],
  },
  observe: still,
}

export default guess
