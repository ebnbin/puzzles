import { useReducer } from 'react'
import ParamField, { tableOf } from './ParamField'
import type { DialogControl } from '../../engine/types'
import type { Param } from '../../games/util/params'
import { reader, settle } from '../../games/util/params'

export default function ConfigFields({
  controls,
  params,
  autoFocus = false,
  onCommit,
}: {
  controls: DialogControl[]
  // 给了范围模型(自定义参数那条路)的 string 控件画成滑块;每次落定先把所有
  // 数字参数夹进各自的表再提交,提交出去的组合必是上游放行的。
  params?: readonly Param[]
  autoFocus?: boolean
  onCommit?: () => void
}) {
  // controls 是与 C 共享的活对象,后端 accept 时直接从这些对象上读 value:
  // 编辑必须原地赋值 + 手动 redraw,拷进 React state 会让对话框永远提交初始值。
  const [, redraw] = useReducer((n: number) => n + 1, 0)

  const commit = () => {
    if (params) settle(params, controls)
    redraw()
    onCommit?.()
  }
  const read = params ? reader(controls) : null

  return (
    <>
      {controls.map((control, i) => {
        if (control.kind === 'boolean')
          return (
            <label key={i} className="dialog-boolean">
              <input
                type="checkbox"
                checked={control.value}
                onChange={(e) => {
                  control.value = e.target.checked
                  commit()
                }}
              />
              {control.label}
            </label>
          )
        if (control.kind === 'choices')
          return (
            <label key={i} className="dialog-choices">
              {control.label}
              <select
                value={control.value}
                onChange={(e) => {
                  control.value = Number(e.target.value)
                  commit()
                }}
              >
                {control.choices.map((choice, index) => (
                  <option key={index} value={index}>
                    {choice}
                  </option>
                ))}
              </select>
            </label>
          )
        const param = params?.find((p) => p.label === control.label)
        if (param && read && tableOf(param, read).length > 0)
          return <ParamField key={i} control={control} param={param} read={read} onCommit={commit} />
        return (
          <label key={i} className="dialog-string">
            {control.label}
            {/* text 只在落定时(blur/Enter)commit,不在 onChange:宽度从 5 改到
                12 的路上会经过 1,没人想要 1;checkbox/select 每次 change 即落定。 */}
            <input
              type="text"
              autoFocus={autoFocus && i === 0}
              value={control.value}
              onChange={(e) => {
                control.value = e.target.value
                redraw()
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                commit()
              }}
            />
          </label>
        )
      })}
    </>
  )
}
