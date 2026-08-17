// Filling:填数分块。上游 filling.c。数字和 ⌫ 是 request_keys 报的
// (filling.c);十字这边一个键都没有:上游三个选区键全不给——不用选区照样玩,
// Space 反而多一次按压;「取消选区」的传感器要靠读没分配的内存,不能用。
import type { Game } from './game'
import { still } from './game'
import { samePages, verbatim } from './util/declare'
import { clearKey, digitKeys } from './util/keys'
import { cross } from './util/pad'

const filling: Game = {
  id: 'filling',
  upstream: { labels: 'live', cursor: { kind: 'reported' } },
  touch: { hold: 'right' },
  dark: {},
  pages: samePages('filling'),
  types: { menu: verbatim },
  prefs: { panel: verbatim, volatile: false },
  keypad: () => [...digitKeys(9), clearKey()],
  arrows: { keys: cross() },
  observe: still,
}

export default filling
