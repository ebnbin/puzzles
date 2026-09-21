// 停靠在屏幕右缘的面板壳,和 Sheet(底部拉起)、Dialog(居中卡片)并列的第三种。
// 非模态是它的全部要点:没有 scrim、不锁滚动、不收焦点,开着的时候页面照常能用。
// 让出宽度的是外面那层(.puzzle[data-dock] 的右内边距),这里只管画。
import Icon from './Icon'
import { useStrings } from '../i18n'

export default function Dock({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const t = useStrings()
  return (
    <aside className="dock" aria-label={title}>
      <header className="dock-head">
        <h2>{title}</h2>
        <button type="button" className="dock-close" aria-label={t.close} onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="dock-body">{children}</div>
    </aside>
  )
}
