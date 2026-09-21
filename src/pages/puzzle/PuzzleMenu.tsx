// 菜单面板的内容:新局 / 重开 / 求解、game ID 与 seed、偏好。壳(底部 sheet 还是
// 停靠栏)由 PuzzleHost 按屏幕宽度套。
import { useEffect, useRef, useState } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec } from '../../engine/types'
import { useStrings } from '../../i18n'
import Icon from '../../ui/Icon'
import type { IconName } from '../../ui/Icon'
import Notice from '../../ui/Notice'

type Action = 'newGame' | 'restart' | 'solve'

const ACTIONS: { action: Action; icon: IconName }[] = [
  { action: 'newGame', icon: 'add' },
  { action: 'restart', icon: 'restart' },
  { action: 'solve', icon: 'solve' },
]

// 后端给的 desc/seed 是放在 # 后的形式、即 %-escaped(seed 形如 3x3%23124…),
// 显示用 decode 后的形式。
const plain = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default function PuzzleMenu({
  canSolve,
  permalink,
  prefs,
  prefsError,
  onOpenPrefs,
  onCommitPrefs,
  onAction,
  onAbandon,
  onSettle,
}: {
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  prefs: DialogSpec | null
  prefsError: string | null
  onOpenPrefs: () => void
  onCommitPrefs: () => void
  onAction: (action: Action) => void
  onAbandon: () => void
  onSettle: (done?: boolean) => void
}) {
  const t = useStrings()

  // 面板挂着,偏好 box 就归它:进门要一份,卸载时把还开着的退掉。退掉这一步不能交给
  // 壳的 close 回调:换壳(宽窄切换)和换面板都是卸载,不都经过 close。
  const open = useRef(onOpenPrefs)
  open.current = onOpenPrefs
  const abandon = useRef(onAbandon)
  abandon.current = onAbandon
  useEffect(() => {
    open.current()
    return () => abandon.current()
  }, [])

  return (
    <>
      <div className="sheet-actions">
        {ACTIONS.filter((a) => a.action !== 'solve' || canSolve).map((a) => (
          <button
            key={a.action}
            type="button"
            className={a.action === 'newGame' ? 'is-primary' : undefined}
            onClick={() => onAction(a.action)}
          >
            <Icon name={a.icon} />
            {t.menu[a.action]}
          </button>
        ))}
      </div>

      {permalink && (
        <section className="sheet-ids">
          <IdRow label={t.menu.gameId} value={plain(permalink.desc)} onSettle={onSettle} />
          {permalink.seed !== null && (
            <IdRow label={t.menu.seed} value={plain(permalink.seed)} onSettle={onSettle} />
          )}
        </section>
      )}

      {prefs && prefs.controls.length > 0 && (
        <section>
          <h2>{t.menu.preferences}</h2>
          <div className="sheet-prefs">
            <ConfigFields controls={prefs.controls} onCommit={onCommitPrefs} onSettle={onSettle} />
            {prefsError && <Notice text={prefsError} />}
          </div>
        </section>
      )}
    </>
  )
}

const COPIED_MS = 1500

function IdRow({
  label,
  value,
  onSettle,
}: {
  label: string
  value: string
  onSettle: () => void
}) {
  const t = useStrings()
  const [copied, setCopied] = useState(false)
  const valueRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    setCopied(false)
  }, [value])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // 剪贴板不可用(非安全上下文、权限被拒)时退成选中文字,交给系统复制。
      const el = valueRef.current
      if (!el) return
      const range = document.createRange()
      range.selectNodeContents(el)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }

  return (
    <div className="sheet-id">
      <span className="sheet-id-label">{label}</span>
      <div className="sheet-id-value">
        <code ref={valueRef}>{value}</code>
        <button
          type="button"
          aria-label={copied ? t.menu.copied : t.menu.copy}
          aria-live="polite"
          title={t.menu.copy}
          onClick={() => {
            void copy()
            onSettle()
          }}
        >
          <Icon name={copied ? 'done' : 'copy'} size={18} />
        </button>
      </div>
    </div>
  )
}
