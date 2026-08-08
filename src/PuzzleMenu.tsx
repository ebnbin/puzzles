import { useEffect, useId, useRef, useState } from 'react'
import ConfigFields from './ConfigFields'
import ErrorNote from './ErrorNote'
import Icon from './Icon'
import type { IconName } from './Icon'
import type { DialogSpec } from './engine/types'
import { useStrings } from './i18n'
import { useSheetDrag } from './useSheetDrag'

type Action = 'newGame' | 'restart' | 'solve'

/** The label is looked up by the same name the action goes by. */
const ACTIONS: { action: Action; icon: IconName }[] = [
  { action: 'newGame', icon: 'add' },
  { action: 'restart', icon: 'restart' },
  { action: 'solve', icon: 'solve' },
]

/** Which address a row is: the position itself, or the deal it came from. */
type TextKind = 'desc' | 'seed'

/**
 * An address as a person reads it.
 *
 * The back end hands these out ready to go after a `#`, which means escaped:
 * a seed arrives as `3x3%23124386068392157`. That is what the link wants and
 * the opposite of what a field wants — and it is not what the back end will
 * take back, either.
 */
const plain = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Everything you do to the game in front of you.
 *
 * A sheet over the board rather than a panel below it, so opening it costs
 * the board no room — on a phone the board is the whole point, and anything
 * permanently parked under it is space the puzzle does not get.
 *
 * New game leads, filled rather than tonal: it is what the sheet is opened for
 * most of the time, and it is also the one that throws the position away, so
 * it is worth being unmistakable.
 *
 * What game you are given next is not here — that is a list as long as the
 * puzzle cares to make it, and it has a sheet of its own. See PuzzleTypes.
 *
 * Everything else is laid out flat: the preferences, the game id and the seed
 * were all buttons that led to a dialog on top of this sheet, which is a layer
 * too many for a switch to flip or a line to paste. Each takes effect as it is
 * set, and nothing here closes.
 */
export default function PuzzleMenu({
  canSolve,
  permalink,
  prefs,
  prefsError,
  arrows,
  onToggleArrows,
  ownKeys,
  onToggleKeys,
  onOpenPrefs,
  onCommitPrefs,
  textError,
  onSubmitText,
  onAction,
  onClose,
}: {
  canSolve: boolean
  permalink?: { desc: string; seed: string | null }
  /** The preferences, once the back end has handed them over. */
  prefs: DialogSpec | null
  /** What it said about a value, if it refused one. */
  prefsError: string | null
  /**
   * Whether this puzzle shows the arrow keys, or null for one that would do
   * nothing with them — see `readsArrows`. Null is not false: false is an
   * offer the reader has declined, and null is no offer to make.
   */
  arrows: boolean | null
  onToggleArrows: () => void
  /**
   * And whether its own keys are showing, on the one puzzle whose board can do
   * what they do — see `offersKeys`. Null everywhere else, and null is not
   * false for the same reason as above.
   */
  ownKeys: boolean | null
  onToggleKeys: () => void
  onOpenPrefs: () => void
  onCommitPrefs: () => void
  /** What it said about a typed address, and which of the two it was about. */
  textError: { kind: TextKind; message: string } | null
  onSubmitText: (kind: TextKind, text: string) => void
  onAction: (action: Action) => void
  onClose: () => void
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  const t = useStrings()

  /*
   * Ask for them as the sheet appears. They are a section of it, not a place
   * to go, so there is nothing to press first — and asking once is enough,
   * because the back end hands back a fresh set after every change it takes.
   */
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

        {/* Above the preferences, because this is the sheet's other half of
            what the actions above do: the id names the game those buttons deal
            you, and handing it out or pasting one in is a way of getting a game
            rather than a way of setting one up. The preferences are the tail of
            the sheet — settings you touch once, if ever, and every puzzle's own
            are different. */}
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

        {/* Some puzzles offer none of their own, and an empty heading is worse
            than no heading — but the arrow keys are ours to offer and are
            offered on all but one puzzle, so the section now stands on either
            of the two. */}
        {(arrows !== null || ownKeys !== null || (prefs && prefs.controls.length > 0)) && (
          <section>
            <h2>{t.menu.preferences}</h2>
            <div className="sheet-prefs">
              {prefs && prefs.controls.length > 0 && (
                <>
                  <ConfigFields controls={prefs.controls} onCommit={onCommitPrefs} />
                  {prefsError && <ErrorNote text={prefsError} />}
                </>
              )}
              {/* Last, under the puzzle's own. Written to look exactly like one
                  of them — the same class ConfigFields gives a checkbox — because
                  from where the reader sits it is one: a switch in the list of
                  switches. That it is answered on this side and they are answered
                  in the wasm is not a distinction the sheet should be drawing. */}
              {arrows !== null && (
                <label className="dialog-boolean">
                  <input
                    type="checkbox"
                    checked={arrows}
                    onChange={onToggleArrows}
                  />
                  {t.menu.arrows}
                </label>
              )}
              {/* And, under it, the other row that is ours. Second because the
                  arrows are offered on thirty-nine puzzles and this on one:
                  the rarer switch goes below the one a reader has met before. */}
              {ownKeys !== null && (
                <label className="dialog-boolean">
                  <input
                    type="checkbox"
                    checked={ownKeys}
                    onChange={onToggleKeys}
                  />
                  {t.menu.keys}
                </label>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

/**
 * One of the two addresses this position has, to read, to hand out, or to
 * paste one over.
 *
 * The same line does all three, because they are the same thing: the id in the
 * box *is* the game, and typing a different one is how you are given a
 * different game. It used to be a button to a dialog for typing and a separate
 * row for sharing, which made two features out of one field.
 *
 * The field shows what the back end last dealt, not what was last typed. A
 * refused id leaves what was typed in place, with what the puzzle said about it
 * underneath; an accepted one is replaced by the puzzle's own spelling of it,
 * which is rarely character-for-character what went in.
 */
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

  /*
   * What was last handed over, which is what "unchanged" means. Not `value`:
   * a refused id never becomes the value, and blurring the field again should
   * not send it back for the same refusal.
   */
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
      {/*
       * The field, and nothing beside it. There was a share button here, which
       * handed the address to the device's own share sheet or, failing that,
       * to the clipboard. Handing out a link is not the hard part of sharing a
       * puzzle — the page that link opens is, and there isn't one — so it is
       * gone until there is something worth arriving at. The address itself is
       * still here, readable and selectable, and still takes one typed in.
       */}
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
          // Nothing to submit it to; the field is the form.
          e.preventDefault()
          commit()
        }}
      />
      {error && <ErrorNote text={error} />}
    </div>
  )
}
