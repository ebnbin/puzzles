import Icon from './Icon'
import { useStrings } from './i18n'
import { useTheme } from './useTheme'

export default function ThemeToggle({ className }: { className: string }) {
  const t = useStrings()
  const [theme, setTheme] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={className}
      aria-label={next === 'dark' ? t.settings.themeDark : t.settings.themeLight}
      onClick={() => setTheme(next)}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
