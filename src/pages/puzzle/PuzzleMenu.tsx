import { useEffect, useId, useRef, useState } from 'react'
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

type TextKind = 'desc' | 'seed'

// 后端给的 desc/seed 是放在 # 后的形式、即 %-escaped(seed 形如 3x3%23124…):
// 显示和回喂都必须用 decode 后的形式,原样回喂会被拒。
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
  textError,
  onSubmitText,
  onAction,
  onClose,
}: {
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  prefs: DialogSpec | null
  prefsError: string | null
  onOpenPrefs: () => void
  onCommitPrefs: () => void
  textError: { kind: TextKind; message: string } | null
  onSubmitText: (kind: TextKind, text: string) => void
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
            <TextRow
              kind="desc"
              label={t.menu.gameId}
              value={permalink.desc}
              error={textError?.kind === 'desc' ? textError.message : null}
              onSubmit={onSubmitText}
            />
            {permalink.seed !== null && (
              <TextRow
                kind="seed"
                label={t.menu.seed}
                value={permalink.seed}
                error={textError?.kind === 'seed' ? textError.message : null}
                onSubmit={onSubmitText}
              />
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

function TextRow({
  kind,
  label,
  value,
  error,
  onSubmit,
}: {
  kind: TextKind
  label: string
  value: string
  error: string | null
  onSubmit: (kind: TextKind, text: string) => void
}) {
  const id = useId()
  const [text, setText] = useState(() => plain(value))

  // 记「上次交出去的」,不能拿 value 当基准:被拒的 id 永远不会变成 value,
  // 比较对象错了,拒绝后每次 blur 都会把同一个 id 再送去被拒一遍。
  const sent = useRef(text)
  useEffect(() => {
    setText(plain(value))
    sent.current = plain(value)
  }, [value])

  const commit = () => {
    if (text === sent.current) return
    sent.current = text
    onSubmit(kind, text)
  }

  return (
    <div className="sheet-id">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={text}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          commit()
        }}
      />
      {error && <Notice text={error} />}
    </div>
  )
}
