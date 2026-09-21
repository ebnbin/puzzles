import { useMemo, useReducer } from 'react'
import type { DialogControl } from '../../engine/types'
import type { Custom, Field } from '../../games/util/custom'
import {
  bind,
  change,
  extent,
  neighbour,
  read,
  snap,
  unitOf,
  valueOf,
  write,
} from '../../games/util/custom'
import { PREF_LABELS, PREF_OPTIONS } from '../../games/util/prefs'
import { useStrings } from '../../i18n'
import type { Strings } from '../../i18n'
import Picker from '../../ui/Picker'
import Slider from '../../ui/Slider'

const word = (t: Strings, w: string): string => (t.config as Record<string, string>)[w] ?? w

// 没申报的控件(偏好)按上游原文查词条,查不到就原样显示英文。
const said = (t: Strings, table: Readonly<Record<string, string>>, text: string): string => {
  const w = table[text]
  return w === undefined ? text : word(t, w)
}

export default function ConfigFields({
  controls,
  declared,
  autoFocus = false,
  onCommit,
  onSettle,
}: {
  controls: DialogControl[]
  // 自定义参数的申报;给了且绑得上,数值画成 slider、枚举按申报画,值经联动机器修好
  // 再写回。没给(偏好、模态兜底)或绑不上就按控件种类画:布尔勾选、枚举分段、文本框。
  declared?: Custom
  autoFocus?: boolean
  onCommit?: () => void
  // 一次输入收尾了(勾选、选定、文本框按了 Enter):停靠面板拿它把焦点还给棋盘。
  // done = 这个控件的输入已经结束,不管是指针还是键盘都该离开它;缺省只在指针操作后还。
  onSettle?: (done?: boolean) => void
}) {
  // controls 是与 C 共享的活对象,后端 accept 时直接从这些对象上读 value:
  // 编辑必须原地赋值 + 手动 redraw,拷进 React state 会让对话框永远提交初始值。
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const t = useStrings()

  const bound = useMemo(() => (declared ? bind(declared, controls) : null), [declared, controls])
  const values = declared && bound ? read(bound, controls) : null

  const settled = () => {
    redraw()
    onCommit?.()
    onSettle?.()
  }

  // 改一个字段:联动机器以它为准修出整组合法的值,变了的字段一起写回活对象。修不好
  // 说明申报和上游脱节,这一步不生效。
  const apply = (key: string, next: number) => {
    if (!declared || !bound || !values) return
    const fixed = change(declared, values, key, next)
    if (!fixed) return console.warn(`custom params: no valid combination for ${key}=${next}`)
    write(bound, controls, values, fixed)
    settled()
  }

  const renderDeclared = (control: DialogControl, field: Field, i: number) => {
    if (!declared || !values) return null
    if (field.kind === 'flag') {
      return (
        <label key={i} className="dialog-boolean">
          <input
            type="checkbox"
            checked={values[field.key] !== 0}
            onChange={(e) => apply(field.key, e.target.checked ? 1 : 0)}
          />
          {word(t, field.word)}
        </label>
      )
    }
    if (field.kind === 'pick') {
      return (
        <Picker
          key={i}
          label={word(t, field.word)}
          options={field.options.map((w) => word(t, w))}
          value={values[field.key]}
          onChange={(index) => apply(field.key, index)}
        />
      )
    }
    const keys: readonly [string, string][] =
      field.kind === 'span'
        ? [
            [field.keys[0], word(t, field.words[0])],
            [field.keys[1], word(t, field.words[1])],
          ]
        : [[field.key, word(t, field.word)]]
    return keys.map(([key, label]) => {
      const { lo, hi } = extent(declared, values, key)
      const display = (unit: number) =>
        field.kind === 'scale' && control.kind === 'choices'
          ? control.choices[unit]
          : field.kind === 'int' && field.zero !== undefined && unit === 0
            ? word(t, field.zero)
            : String(valueOf(declared, key, unit)) + (field.kind === 'int' ? (field.suffix ?? '') : '')
      return (
        <Slider
          key={`${i}:${key}`}
          label={label}
          value={unitOf(declared, key, values[key])}
          min={lo}
          max={hi}
          display={display}
          onChange={(unit) => {
            const u = snap(declared, values, key, unit)
            if (u !== null && u !== unitOf(declared, key, values[key]))
              apply(key, valueOf(declared, key, u))
          }}
          onStep={(dir) => {
            const u = neighbour(declared, values, key, dir)
            if (u !== null) apply(key, valueOf(declared, key, u))
          }}
        />
      )
    })
  }

  return (
    <>
      {controls.map((control, i) => {
        const field = bound?.get(i)
        if (field) return renderDeclared(control, field, i)
        if (control.kind === 'boolean') {
          return (
            <label key={i} className="dialog-boolean">
              <input
                type="checkbox"
                checked={control.value}
                onChange={(e) => {
                  control.value = e.target.checked
                  settled()
                }}
              />
              {said(t, PREF_LABELS, control.label)}
            </label>
          )
        }
        if (control.kind === 'choices') {
          return (
            <Picker
              key={i}
              label={said(t, PREF_LABELS, control.label)}
              options={control.choices.map((choice) => said(t, PREF_OPTIONS, choice))}
              value={control.value}
              onChange={(index) => {
                control.value = index
                settled()
              }}
            />
          )
        }
        return (
          <label key={i} className="dialog-string">
            {control.label}
            {/* text 只在落定时(blur/Enter)commit,不在 onChange:宽度从 5 改到
                12 的路上会经过 1,没人想要 1;checkbox/picker 每次 change 即落定。 */}
            <input
              type="text"
              autoFocus={autoFocus && i === 0}
              value={control.value}
              onChange={(e) => {
                control.value = e.target.value
                redraw()
              }}
              onBlur={onCommit}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                onCommit?.()
                onSettle?.(true)
              }}
            />
          </label>
        )
      })}
    </>
  )
}
