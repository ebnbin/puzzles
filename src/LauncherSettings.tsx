import Icon from './Icon'
import { docHref, useLang, useStrings } from './i18n'
import { useScrollLock } from './useScrollLock'
import { useTheme } from './useTheme'
import type { Theme } from './useTheme'

/**
 * The two things there are to decide and the one place to read more, behind
 * the button that means "settings".
 *
 * They were a card at the top of the launcher, which put a quarter of the first
 * screen between the reader and the puzzles for two switches most people touch
 * once.
 */
export default function LauncherSettings({
  lockAt,
  onClose,
}: {
  lockAt: number
  onClose: () => void
}) {
  const t = useStrings()
  // Read-only here: the language is set on the launcher itself, but the
  // manual's address depends on it.
  const [lang] = useLang()
  const [theme, setTheme] = useTheme()
  // The launcher scrolls; it must not do so under its own settings. The
  // offset is the launcher's, caught before the dialog scrolled it away.
  useScrollLock(lockAt)

  const themes: { value: Theme; label: string }[] = [
    { value: 'system', label: t.settings.themeSystem },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ]

  return (
    <div className="dialog-dimmer" onClick={onClose}>
      <div
        className="dialog dialog-settings"
        role="dialog"
        aria-modal="true"
        aria-label={t.settings.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t.settings.title}</h2>

        <div className="setting">
          <span className="setting-text">{t.settings.appearance}</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label={t.settings.appearance}
          >
            {themes.map((option) => (
              <label key={option.value} data-selected={theme === option.value}>
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* This tab. The manual is a real site at a real address, so it is
            read the way a page is read: you go there, and Back brings you
            home. A new tab would put it outside the app's history, where the
            manual's own back arrow leads to a second copy of the app and the
            browser's Back leads nowhere. */}
        <a className="setting setting-link" href={docHref(lang)}>
          <span className="setting-text">
            {t.settings.manual}
            <em>{t.settings.manualHint}</em>
          </span>
          <Icon name="caret" size={18} className="is-next" />
        </a>

        <div className="dialog-buttons">
          <button type="button" onClick={onClose}>
            {t.settings.done}
          </button>
        </div>
      </div>
    </div>
  )
}
