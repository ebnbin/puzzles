import { useReducer } from 'react'
import type { DialogControl } from './engine/types'

/**
 * The controls a back-end dialog is made of.
 *
 * The objects are shared with the C, which reads `value` off them when the
 * dialog is accepted, so an edit assigns in place and the redraw is by hand
 * rather than by copying into state.
 *
 * Two places show them: the modal dialog the back end asks for, and the
 * parameters that open inside the type sheet. They are the same controls
 * either way — the difference is only what surrounds them — so they are
 * understood in one place.
 *
 * Every label here comes out of the compiled back end and is in English
 * whatever the reader has chosen; nothing in this file is ours to translate.
 */
export default function ConfigFields({
  controls,
  autoFocus = false,
}: {
  controls: DialogControl[]
  /** Whether the first field should take focus when it appears. */
  autoFocus?: boolean
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
              />
            </>
          )}
        </label>
      ))}
    </>
  )
}
