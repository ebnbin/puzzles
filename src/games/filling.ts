// Filling:填数分块。上游 filling.c。数字和 ⌫ 是 request_keys 报的
// (filling.c);十字这边一个键都没有:上游三个选区键全不给——不用选区照样玩,
// Space 反而多一次按压;「取消选区」的传感器要靠读没分配的内存,不能用。
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
  // validate_params filling.c:186-192:宽高各 ≥ 1;INT_MAX 那条在 100 以内碰不到。
  types: { menu: verbatim, custom: { fields: [width(1), height(1)], rules: [] } },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [...digitKeys(9), clearKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default filling
