// 上方键区的通用构造器,和拉丁方家族的观察器。全部看不见游戏:数字有几个、
// 从哪起标、要不要角标,都由游戏文件说了算。
import type { DialogControl } from '../../engine/types'
import type { Board, Key, Observe, Stroke } from '../game'
import type { BoardReader } from './latin'
import { remaining } from './latin'

export const tap =
  <F>(stroke: Stroke) =>
  (board: Board<F>) =>
    board.send(stroke)

export type Counted = { left: Map<number, number> | null }

// 拉丁方家族的观察:每步之后重读一遍「每个数字还差几个」。只数已填的值,
// 铅笔标记不算——数字键的角标建立在这个区分上。
export const counting = (read: BoardReader): Observe<Counted> => ({
  init: { left: null },
  saves: true,
  next: (facts, saw) => ('moved' in saw ? { left: remaining(saw.moved, read) } : facts),
})

// 0-9 之后接 a-z:上游数字键的字符约定(solo 的 16 阶用 a-f)。
export const charButton = (shown: number) =>
  shown <= 9 ? '0'.charCodeAt(0) + shown : 'a'.charCodeAt(0) + shown - 10

// 字符与数值是两回事:unequal 超过 9 阶从 '0' 起标以保持一字宽,此时 '0' 键的
// value 是 1——键面显示前者、角标按后者计数。
export function digitKeys<F>(
  count: number,
  options: {
    startAtZero?: boolean
    left?: (facts: F, value: number) => number | undefined | null
  } = {},
): Key<F>[] {
  const first = options.startAtZero ? 0 : 1
  return Array.from({ length: count }, (_, i) => {
    const shown = first + i
    const button = charButton(shown)
    const label = String.fromCharCode(button)
    const value = i + 1
    const key: Key<F> = {
      group: 'entry',
      face: { art: { text: label } },
      button,
      press: tap(label),
    }
    const left = options.left
    if (left)
      key.count = (facts) => {
        const n = left(facts, value)
        return n !== undefined && n !== null && n > 0 ? n : null
      }
    return key
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

// 偏好控件的匹配。故意按 answers 列表逐项匹配、不按名字(keyword 过不了边界):
// 上游改名仍读对;答案增删换序时宁可漏配(回落默认脸)也不把 value 对到换过序的
// 表上。flag 是被迫按 label 匹配的唯一例外——boolean 没有答案可匹配。
export function preference(
  prefs: readonly DialogControl[],
  answers: readonly string[],
): number | null {
  for (const control of prefs)
    if (
      control.kind === 'choices' &&
      control.choices.length === answers.length &&
      control.choices.every((answer, i) => answer === answers[i])
    )
      return control.value
  return null
}

export function flag(prefs: readonly DialogControl[], label: string): boolean {
  for (const control of prefs)
    if (control.kind === 'boolean' && control.label === label) return control.value
  return false
}
