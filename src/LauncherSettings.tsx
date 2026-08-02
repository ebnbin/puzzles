import Dialog from './Dialog'
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
 *
 * Nothing in here is confirmed, so there is nothing to confirm with: the theme
 * lands as it is chosen and the manual is a link. A Done button under two
 * settings that are already set is a button that does what the scrim, the
 * corner cross and Escape all do — which is why it has gone, and the cross the
 * help dialog has had all along is what is left.
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

  // Three, and this is the only control in the app that can show three: a
  // press commits to a side, and the side it commits to is what the other two
  // presses in this app are for. System leads because it is the default and
  // because it is the one a reader picks by not deciding.
  const themes: { value: Theme; label: string }[] = [
    { value: 'system', label: t.settings.themeSystem },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ]

  return (
    <Dialog
      label={t.settings.title}
      title={t.settings.title}
      onClose={onClose}
      className="dialog-settings"
    >
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

      {/* A tab of its own, which it was before and is again for a reason
          that has changed. The objection was that a new tab put the manual
          outside the app's history; the app has no history now, so there is
          nothing for it to be outside of — and a same-tab visit would unload
          the one page this app has, taking the open sheet and the scroll with
          it. In standalone the same visit would replace the app inside its
          own window, with no tab to come back from. */}
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
    </Dialog>
  )
}
