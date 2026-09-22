// facts.ts(生成物)的类型与查询:申报里凡是「上游的东西」都从这里取类型,写错即 tsc
// 报错。绑定一律用上游自己的 id——偏好按 kw、选项按 optionKw、自定义参数按位置;
// 显示文案(label / 选项原文)只是翻译表的键,不参与绑定。查不到就 throw:上游钉死,
// 查不到只能是申报抄错。
import { facts } from '../facts'
import type { GameName } from '../game'

export type Facts = typeof facts

// 逐元素映射一个元组、保留长度。映射的源必须是裸类型参数,TS 才保留元组形态——直接写
// keyof Facts[G]['configure'] 会把 length、toString 也映射进去。
export type Each<T extends readonly unknown[], V> = { readonly [I in keyof T]: V }

export type Configure<G extends GameName> = Facts[G]['configure']

export type Pref<G extends GameName> = Facts[G]['prefs'][number]
export type PrefKw<G extends GameName> = Pref<G>['kw']
export type Choice<G extends GameName, K extends PrefKw<G>> = Extract<Pref<G>, { kw: K }>
export type OptionKws<G extends GameName, K extends PrefKw<G>> =
  Choice<G, K> extends { optionKws: infer O extends readonly string[] } ? O : never

// 全部游戏偏好的 label 与选项原文:翻译表按这两个联合类型声明,缺一条 tsc 就红。
export type PrefLabel = Facts[GameName]['prefs'][number]['label']
export type PrefOption = Extract<
  Facts[GameName]['prefs'][number],
  { options: readonly string[] }
>['options'][number]

export type KeyButton<G extends GameName> = Facts[G]['keys'][number]['button']

const prefsOf = (game: GameName) =>
  facts[game].prefs as readonly { kw: string; optionKws?: readonly string[] }[]

// 偏好在 midend_get_prefs() 整表里的下标。
export function prefAt<G extends GameName>(game: G, kw: PrefKw<G>): number {
  const at = prefsOf(game).findIndex((p) => p.kw === kw)
  if (at < 0) throw new Error(`${game}: no preference ${kw}`)
  return at
}

// 多选一偏好里某个选项的下标(C 侧 choices.selected 的值)。
export function optionAt<G extends GameName, K extends PrefKw<G>>(
  game: G,
  kw: K,
  option: OptionKws<G, K>[number],
): number {
  const found = prefsOf(game)[prefAt(game, kw)]
  const at = found.optionKws?.indexOf(option) ?? -1
  if (at < 0) throw new Error(`${game}: preference ${kw} has no option ${option}`)
  return at
}
