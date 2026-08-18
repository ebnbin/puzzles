// 上方键区的通用构造器。全部看不见游戏:数字有几个、从哪起标,都由游戏文件说了算。
import type { DialogControl } from '../../engine/types'
import type { IconName } from '../../ui/Icon'
import type { Board, Key, Stroke } from '../game'

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

// 上游的一条布尔偏好摆成第六类的一个键:脸读当前值,按一下翻转、写回。
// 认不出这条偏好就一个键都不发——上游改了名是「键消失」,不是「键失灵」。
export function preferKey<F>(
  prefs: readonly DialogControl[],
  label: string,
  glyph: IconName,
): Key<F>[] {
  if (!prefs.some((c) => c.kind === 'boolean' && c.label === label)) return []
  return [
    {
      group: 'prefer',
      face: (view) => ({ art: { glyph }, on: flag(view.prefs, label) }),
      press: (board) =>
        board.prefer((controls) => {
          const found = controls.find((c) => c.kind === 'boolean' && c.label === label)
          if (found?.kind !== 'boolean') return false
          found.value = !found.value
          return true
        }),
    },
  ]
}

// solo / keen / towers / unequal / undead 五家共用同一条,字面一模一样(各 .c 的
// get_prefs);字面是唯一的钥匙,改这个串等于把五个游戏的键一起摘掉。
const PENCIL_HIGHLIGHT = 'Keep mouse highlight after changing a pencil mark'

export const pencilKey = <F>(prefs: readonly DialogControl[]): Key<F>[] =>
  preferKey(prefs, PENCIL_HIGHLIGHT, 'pencilHold')

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
