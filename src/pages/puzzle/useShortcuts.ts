// 裸字母快捷键(n 新局、u 撤销、r 重做、q 退出,midend.c:1005-1032)。上游把它塞进每个游戏的偏好表
// (midend.c:2951),这里收成一个全局开关:开局压在每个游戏的偏好存档上面,面板里那一行撤掉。
// 默认开,跟上游(midend.c:242)。
import type { GameName } from '../../games/game'
import type { PrefKw } from '../../games/util/upstream'
import { makeFlag } from '../../store'

// 上游的 kw:拼强制值那一行,也用来把它那一行从偏好面板里撤掉。
export const SHORTCUTS_KW = 'one-key-shortcuts' satisfies PrefKw<GameName>

// 在引擎里一律关掉,这几个键改由 usePuzzleKeys 补发:里头的 n 会走到 midend_new_game
// (midend.c:1005),而发牌不能在主线程上跑。判据照抄上游,只有游戏本身没要这一按(key() 答
// PKR_UNUSED)才算快捷键。
export const SHORTCUTS_OFF = { [SHORTCUTS_KW]: 'false' } as const

export const [useShortcuts, setShortcuts] = makeFlag('puzzles.shortcuts', true)
