// Bridges:岛间架桥。上游 bridges.c。Space 标记岛屿完成;架桥/无桥是一次性
// 上膛键(下一次方向键带 Ctrl/Shift 直接连;上游在移动失败时不清 dragging,
// 所以走成才卸膛——由 walk 里的存档对比判定)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import type { Prefer } from './util/keys'
import { hintKey, preferKeys } from './util/keys'
import { act, arm, cross } from './util/pad'

// 'g'/'G' 当场翻这条偏好(bridges.c:2589),所以偏好是 volatile 的:按完键要重读。
const HINTS: Prefer = {
  kind: 'flag',
  label: 'Show possible bridge locations',
  glyph: 'maybeBridge',
}

// 上游默认不画候选桥位(bridges.c:2145),这边翻过来:between_island 是纯几何——
// 只问「这两个岛在同一行列上、中间没别的岛」,不看数字、不看已架的桥,画出来的就是
// 这一局所有合法桥位。手指要在岛之间拖,先看得见能拖到哪。
const SHOW_LANES = { 'show-hints': 'true' } as const

const bridges: Game = {
  id: 'bridges',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('bridges'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: true, defaults: SHOW_LANES },
  keypad: ({ prefs }) => [hintKey(), ...preferKeys(prefs, [HINTS])],
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
