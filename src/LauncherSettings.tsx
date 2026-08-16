import { useEffect, useRef, useState } from 'react'
import Dialog from './Dialog'
import Icon from './Icon'
import { forgetEverything } from './engine/saves'
import { openManual } from './DocViewer'
import { docHref, useLang, useStrings } from './i18n'
import { setAid, useAid } from './useAid'
import { setArrows, useArrows } from './useArrows'
import { setLefty, useLefty } from './useLefty'
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
  const aid = useAid()
  const lefty = useLefty()
  useScrollLock(lockAt)

  const [asking, setAsking] = useState(false)
  const timer = useRef(0)
  const byKeyboard = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = (event: React.MouseEvent) => {
    window.clearTimeout(timer.current)
    // click 的 detail===0 即键盘触发(Enter/Space 合成的 click):键盘用户不设
    // 3 秒 disarm 倒计时并把焦点移给确认键——键盘追不上一个会自己消失的目标。
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

      {/* 方向键关着时这一行整行置灰:那时候「放哪一侧」无从谈起。 */}
      <div className="setting" data-off={arrows ? undefined : ''}>
        <span className="setting-text" id="side-label">
          {t.settings.side}
          <em>{t.settings.sideHint}</em>
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="side-label">
          {[
            { on: true, label: t.settings.sideLeft },
            { on: false, label: t.settings.sideRight },
          ].map((option) => (
            <label key={option.label} data-selected={lefty === option.on}>
              <input
                type="radio"
                name="side"
                checked={lefty === option.on}
                disabled={!arrows}
                onChange={() => setLefty(option.on)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <label className="setting">
        <span className="setting-text">
          {t.settings.aid}
          <em>{t.settings.aidHint}</em>
        </span>
        <input
          type="checkbox"
          checked={aid}
          onChange={(e) => setAid(e.target.checked)}
        />
      </label>

      <a
        className="setting setting-link"
        href={docHref(lang)}
        onClick={(e) => {
          e.preventDefault()
          onClose()
          openManual()
        }}
      >
        <span className="setting-text">
          {t.settings.manual}
          <em>{t.settings.manualHint}</em>
        </span>
        <Icon name="caret" size={18} />
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
