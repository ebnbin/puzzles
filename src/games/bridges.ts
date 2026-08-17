// Bridges:岛间架桥。上游 bridges.c。Space 标记岛屿完成;架桥/无桥是一次性
// 上膛键(下一次方向键带 Ctrl/Shift 直接连;上游在移动失败时不清 dragging,
// 所以走成才卸膛——由 walk 里的存档对比判定)。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { hintKey } from './util/keys'
import { act, arm, cross } from './util/pad'

const bridges: Game = {
  id: 'bridges',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('bridges'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [hintKey()],
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
