// 发牌期间的拦截层:先只是一层透明的挡板,过了阈值才摆出卡片。点空白和 Escape 都不关,唯一的
// 出口是右上角的叉,它就是取消。
import { useEffect, useRef } from 'react'
import Icon from '../../ui/Icon'
import { useStrings } from '../../i18n'

export default function PuzzleDealing({
  waiting,
  onCancel,
}: {
  waiting: boolean
  onCancel: () => void
}) {
  const t = useStrings()
  const card = useRef<HTMLDivElement>(null)

  // 收焦点的是对话框本身,不是那个叉:拦截层挡得住指针、挡不住 Tab。
  useEffect(() => {
    if (waiting) card.current?.focus()
  }, [waiting])

  return (
    <div className="deal-block" data-waiting={waiting || undefined}>
      {waiting && (
        <div
          className="deal-card"
          role="alertdialog"
          aria-modal="true"
          aria-label={t.deal.title}
          tabIndex={-1}
          ref={card}
        >
          <button
            type="button"
            className="dialog-close"
            aria-label={t.deal.cancel}
            onClick={onCancel}
          >
            <Icon name="close" size={20} />
          </button>
          {/* 不带 aria-valuenow = 不知道要多久。pathLength=100 之后 dasharray 直接按百分比写,和半径脱钩。 */}
          <svg className="deal-ring" viewBox="0 0 40 40" role="progressbar" aria-label={t.deal.title}>
            <circle className="deal-ring-track" cx="20" cy="20" r="16" pathLength={100} />
            <circle className="deal-ring-arc" cx="20" cy="20" r="16" pathLength={100} />
          </svg>
        </div>
      )}
    </div>
  )
}
