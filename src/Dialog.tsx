// 三个真 dialog(设置、玩法、后端 config box)共用的壳:scrim、卡片、aria、Escape。
// 底部拉起的 sheet 不是 dialog,不进这里;sheet 叠层时 Escape 关哪层由 PuzzleHost 排。
import { useEffect } from 'react'
import Icon from './Icon'
import { useStrings } from './i18n'

export default function Dialog({
  label,
  title,
  onClose,
  className,
  onSubmit,
  children,
}: {
  label: string
  title?: string
  onClose: () => void
  className?: string
  onSubmit?: () => void
  children: React.ReactNode
}) {
  const t = useStrings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Card: React.ElementType = onSubmit ? 'form' : 'div'

  return (
    <div className="dialog-dimmer" onClick={onClose}>
      <Card
        className={className ? `dialog ${className}` : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onSubmit={
          onSubmit &&
          ((e: React.FormEvent) => {
            e.preventDefault()
            onSubmit()
          })
        }
      >
        {title !== undefined && (
          <div className="dialog-head">
            <h2>{title}</h2>
            <button
              type="button"
              className="dialog-close"
              aria-label={t.play.close}
              onClick={onClose}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        )}
        {children}
      </Card>
    </div>
  )
}
