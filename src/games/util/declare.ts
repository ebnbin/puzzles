// 申报组的常用取值。verbatim 是「不加工」的名字:类型菜单、偏好面板今天全部原样。
import type { GameName, Pages } from '../game'

export const verbatim = <T>(x: T): T => x

// 手册章节、帮助条目、示意图今天全部与游戏同名;字段仍逐游戏申报,留复写口。
export const samePages = (id: GameName): Pages => ({ manual: id, help: id, howto: id })

// 上游默认落一个铅笔标记就撤掉高亮(solo.c:4586),触摸上等于每落一笔重新长按
// 一次格子;五个数独族游戏统一把默认翻过来。按 kw 写:偏好存档本来就是 kw 格式。
export const keepPencil = { 'pencil-keep-highlight': 'true' } as const
