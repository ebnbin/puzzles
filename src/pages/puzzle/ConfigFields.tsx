import { useId, useReducer } from 'react'
import ParamField, { OrdinalField, tableOf } from './ParamField'
import type { ChoicesControl, RangeParam } from './ParamField'
import type { DialogControl } from '../../engine/types'
import type { Param } from '../../games/util/params'
import { reader, settle } from '../../games/util/params'

// 自定义面板里的 choices 控件:下拉换成分段按钮,选项全部可见、一点即换。写回的仍是
// 选项下标,和 select 交回去的一样;radio 的键盘方向键也是一按一落定,和 select 一致。
function ChoiceGroup({ control, onCommit }: { control: ChoicesControl; onCommit: () => void }) {
  const id = useId()
  return (
    <div className="dialog-choice">
      <label className="dialog-param-head" id={id}>
        {control.label}
      </label>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {control.choices.map((choice, index) => (
          <label key={index} data-selected={control.value === index}>
            <input
              type="radio"
              name={id}
              value={index}
              checked={control.value === index}
              onChange={() => {
                control.value = index
                onCommit()
              }}
            />
            {choice}
          </label>
        ))}
      </div>
    </div>
  )
}

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

  // moved 是刚被用户动的控件:settle 不夹它,让其余的参数按窗口让。
  const commit = (moved: string) => {
    if (params) settle(params, controls, moved)
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
                  commit(control.label)
                }}
              />
              {control.label}
            </label>
          )
        if (control.kind === 'choices') {
          // 给了范围模型(自定义参数那条路)才换画法;偏好面板与模态对话框仍是下拉。
          if (params) {
            const slide = params.some((p) => p.kind === 'ordinal' && p.label === control.label)
            const done = () => commit(control.label)
            return slide ? (
              <OrdinalField key={i} control={control} onCommit={done} />
            ) : (
              <ChoiceGroup key={i} control={control} onCommit={done} />
            )
          }
          return (
            <label key={i} className="dialog-choices">
              {control.label}
              <select
                value={control.value}
                onChange={(e) => {
                  control.value = Number(e.target.value)
                  commit(control.label)
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
        }
        const param = params?.find(
          (p): p is RangeParam => p.kind !== 'ordinal' && p.label === control.label,
        )
        if (param && read && tableOf(param, read).length > 0)
          return (
            <ParamField
              key={i}
              control={control}
              param={param}
              read={read}
              onCommit={() => commit(control.label)}
            />
          )
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
              onBlur={() => commit(control.label)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                commit(control.label)
              }}
            />
          </label>
        )
      })}
    </>
  )
}
