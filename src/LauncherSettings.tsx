import Icon from './Icon'
import { docHref, useLang, useStrings } from './i18n'
import type { Lang } from './i18n'
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
export default function LauncherSettings({ onClose }: { onClose: () => void }) {
  const t = useStrings()
  const [lang, setLang] = useLang()
  const [theme, setTheme] = useTheme()

  const themes: { value: Theme; label: string }[] = [
    { value: 'system', label: t.settings.themeSystem },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ]

  // The one list on this screen that is the same in both languages: a language
  // is named in itself, or the reader who needs it cannot find it.
  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '简体中文' },
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

        <div className="setting">
          <span className="setting-text">{t.settings.language}</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label={t.settings.language}
          >
            {langs.map((option) => (
              <label key={option.value} data-selected={lang === option.value}>
                <input
                  type="radio"
                  name="lang"
                  value={option.value}
                  checked={lang === option.value}
                  onChange={() => setLang(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* A new tab: the manual is a separate site, and coming back should
            not mean loading the app again. */}
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

        <div className="dialog-buttons">
          <button type="button" onClick={onClose}>
            {t.settings.done}
          </button>
        </div>
      </div>
    </div>
  )
}
