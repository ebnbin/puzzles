import { useReducer } from 'react'
import type { DialogSpec } from './engine/types'

/**
 * The configuration and game-id dialogs the back end asks for.
 *
 * The control objects are shared with the C side, which reads `value` off
 * them when the dialog is accepted, so edits assign in place and we re-render
 * by hand rather than copying into state.
 */
export default function PuzzleDialog({
  spec,
  onOk,
  onCancel,
}: {
  spec: DialogSpec
  onOk: () => void
  onCancel: () => void
}) {
  const [, redraw] = useReducer((n: number) => n + 1, 0)

  return (
    <div className="dialog-dimmer" onClick={onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={spec.title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onOk()
        }}
      >
        <h2>{spec.title}</h2>

        {spec.controls.map((control, i) => (
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
                  autoFocus={i === 0}
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

        {/* Cancel first, accept last: the accepting button is the one that
            should sit where a thumb lands, and where the eye stops reading. */}
        <div className="dialog-buttons">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">OK</button>
        </div>
      </form>
    </div>
  )
}
