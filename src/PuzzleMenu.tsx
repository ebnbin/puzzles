import { useEffect, useId, useRef, useState } from 'react'
import ConfigFields from './ConfigFields'
import ErrorNote from './ErrorNote'
import Icon from './Icon'
import type { IconName } from './Icon'
import type { DialogSpec } from './engine/types'
import { useStrings } from './i18n'
import { useSheetDrag } from './useSheetDrag'

type Action = 'newGame' | 'restart' | 'solve'

const ACTIONS: { action: Action; icon: IconName }[] = [
  { action: 'newGame', icon: 'add' },
  { action: 'restart', icon: 'restart' },
  { action: 'solve', icon: 'solve' },
]

type TextKind = 'desc' | 'seed'

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
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()

  const open = useRef(onOpenPrefs)
  open.current = onOpenPrefs
  useEffect(() => {
    open.current()
  }, [])

  return (
    <div className="sheet-dimmer" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t.menu.title}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        <div className="sheet-handle" aria-hidden="true">
          <div className="sheet-grip" />
        </div>

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
              {prefsError && <ErrorNote text={prefsError} />}
            </div>
          </section>
        )}
      </div>
    </div>
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
      {error && <ErrorNote text={error} />}
    </div>
  )
}
