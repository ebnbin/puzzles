// Light Up:放灯照亮全盘。上游 lightup.c。放灯、打叉是上游自己的绝对键;
// 对方的记号上一按替换(先发对方的键擦掉再落自己)。第二下必然落得下:能挡它
// 的只有黑格,而黑格上邻居一个字不报。黑格上两个一起灰。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { preferKeys } from './util/keys'
import { act, cross } from './util/pad'

const WORDS = ['Light', 'Mark', 'Clear']

const LIT_BLOBS: Prefer = {
  kind: 'flag',
  label: 'Draw non-light marks even when lit',
  glyph: 'litBlob',
}

const lightup: Game = {
  id: 'lightup',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: { keep: [2, 3], paper: true },
  pages: samePages('lightup'),
  types: { menu: verbatim },
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
