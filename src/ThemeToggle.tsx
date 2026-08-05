import Icon from './Icon'
import { useStrings } from './i18n'
import { useTheme } from './useTheme'

/**
 * One press, turning the app over.
 *
 * It sits in both bars — beside the language on the gallery, beside the manual
 * on a puzzle — and the manual's own bar has had the same press all along. Three
 * screens, one control, so it is written once here rather than three times.
 *
 * The glyph names what a press would do rather than what is on the screen: a
 * moon on a light app, a sun on a dark one. Copied from the manual, which has
 * drawn it that way round since before the app had a button at all — a reader
 * who has just come from there must not find the same picture meaning the
 * opposite thing.
 *
 * It used to be in the settings dialog instead, as a three-way, on the argument
 * that a press cannot mean three things. It cannot; there are two things now,
 * so the argument has expired and the control that is one press wide fits in a
 * bar.
 */
export default function ThemeToggle({ className }: { className: string }) {
  const t = useStrings()
  const [theme, setTheme] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={className}
      // Named for what pressing it does, which is what the glyph says too. Not
      // "Appearance": a button that toggles is not a setting to be opened.
      aria-label={next === 'dark' ? t.settings.themeDark : t.settings.themeLight}
      onClick={() => setTheme(next)}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
