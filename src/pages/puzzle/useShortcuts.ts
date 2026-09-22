// 裸字母快捷键(n 新局、u 撤销、r 重做、q 退出,midend.c:1005-1032)。上游把它当成
// 每个游戏各自的一条偏好——midend 往每个游戏的偏好表头上塞一份(midend.c:2951),
// 于是四十份互不相干的副本。它管的是 midend 自己、不是某一局,逐游戏分开没有意义,
// 所以这里收成一个全局开关:开局压在每个游戏的偏好存档上面,面板里那一行撤掉。
// 默认开,跟上游(midend.c:242)。
import type { GameName } from '../../games/game'
import type { PrefKw } from '../../games/util/upstream'
import { makeFlag } from '../../store'

// 上游的 kw:拼强制值那一行,也用来把它那一行从偏好面板里撤掉。
export const SHORTCUTS_KW = 'one-key-shortcuts' satisfies PrefKw<GameName>

// 在引擎里一律关掉,这几个键改由 usePuzzleKeys 补发。原因只有一个:里头的 n 会
// 走到 midend_new_game(midend.c:1005),而发牌不能在主线程上跑。判据照抄上游的
// ——只有游戏本身没要这一按(key() 答 PKR_UNUSED)才算快捷键,所以 tents 那种
// 拿 N 当走子键的游戏行为不变。开关本身还是全局那一位,只是由我们执行。
export const SHORTCUTS_OFF = { [SHORTCUTS_KW]: 'false' } as const

export const [useShortcuts, setShortcuts] = makeFlag('puzzles.shortcuts', true)
