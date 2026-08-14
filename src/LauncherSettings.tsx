import { useEffect, useRef, useState } from 'react'
import Dialog from './Dialog'
import Icon from './Icon'
import { forgetEverything } from './engine/saves'
import { docHref, useLang, useStrings } from './i18n'
import { setArrows, useArrows } from './useArrows'
import { useScrollLock } from './useScrollLock'

const ARMED_MS = 3000

export default function LauncherSettings({
  lockAt,
  onClose,
}: {
  lockAt: number
  onClose: () => void
}) {
  const t = useStrings()
  const [lang] = useLang()
  const arrows = useArrows()
  useScrollLock(lockAt)

  const [asking, setAsking] = useState(false)
  const timer = useRef(0)
  const byKeyboard = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = (event: React.MouseEvent) => {
    window.clearTimeout(timer.current)
    byKeyboard.current = event.detail === 0
    setAsking(true)
    if (byKeyboard.current) return
    timer.current = window.setTimeout(() => setAsking(false), ARMED_MS)
  }

  const erase = () => {
    window.clearTimeout(timer.current)
    forgetEverything()
    window.location.reload()
  }

  return (
    <Dialog
      label={t.settings.title}
      title={t.settings.title}
      onClose={onClose}
      className="dialog-settings"
    >
      <label className="setting">
        <span className="setting-text">
          {t.settings.arrows}
          <em>{t.settings.arrowsHint}</em>
        </span>
        <input
          type="checkbox"
          checked={arrows}
          onChange={(e) => setArrows(e.target.checked)}
        />
      </label>

      <a
        className="setting setting-link"
        href={docHref(lang)}
        target="_blank"
        rel="noreferrer"
      >
        <span className="setting-text">
          {t.settings.manual}
          <em>{t.settings.manualHint}</em>
        </span>
        <Icon name="external" size={18} />
      </a>

      {asking ? (
        <div className="setting setting-danger">
          <span className="setting-text">
            {t.settings.erase}
            <em role="status">{t.settings.eraseWhat}</em>
          </span>
          <button type="button" className="setting-do" onClick={erase} autoFocus={byKeyboard.current}>
            {t.settings.eraseConfirm}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="setting setting-link setting-danger"
          onClick={arm}
        >
          <span className="setting-text">
            {t.settings.erase}
            <em>{t.settings.eraseHint}</em>
          </span>
          <Icon name="trash" size={18} />
        </button>
      )}
    </Dialog>
  )
}
