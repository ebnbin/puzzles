// Guess:猜色版 Mastermind。上游 guess.c。
// 一键选色是这里唯一自造的键:一按 = 上下把调色板光标顶到那个颜色 + Enter(move_cursor 夹边
// 不绕回,连按 ncolours 次「上」必到第一格),落完光标不动;数字键那条路(落色并前进)不用。
// 三个功能键和颜色钉的死活全由标签定:
//   光标在钉子上   Place / Hold   → 保留、删除、颜色钉亮,看结果灰
//   光标在看结果位 Submit / ""    → 只有看结果亮
//   解出来了       "" / ""        → 全灰
// ⌫ 在「看结果」位会读写 pegs[npegs](数组外,guess.c 没防这一支),置灰是唯一一道拦。
// l 键在棋盘上翻「数字标签」偏好:volatile。
import type { ArrowKey, Game, Key, Slot } from './game'
import { still } from './game'
import { fill } from '../i18n/fill'
import type { Custom } from './util/custom'
import { BOARD_MAX, rule } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { flag, hintKey, preferKeys } from './util/keys'
import { step } from './util/pad'

// 引擎调色板里按名字认下来的槽号:钉子色从 6 号起、边框借 1 号。升级 vendor
// 后要重新核对。
const COL_FRAME = 1
const COL_1 = 6

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

// validate_params guess.c:217-230,不看 full;钉数和猜测次数上游没有上限,各封 100。
const custom: Custom<'guess'> = {
  fields: [
    { kind: 'int', key: 'ncolours', word: 'colours', min: 2, max: 10, role: 'count' },
    { kind: 'int', key: 'npegs', word: 'pegs', min: 2, max: BOARD_MAX, role: 'count' },
    { kind: 'int', key: 'nguesses', word: 'guesses', min: 1, max: BOARD_MAX, role: 'count' },
    { kind: 'flag', key: 'allow_blank', word: 'allowBlank' },
    { kind: 'flag', key: 'allow_multiple', word: 'allowDup' },
  ],
  rules: [rule('guess.c:227', ['ncolours', 'npegs', 'allow_multiple'], (v) => !v.allow_multiple && v.ncolours < v.npegs)],
}

const guess: Game<'guess'> = {
  id: 'guess',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [16, 17] },
  pages: samePages('guess'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: true, defaults: NUMBERED },
  keypad: (deal) => {
    const { params, prefs } = deal
    const m = /^c(\d+)p(\d+)g\d+/.exec(params)
    if (!m) return null
    const n = +m[1]
    if (n < 2 || n > 10 || +m[2] < 1) return null
    const labelled = flag('guess', prefs, 'show-labels')
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
            // 顶完再问一次标签:光标在「看结果」位时 Enter 是交卷,不发。
            if (board.view().labels.enter === 'Place') board.send('\r')
          },
        }
      }),
      hintKey(),
      ...preferKeys(deal, [{ kind: 'flag', kw: 'show-labels', glyph: 'numberPeg' }]),
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
