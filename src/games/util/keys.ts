// 上方键区的通用构造器。全部看不见游戏:数字有几个、从哪起标,都由游戏文件说了算。
import type { DialogControl } from '../../engine/types'
import type { IconName } from '../../ui/Icon'
import type { Board, GameName, Key, Stroke } from '../game'
import type { ChoiceKw, Each, FlagKw, OptionKws, PrefKw } from './upstream'
import { prefAt, prefFact } from './upstream'

export const tap =
  <F>(stroke: Stroke) =>
  (board: Board<F>) =>
    board.send(stroke)

// 参数串开头的那个数,就是这一局的阶数;超出 1..36 的当认不出。
export function leadingNumber(text: string | undefined): number | null {
  const found = text ? /^(\d+)/.exec(text) : null
  if (!found) return null
  const n = Number(found[1])
  return n >= 1 && n <= 36 ? n : null
}

// 0-9 之后接 a-z:上游数字键的字符约定(solo 的 16 阶用 a-f)。
export const charButton = (shown: number) =>
  shown <= 9 ? '0'.charCodeAt(0) + shown : 'a'.charCodeAt(0) + shown - 10

// unequal 超过 9 阶从 '0' 起标,为的是键面保持一字宽。
export function digitKeys<F>(
  count: number,
  options: { startAtZero?: boolean } = {},
): Key<F>[] {
  const first = options.startAtZero ? 0 : 1
  return Array.from({ length: count }, (_, i) => {
    const button = charButton(first + i)
    const label = String.fromCharCode(button)
    return {
      group: 'entry',
      face: { art: { text: label } },
      button,
      press: tap(label),
    }
  })
}

export const clearKey = <F>(): Key<F> => ({
  group: 'entry',
  face: { art: { glyph: 'clear' } },
  button: 8,
  press: tap('\b'),
})

export const hintKey = <F>(): Key<F> => ({
  group: 'assist',
  face: { art: { glyph: 'hint' } },
  button: 'H'.charCodeAt(0),
  press: tap('H'),
})

export const jumbleKey = <F>(): Key<F> => ({
  group: 'assist',
  face: { art: { glyph: 'jumble' } },
  button: 'J'.charCodeAt(0),
  press: tap('J'),
})

// M 铺一套完整候选,是上游自己的键。
export const marksKey = <F>(): Key<F> => ({
  group: 'assist',
  face: { art: { glyph: 'marks' } },
  button: 'M'.charCodeAt(0),
  press: tap('M'),
})

// 上游 get_prefs 里的一条偏好,和它在键面上的样子。按 kw 认——偏好存档本来就是 kw
// 格式,下标从 facts 查;多选一每个选项一张脸,张数由 facts 的选项数定。
export type Prefer<G extends GameName = GameName> = {
  [K in PrefKw<G>]: [OptionKws<G, K>] extends [never]
    ? { kind: 'flag'; kw: K; glyph: IconName }
    : { kind: 'cycle'; kw: K; glyphs: Each<OptionKws<G, K>, IconName> }
}[PrefKw<G>]

type PreferShape =
  | { kind: 'flag'; kw: string; glyph: IconName }
  | { kind: 'cycle'; kw: string; glyphs: readonly IconName[] }

// solo / keen / towers / unequal / undead 五家共用同一条(各 .c 的 get_prefs 同一个 kw)。
export const PENCIL_HIGHLIGHT = {
  kind: 'flag',
  kw: 'pencil-keep-highlight',
  glyph: 'pencilHold',
} as const

// 偏好表在开局借到之前是空的(useBoard 的初值),那一刻按上游默认答;借到之后是
// midend_get_prefs() 的整表,下标一定在、种类一定对,不对就是申报错了。
export function flag<G extends GameName>(
  game: G,
  prefs: readonly DialogControl[],
  kw: FlagKw<G>,
): boolean {
  if (!prefs.length) return prefFact(game, kw).initial === true
  const control = prefs[prefAt(game, kw)]
  if (control?.kind !== 'boolean') throw new Error(`${game}: preference ${kw} is not boolean`)
  return control.value
}

export function preference<G extends GameName>(
  game: G,
  prefs: readonly DialogControl[],
  kw: ChoiceKw<G>,
): number {
  if (!prefs.length) return Number(prefFact(game, kw).initial)
  const control = prefs[prefAt(game, kw)]
  if (control?.kind !== 'choices') throw new Error(`${game}: preference ${kw} is not choices`)
  return control.value
}

// 上游的偏好摆成第六类的键:脸读当前值,按一下翻转或走下一格,再写回。
// 次序不听调用方的,按上游 get_prefs 报出来的先后排——键区上的顺序和偏好面板里
// 的顺序永远一致(同宿主排六类:顺序是结构,不是各游戏手写的约定)。
export function preferKeys<G extends GameName>(
  deal: { game: G; prefs: readonly DialogControl[] },
  wanted: readonly Prefer<G>[],
): Key<unknown>[] {
  const { game, prefs } = deal
  if (!prefs.length) return []
  return (wanted as readonly PreferShape[])
    .map((want) => ({ want, kw: want.kw as PrefKw<G>, at: prefAt(game, want.kw as PrefKw<G>) }))
    .sort((a, b) => a.at - b.at)
    .map(({ want, kw, at }): Key<unknown> => {
      const control = prefs[at]
      if (want.kind === 'flag') {
        if (control?.kind !== 'boolean')
          throw new Error(`${game}: preference ${kw} is not boolean`)
        return {
          group: 'prefer',
          fronts: at,
          // on 管填充色,held 管 aria-pressed:开关键两样都要,不然读屏软件
          // 两个状态听起来一模一样(PuzzleActions 早就是这个分工)。
          face: (view) => {
            const on = flag(game, view.prefs, kw as FlagKw<G>)
            return { art: { glyph: want.glyph }, on, held: on }
          },
          press: (board) =>
            board.prefer((controls) => {
              const found = controls[at]
              if (found?.kind !== 'boolean')
                throw new Error(`${game}: preference ${kw} is not boolean`)
              found.value = !found.value
              return true
            }),
        }
      }
      if (control?.kind !== 'choices')
        throw new Error(`${game}: preference ${kw} is not choices`)
      if (control.choices.length !== want.glyphs.length)
        throw new Error(
          `${game}: preference ${kw} has ${control.choices.length} options, ${want.glyphs.length} faces`,
        )
      return {
        group: 'prefer',
        fronts: at,
        // 多选一没有「开」这一说,每一格都同样正当:状态全由脸说,不点亮。
        // 脸画的是「现在是哪一格」,不是「按下去会变成什么」(判据三)。
        face: (view) => ({
          art: { glyph: want.glyphs[preference(game, view.prefs, kw as ChoiceKw<G>)] },
        }),
        press: (board) =>
          board.prefer((controls) => {
            const found = controls[at]
            if (found?.kind !== 'choices')
              throw new Error(`${game}: preference ${kw} is not choices`)
            found.value = (found.value + 1) % want.glyphs.length
            return true
          }),
      }
    })
}
