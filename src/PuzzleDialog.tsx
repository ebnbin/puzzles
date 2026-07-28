import { useReducer } from 'react'
import Icon from './Icon'
import type { DialogSpec } from './engine/types'
import { useShare } from './useShare'

/** The permalink encoding upstream uses, so the links are the same ones. */
function permalink(value: string) {
  return new URL(
    '#' + encodeURI(value).replace(/#/g, '%23'),
    window.location.href,
  ).href
}

/**
 * The configuration and game-id dialogs the back end asks for.
 *
 * The control objects are shared with the C side, which reads `value` off
 * them when the dialog is accepted, so edits assign in place and we re-render
 * by hand rather than copying into state.
 *
 * The game-id and seed dialogs already hold the thing worth sharing, in a
 * field, ready to be edited or read out — so that is where sharing it belongs,
 * rather than as a second copy of both values parked in the menu.
 */
export default function PuzzleDialog({
  spec,
  shareable,
  onOk,
  onCancel,
}: {
  spec: DialogSpec
  /** Whether this dialog's field holds an address for this puzzle. */
  shareable: boolean
  onOk: () => void
  onCancel: () => void
}) {
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const { share, copied } = useShare()
  const value = spec.controls.find((c) => c.kind === 'string')?.value

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
            should sit where a thumb lands, and where the eye stops reading.
            Share sits apart from both — it neither accepts nor abandons. */}
        <div className="dialog-buttons">
          {shareable && value !== undefined && (
            <button
              type="button"
              className="dialog-share"
              data-copied={copied}
              onClick={() => share(permalink(value), spec.title)}
            >
              <Icon name={copied ? 'check' : 'share'} size={17} />
              {copied ? 'Copied' : 'Share'}
            </button>
          )}
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">OK</button>
        </div>
      </form>
    </div>
  )
}
