import ConfigFields from './ConfigFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DialogSpec } from './engine/types'
import { useStrings } from './i18n'

const FOOT_BUTTON = 'flex-1 md:min-w-[5.5rem] md:flex-none'

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onOk()
          }}
        >
          <DialogTitle className="mb-4 block">{spec.title}</DialogTitle>

          <ConfigFields controls={spec.controls} autoFocus layout="stack" />

          <DialogFooter>
            <Button className={FOOT_BUTTON} onClick={onCancel}>
              {t.dialog.cancel}
            </Button>
            <Button type="submit" variant="primary" className={FOOT_BUTTON}>
              {t.dialog.ok}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
