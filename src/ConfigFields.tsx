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
