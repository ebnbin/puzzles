// Flood:同色泛滥全盘。上游 flood.c。current_key_label 不查可见性,光标由宿主镜像,只有方向键
// 唤醒。Advance 重放求解器下一步,按过求解才出现(第二层),不看光标(offCursor)。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { height, rule, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { act, cross, layerByWords } from './util/pad'

// validate_params flood.c:218-231:面积 ≥ 2,宽高各 ≥ 1,颜色 3..10,额外步数 ≥ 0;额外步数
// 上游没有上限,取 100。
const custom: Custom<'flood'> = {
  fields: [
    width(1),
    height(1),
    { kind: 'int', key: 'colours', word: 'colours', min: 3, max: 10, role: 'count' },
    { kind: 'int', key: 'leniency', word: 'extraMoves', min: 0, max: 100, role: 'count' },
  ],
  rules: [rule('flood.c:220', ['w', 'h'], (v) => v.w * v.h < 2)],
}

const flood: Game<'flood'> = {
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
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [],
  arrows: {
    layer: layerByWords(['Advance']),
    keys: [
      ...cross(),
      act({
        id: 'fill',
        slot: 4,
        key: 'Enter',
        idle: { glyph: 'floodFill', word: 'floodFill' },
        faces: { Fill: { glyph: 'floodFill', word: 'floodFill' } },
      }),
      act({
        id: 'advance',
        slot: 6,
        key: ' ',
        layer: 2,
        offCursor: true,
        idle: { glyph: 'advance', word: 'advance' },
        faces: { Advance: { glyph: 'advance', word: 'advance' } },
      }),
    ],
  },
  observe: still,
}

export default flood
