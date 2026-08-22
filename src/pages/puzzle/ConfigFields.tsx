import { useReducer } from 'react'
import type { DialogControl } from '../../engine/types'
import type { Field } from '../../games/game'
import { fieldAt, settle, snap, write } from '../../games/util/fields'

export default function ConfigFields({
  controls,
  fields,
  autoFocus = false,
  onCommit,
}: {
  controls: DialogControl[]
  // 申报过的格子画成 slider;偏好面板不传,整份保持原样。
  fields?: readonly Field[]
  autoFocus?: boolean
  onCommit?: () => void
}) {
  // controls 是与 C 共享的活对象,后端 accept 时直接从这些对象上读 value:
  // 编辑必须原地赋值 + 手动 redraw,拷进 React state 会让对话框永远提交初始值。
  const [, redraw] = useReducer((n: number) => n + 1, 0)

  // 拖动中只改值,不提交:一次提交就是生成一整局。改完顺手 settle——这一格动了
  // 别人的界可能跟着变(改宽度会挪高度的界),不收一遍就会拿非法值去提交。
  const slide = (control: DialogControl, field: Field, raw: number) => {
    write(control, snap(field.span(controls), raw), field.decimals)
    settle(fields, controls)
    redraw()
  }

  return (
    <>
      {controls.map((control, i) => {
        const field = fieldAt(fields, i, controls)
        if (field && control.kind === 'string') {
          const span = field.span(controls)
          // 存档带来的参数可能落在申报的界之外(game ID 那条路不受限),显示前先收进来。
          const now = Number(control.value)
          const at = snap(span, Number.isFinite(now) ? now : span.min)
          return (
            <label key={i} className="dialog-range">
              <span className="range-head">
                {control.label}
                <b>{field.percent ? `${Math.round(at * 100)}%` : at}</b>
              </span>
              <input
                type="range"
                min={span.min}
                max={span.max}
                step={span.step ?? 1}
                value={at}
                onChange={(e) => slide(control, field, Number(e.target.value))}
                // 松手才提交:拖动途中每一帧都提交等于每一帧生成一局。range 的值
                // 只会被指针或按键改,这两个事件就够了——**不能挂 onBlur**:碰第二个
                // slider 会先让第一个失焦,一提交就重开对话框、控件全换新,刚按下的
                // 那一下连着被抹掉(实测 cube:d2 拖到 5 之后把 d1 拖到 0,d1 弹回 4,
                // 而引擎凭空生成了一局)。文本框仍然要 onBlur,那条路不受影响。
                onPointerUp={onCommit}
                onPointerCancel={onCommit}
                onKeyUp={onCommit}
              />
            </label>
          )
        }
        return (
          <label key={i} className={`dialog-${control.kind}`}>
            {control.kind === 'boolean' ? (
              <>
                <input
                  type="checkbox"
                  checked={control.value}
                  onChange={(e) => {
                    control.value = e.target.checked
                    // 开关能改别人的界(net 的环绕+唯一解会挖掉宽高的 2)。
                    settle(fields, controls)
                    redraw()
                    onCommit?.()
                  }}
                />
                {control.label}
              </>
            ) : control.kind === 'choices' ? (
              <>
                {control.label}
                <select
                  value={control.value}
                  onChange={(e) => {
                    control.value = Number(e.target.value)
                    settle(fields, controls)
                    redraw()
                    onCommit?.()
                  }}
                >
                  {control.choices.map((choice, index) => (
                    <option key={index} value={index}>
                      {choice}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
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
                  onBlur={onCommit}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    onCommit?.()
                  }}
                />
              </>
            )}
          </label>
        )
      })}
    </>
  )
}
