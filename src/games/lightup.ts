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

// Symmetry 下标(lightup.c:96):3 = 4-way mirror,4 = 4-way rotational。

// 难度 ≥ Tricky 时窄盘会让上游生成器回不来:盘子窄到 Easy 的推理就解完一切,
// 「低一档解不出来」那道门(1598)永远过不去,而爬黑格比例的兜底封顶在 90
// (1609),到顶之后原地无限重试。逐档实测在 docs/params.md。
const floor = (r: Read) => [2, 3, 4][r.pick('Difficulty')] ?? 2

const lightup: Game = {
  id: 'lightup',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [2, 3], paper: true },
  pages: samePages('lightup'),
  types: {
    menu: verbatim,
    params: [
      int('Width', (r) => range(Math.max(floor(r), r.pick('Symmetry') === 4 ? 3 : 2), CAP)),
      int('Height', (r) => {
        const symm = r.pick('Symmetry')
        const w = r.int('Width')
        if (symm === 4) return range(w, w)
        // 上游只禁 2×2 配 4-way(368):宽 2 时高得从 3 起。
        return range(Math.max(floor(r), symm === 3 && w === 2 ? 3 : 2), CAP)
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
