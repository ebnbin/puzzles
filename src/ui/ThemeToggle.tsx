import Icon from './Icon'
import { useStrings } from '../i18n'
import { useTheme } from '../useTheme'

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
      {/* 图形表示「按下会变成什么」,不是当前状态;方向抄自手册工具条
          (build-doc.mjs),读者刚从那边过来,同一图形不能反义。 */}
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
