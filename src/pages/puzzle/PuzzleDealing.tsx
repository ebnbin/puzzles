// 发牌期间的拦截层。先只是一层透明的、盖住一切的挡板(镜像多数时候几毫秒就回来,
// 每次都闪一个模态更烦);过了阈值才摆出卡片。点空白和 Escape 都不关——这里没有
// 「关掉继续玩」这个选项,唯一的出口是取消,而取消就是留在原来那一局。
import { useEffect, useRef } from 'react'
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

  // 收焦点的是对话框本身,不是取消按钮:拦截层挡得住指针、挡不住 Tab,焦点得进来;
  // 可要是落在按钮上,那圈 2px 的焦点框会成为这张小卡片里最响的东西,主次就反了。
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
          {/* 不带 aria-valuenow 就是「不知道要多久」,而我们确实不知道。 */}
          <div className="deal-progress" role="progressbar" aria-label={t.deal.title} />
          <button type="button" onClick={onCancel}>
            {t.deal.cancel}
          </button>
        </div>
      )}
    </div>
  )
}
