// 发牌期间的拦截层。先只是一层透明的、盖住一切的挡板(镜像多数时候几毫秒就回来,
// 每次都闪一个模态更烦);过了阈值才摆出对话框。点空白和 Escape 都不关它——这里
// 没有「关掉继续玩」这个选项,唯一的出口是取消,而取消就是留在原来那一局。
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
  return (
    <div className="deal-block" data-waiting={waiting || undefined}>
      {waiting && (
        <div className="deal-card" role="alertdialog" aria-modal="true" aria-label={t.deal.title}>
          <div className="deal-spinner" aria-hidden="true" />
          <h2>{t.deal.title}</h2>
          <p>{t.deal.body}</p>
          {/* 收焦点:拦截层挡得住指针,挡不住 Tab;唯一的出口也该是回车能按到的那个。 */}
          <button type="button" autoFocus onClick={onCancel}>
            <Icon name="close" />
            {t.deal.cancel}
          </button>
        </div>
      )}
    </div>
  )
}
