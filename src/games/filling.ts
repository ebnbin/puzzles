// Filling:填数分块。上游 filling.c。数字和 ⌫ 是 request_keys 报的;上游的三个选区键都不给。
import type { Game } from './game'
import { still } from './game'
import { height, width } from './util/custom'
import { samePages, verbatim } from './util/declare'
import { clearKey, digitKeys } from './util/keys'
import { cross } from './util/pad'

const filling: Game<'filling'> = {
  id: 'filling',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('filling'),
  // validate_params filling.c:186-192:宽高各 ≥ 1。
  types: { menu: verbatim, custom: { fields: [width(1), height(1)], rules: [] } },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [...digitKeys(9), clearKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default filling
