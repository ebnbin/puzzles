import { useReducer } from 'react'
import type { DialogControl } from './engine/types'

export default function ConfigFields({
  controls,
  autoFocus = false,
  onCommit,
}: {
  controls: DialogControl[]
  autoFocus?: boolean
  onCommit?: () => void
}) {
  // controls 是与 C 共享的活对象,后端 accept 时直接从这些对象上读 value:
  // 编辑必须原地赋值 + 手动 redraw,拷进 React state 会让对话框永远提交初始值。
  const [, redraw] = useReducer((n: number) => n + 1, 0)

  return (
    <>
      {controls.map((control, i) => (
        <label key={i} className={`dialog-${control.kind}`}>
          {control.kind === 'boolean' ? (
            <>
              <input
                type="checkbox"
                checked={control.value}
                onChange={(e) => {
                  control.value = e.target.checked
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
      ))}
    </>
  )
}
