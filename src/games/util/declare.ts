// 申报组的常用取值。verbatim 是「不加工」的名字:类型菜单、偏好面板今天全部原样。
import type { GameName, Pages } from '../game'

export const verbatim = <T>(x: T): T => x

// 手册章节、帮助条目、示意图今天全部与游戏同名;字段仍逐游戏申报,留复写口。
export const samePages = (id: GameName): Pages => ({ manual: id, help: id, howto: id })
