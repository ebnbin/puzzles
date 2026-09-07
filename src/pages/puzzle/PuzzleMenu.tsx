import { useEffect, useRef, useState } from 'react'
import ConfigFields from './ConfigFields'
import type { DialogSpec } from '../../engine/types'
import { useStrings } from '../../i18n'
import Icon from '../../ui/Icon'
import type { IconName } from '../../ui/Icon'
import Notice from '../../ui/Notice'
import Sheet from '../../ui/Sheet'

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
  onClose,
}: {
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  prefs: DialogSpec | null
  prefsError: string | null
  onOpenPrefs: () => void
  onCommitPrefs: () => void
  onAction: (action: Action) => void
  onClose: () => void
}) {
  const t = useStrings()

  const open = useRef(onOpenPrefs)
  open.current = onOpenPrefs
  useEffect(() => {
    open.current()
  }, [])

  return (
    <Sheet label={t.menu.title} onClose={onClose}>
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
            <IdRow label={t.menu.gameId} value={plain(permalink.desc)} />
            {permalink.seed !== null && (
              <IdRow label={t.menu.seed} value={plain(permalink.seed)} />
            )}
          </section>
        )}

        {prefs && prefs.controls.length > 0 && (
          <section>
            <h2>{t.menu.preferences}</h2>
            <div className="sheet-prefs">
              <ConfigFields controls={prefs.controls} onCommit={onCommitPrefs} />
              {prefsError && <Notice text={prefsError} />}
            </div>
          </section>
        )}
    </Sheet>
  )
}

const COPIED_MS = 1500

function IdRow({ label, value }: { label: string; value: string }) {
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
          title={t.menu.copy}
          onClick={copy}
        >
          <Icon name={copied ? 'done' : 'copy'} size={18} />
        </button>
      </div>
      {copied && (
        <span className="sheet-id-copied" role="status">
          {t.menu.copied}
        </span>
      )}
    </div>
  )
}
