// Flood:同色泛滥全盘。上游 flood.c。current_key_label 不查可见性,光标由宿主
// 镜像(只有方向键唤醒)。Advance 重放求解器下一步,按过求解才出现(第二层);
// 它不在光标那儿干活(offCursor),镜像光标睡着也不灭,判层也不看光标。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { act, cross, layerByWords } from './util/pad'

const WORDS = ['Fill', 'Advance']

const flood: Game = {
  id: 'flood',
  upstream: {
    labels: 'live',
    cursor: {
      kind: 'mirrored',
      wakes: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    },
  },
  touch: { hold: 'right' },
  dark: { relief: [[12, 13]] },
  pages: samePages('flood'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    layer: layerByWords(WORDS, ['Advance']),
    keys: [
      ...cross(),
      act({
        id: 'fill',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'floodFill', word: 'floodFill' },
        words: WORDS,
        faces: { Fill: { glyph: 'floodFill', word: 'floodFill' } },
      }),
      act({
        id: 'advance',
        slot: 6,
        key: ' ',
        layer: 2,
        offCursor: true,
        idle: { glyph: 'advance', word: 'advance' },
        words: WORDS,
        faces: { Advance: { glyph: 'advance', word: 'advance' } },
      }),
    ],
  },
  observe: still,
}

export default flood
