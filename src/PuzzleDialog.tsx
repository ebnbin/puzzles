import ConfigFields from './ConfigFields'
import Dialog from './ui/Dialog'
import type { DialogSpec } from './engine/types'
import { useStrings } from './i18n'

export default function PuzzleDialog({
  spec,
  onOk,
  onCancel,
}: {
  spec: DialogSpec
  onOk: () => void
  onCancel: () => void
}) {
  const t = useStrings()

  return (
    <Dialog label={spec.title} onClose={onCancel} onSubmit={onOk}>
      <h2>{spec.title}</h2>

      <ConfigFields controls={spec.controls} autoFocus />

      <div className="dialog-buttons">
        <button type="button" onClick={onCancel}>
          {t.dialog.cancel}
        </button>
        <button type="submit">{t.dialog.ok}</button>
      </div>
    </Dialog>
  )
}
