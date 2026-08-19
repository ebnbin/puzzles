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

// 上游 get_prefs 里的一条偏好,和它在键面上的样子。两种,认法不同:
//   flag  布尔,按英文 label 认——emcc 只把 name 交给 JS,kw 到不了这一侧。
//   cycle 多选一,按答案表逐项认(同下面的 preference:上游改名仍读对);一按走
//         下一格、走到头绕回。每个答案一张脸,长度必须和答案表一样。
export type Prefer =
  | { kind: 'flag'; label: string; glyph: IconName }
  | { kind: 'cycle'; answers: readonly string[]; glyphs: readonly IconName[] }

// solo / keen / towers / unequal / undead 五家共用同一条,字面一模一样(各 .c 的
// get_prefs);字面是唯一的钥匙,改这个串等于把五个游戏的键一起摘掉。
export const PENCIL_HIGHLIGHT: Prefer = {
  kind: 'flag',
  label: 'Keep mouse highlight after changing a pencil mark',
  glyph: 'pencilHold',
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

const findAt = (prefs: readonly DialogControl[], want: Prefer) =>
  prefs.findIndex((c) =>
    want.kind === 'flag'
      ? c.kind === 'boolean' && c.label === want.label
      : c.kind === 'choices' && sameList(c.choices, want.answers),
  )

// 上游的偏好摆成第六类的键:脸读当前值,按一下翻转或走下一格,再写回。
// 次序不听调用方的,按上游 get_prefs 报出来的先后排——键区上的顺序和偏好面板里
// 的顺序永远一致(同宿主排六类:顺序是结构,不是各游戏手写的约定)。
// 认不出的那条一个键都不发:上游改了名是「键消失」,不是「键失灵」。
export function preferKeys<F>(
  prefs: readonly DialogControl[],
  wanted: readonly Prefer[],
): Key<F>[] {
  return wanted
    .map((want) => ({ want, at: findAt(prefs, want) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ want, at }): Key<F> =>
      want.kind === 'flag'
        ? {
            group: 'prefer',
            fronts: at,
            // on 管填充色,held 管 aria-pressed:开关键两样都要,不然读屏软件
            // 两个状态听起来一模一样(PuzzleActions 早就是这个分工)。
            face: (view) => {
              const on = flag(view.prefs, want.label)
              return { art: { glyph: want.glyph }, on, held: on }
            },
            press: (board) =>
              board.prefer((controls) => {
                const found = controls[findAt(controls, want)]
                if (found?.kind !== 'boolean') return false
                found.value = !found.value
                return true
              }),
          }
        : {
            group: 'prefer',
            fronts: at,
            // 多选一没有「开」这一说,每一格都同样正当:状态全由脸说,不点亮。
            // 脸画的是「现在是哪一格」,不是「按下去会变成什么」(判据三)。
            face: (view) => ({
              art: { glyph: want.glyphs[preference(view.prefs, want.answers) ?? 0] },
            }),
            press: (board) =>
              board.prefer((controls) => {
                const found = controls[findAt(controls, want)]
                if (found?.kind !== 'choices') return false
                found.value = (found.value + 1) % want.answers.length
                return true
              }),
          },
    )
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
