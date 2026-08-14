import Icon from './Icon'
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
    <p className="notice notice-intro is-floating" role="status">
      <span>{text}</span>
      <button type="button" aria-label={t.play.close} onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </p>
  )
}
