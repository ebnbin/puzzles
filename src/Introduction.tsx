import Icon from './Icon'
import { Notice } from '@/components/ui/notice'
import { useStrings } from './i18n'

export default function Introduction({
  text,
  onClose,
}: {
  text: string
  onClose: () => void
}) {
  const t = useStrings()
  return (
    <Notice tone="raised" floating role="status">
      <span className="flex-1">{text}</span>
      <button
        type="button"
        className="-my-[0.85rem] -mr-[0.85rem] flex-none rounded-md p-[0.85rem] active:opacity-60"
        aria-label={t.play.close}
        onClick={onClose}
      >
        <Icon name="close" size={16} />
      </button>
    </Notice>
  )
}
