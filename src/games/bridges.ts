// Bridges:岛间架桥。上游 bridges.c。Space 标记岛屿完成;架桥、无桥是一次性上膛键。
import type { Game } from './game'
import { still } from './game'
import type { Custom } from './util/custom'
import { difficulty, height, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { hintKey, preferKeys } from './util/keys'
import { act, arm, cross } from './util/pad'

// g 键在棋盘上翻这条偏好(bridges.c:2589):volatile。
const HINTS: Prefer<'bridges'> = { kind: 'flag', kw: 'show-hints', glyph: 'maybeBridge' }

const SHOW_LANES = { 'show-hints': 'true' } as const

// validate_params bridges.c:811-826:宽高各 ≥ 3;其余三项是下拉框,取值即选项,校验永远过。
const custom: Custom<'bridges'> = {
  fields: [
    width(3),
    height(3),
    difficulty(['easy', 'medium', 'hard'], 'difficulty'),
    { kind: 'flag', key: 'allowloops', word: 'allowLoops' },
    { kind: 'scale', key: 'maxb', word: 'maxBridges' },
    { kind: 'scale', key: 'islands', word: 'islandPc' },
    { kind: 'scale', key: 'expansion', word: 'expansionPc' },
  ],
  rules: [],
}

const bridges: Game<'bridges'> = {
  id: 'bridges',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('bridges'),
  types: { menu: verbatim, custom },
  prefs: { panel: verbatim, volatile: true, defaults: SHOW_LANES },
  keypad: (deal) => [hintKey(), ...preferKeys(deal, [HINTS])],
  arrows: {
    keys: [
      ...cross(),
      act({ id: 'done', slot: 7, key: ' ', idle: { glyph: 'islandDone', word: 'islandDone' } }),
      arm({ id: 'bridge', slot: 8, glyph: 'bridge', word: 'buildBridge', mods: { ctrl: true } }),
      arm({ id: 'nobridge', slot: 9, glyph: 'noBridge', word: 'noBridge', mods: { shift: true } }),
    ],
  },
  observe: still,
}

export default bridges
