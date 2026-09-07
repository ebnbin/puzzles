// 停靠在右侧的面板壳。非模态是它的全部要点:没有 scrim、不锁滚动、不收焦点,
// 开着的时候页面照常能用——让出宽度的是外面那层(index.css 的 --dock-w)。
import Icon from './Icon'
import { useStrings } from '../i18n'

export default function Dock({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: React.ReactNode
}) {
  const t = useStrings()
  return (
    <aside className="dock" aria-label={label}>
      <div className="dock-head">
        <h2>{label}</h2>
        <button
          type="button"
          className="dock-close"
          aria-label={t.close}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </aside>
  )
}
