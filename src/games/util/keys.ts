// 上方键区的通用构造器,和拉丁方家族的观察器。全部看不见游戏:数字有几个、
// 从哪起标、要不要角标,都由游戏文件说了算。
import type { DialogControl } from '../../engine/types'
import type { Board, Key, Observe, Stroke } from '../game'
import type { BoardReader } from './latin'
import { clearMarks, fillMarks, placeSingles, remaining } from './latin'
import { loadExtended } from './save'

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
    const button =
      shown <= 9 ? '0'.charCodeAt(0) + shown : 'a'.charCodeAt(0) + shown - 10
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

// M 铺一套完整候选(上游自己的键),加三个走存档门的标记键:留下仍可能的、
// 摆上唯一解、清空全部。算法在 util/latin.ts,读盘器由游戏文件交进来。
export function markKeys<F>(read: BoardReader): Key<F>[] {
  const action =
    (fn: (save: string, read: BoardReader) => string | null) => (board: Board<F>) =>
      board.gate((g) => {
        const next = fn(g.read(), read)
        if (next) loadExtended(g, next)
      })
  return [
    {
      group: 'assist',
      face: { art: { glyph: 'marks' } },
      button: 'M'.charCodeAt(0),
      press: tap('M'),
    },
    { group: 'assist', face: { art: { glyph: 'possible' } }, button: 0, press: action(fillMarks) },
    { group: 'assist', face: { art: { glyph: 'single' } }, button: 0, press: action(placeSingles) },
    { group: 'assist', face: { art: { glyph: 'blank' } }, button: 0, press: action(clearMarks) },
  ]
}

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
