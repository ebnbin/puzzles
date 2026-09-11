// Light Up:放灯照亮全盘。上游 lightup.c。放灯、打叉是上游自己的绝对键;
// 对方的记号上一按替换(先发对方的键擦掉再落自己)。第二下必然落得下:能挡它
// 的只有黑格,而黑格上邻居一个字不报。黑格上两个一起灰。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'
import type { Read } from './util/params'
import { CAP, int, range } from './util/params'

const WORDS = ['Light', 'Mark', 'Clear']

const LIT_BLOBS: Prefer = {
  kind: 'flag',
  label: 'Draw non-light marks even when lit',
  glyph: 'litBlob',
}

// 尺寸下限:行 = Symmetry 下标(lightup.c:96),列 = 难度。盘子一窄,Easy 的推理就
// 解完一切,「低一档解不出来」那道门(1598)永远过不去,而爬黑格比例的兜底封顶在 90
// (1609),到顶就原地无限重试;对称砍掉大半可选黑格布局,那道门更难过,所以四种对称
// 都比 None 高一格。逐格种子数在 docs/params.md。
const FLOOR = [
  [2, 3, 4], // None
  [2, 4, 5], // 2-way mirror
  [2, 4, 5], // 2-way rotational
  [3, 4, 5], // 4-way mirror
  [3, 4, 5], // 4-way rotational
]
const floor = (r: Read) => FLOOR[r.pick('Symmetry')]?.[r.pick('Difficulty')] ?? 2

const lightup: Game = {
  id: 'lightup',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [2, 3], paper: true },
  pages: samePages('lightup'),
  types: {
    menu: verbatim,
    params: [
      int('Width', (r) => range(floor(r), CAP)),
      int('Height', (r) => {
        // 4-way rotational 只能方盘(364-367)。
        if (r.pick('Symmetry') === 4) return range(r.int('Width'), r.int('Width'))
        return range(floor(r), CAP)
      }),
      // 上游给到 100,这里封到 90:91 起 blackpc 不再爬升(1609),生成不出来就
      // 原地死转;100 更是整盘全黑、一盏灯都放不下。
      int('%age of black squares', () => range(5, 90)),
    ],
  },
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
