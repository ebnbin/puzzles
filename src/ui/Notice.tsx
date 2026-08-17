// 一条通知:错误(role=alert,图标在前)或提示(role=status,带关闭钮)。
// floating 时浮在内容上方,否则占位排版、并把自己滚进视野。
// class 名沿用已发布样式表:info 态画的是 .notice-intro。
import { useEffect, useRef } from 'react'
import Icon from './Icon'
import { useStrings } from '../i18n'

export default function Notice({
  kind = 'error',
  text,
  floating = false,
  onClose,
}: {
  kind?: 'error' | 'info'
  text: string
  floating?: boolean
  onClose?: () => void
}) {
  const t = useStrings()
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!floating) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [floating])

  const tone = kind === 'error' ? 'notice-error' : 'notice-intro'
  return (
    <p
      className={floating ? `notice ${tone} is-floating` : `notice ${tone}`}
      role={kind === 'error' ? 'alert' : 'status'}
      ref={ref}
    >
      {kind === 'error' && <Icon name="alert" size={16} />}
      <span>{text}</span>
      {onClose && (
        <button type="button" aria-label={t.close} onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      )}
    </p>
  )
}
