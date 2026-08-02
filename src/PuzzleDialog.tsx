import ConfigFields from './ConfigFields'
import Dialog from './Dialog'
import type { DialogSpec } from './engine/types'
import { useStrings } from './i18n'

/**
 * The game-id, seed and preferences dialogs the back end asks for.
 *
 * Not the parameters: those are the same kind of thing to the C, but they are
 * a choice about which puzzle you are being set, so they open inside the type
 * sheet instead. See PuzzleTypes.
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
  // The title and every control label inside come from the compiled back end
  // and are in English whatever the reader has chosen; only the two buttons
  // are ours.
  const t = useStrings()

  return (
    /* No corner cross: this one has a Cancel, and it is not the same act — the
       cross elsewhere means "I have read this", while leaving here is an answer
       the back end is waiting on. One way out, said in a word. */
    <Dialog label={spec.title} onClose={onCancel} onSubmit={onOk}>
      <h2>{spec.title}</h2>

      <ConfigFields controls={spec.controls} autoFocus />

      {/* Cancel first, accept last: the accepting button is the one that
          should sit where a thumb lands, and where the eye stops reading. */}
      <div className="dialog-buttons">
        <button type="button" onClick={onCancel}>
          {t.dialog.cancel}
        </button>
        <button type="submit">{t.dialog.ok}</button>
      </div>
    </Dialog>
  )
}
