import { useEffect, useRef, useState } from 'react'
import Dialog from './Dialog'
import Icon from './Icon'
import { forgetEverything } from './engine/saves'
import { docHref, useLang, useStrings } from './i18n'
import { setArrows, useArrows } from './useArrows'
import { useScrollLock } from './useScrollLock'

/**
 * How long the erase stays armed after a tap.
 *
 * Long enough to move a thumb across the row and no longer: what it is really
 * for is the reader who pressed the wrong thing and is now reading the warning,
 * and the kindest end to that is the button going away by itself.
 */
const ARMED_MS = 3000

/**
 * The one place to read more, and the one thing in this app that destroys
 * something.
 *
 * It was a card at the top of the launcher, which put a quarter of the first
 * screen between the reader and the puzzles for two switches most people touch
 * once. It then held the theme as well, on the argument that a three-way needed
 * somewhere three states could be shown; the theme has two states now and a
 * press of its own in the bar outside, so it has gone from here rather than
 * being offered twice.
 *
 * Nothing in here is confirmed except the thing that cannot be taken back, so
 * there is no Done button: the manual is a link, and the erase asks for itself.
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
  const arrows = useArrows()
  // The launcher scrolls; it must not do so under its own settings. The
  // offset is the launcher's, caught before the dialog scrolled it away.
  useScrollLock(lockAt)

  /*
   * The erase asks first, in the row it is in, and stops asking on its own.
   *
   * A dialog on top of a dialog would be the obvious thing and is the one to
   * avoid: two layers means deciding which one Escape closes, and the app has
   * exactly one such stack already (PuzzleHost's sheets) with the ordering
   * written out by hand. So the row arms instead — the glyph gives way to a
   * button that has to be pressed as well — and the row stays one row, which
   * is what keeps this from reading as a second thing that has appeared.
   *
   * No Cancel beside it. The way out is to do nothing, and doing nothing is
   * what the reader who pressed it by accident is already doing; a button
   * offering it is a second thing to aim at when neither needed aiming at.
   *
   * ---------------------------------------------------------------------------
   * THREE SECONDS, EXCEPT FOR THE READER WHO CANNOT SPEND THEM
   * ---------------------------------------------------------------------------
   *
   * It disarms itself after three seconds, which is right for a thumb and
   * hostile to a keyboard: tab to the row, press Enter, and the thing you must
   * press next is somewhere you have to go and find before it goes away again.
   * So the countdown only runs for a press that came from a pointer. A click
   * with a `detail` of 0 is the keyboard's — Enter and Space produce one — and
   * that arms it for as long as it takes and moves focus onto the button, which
   * is where the next press has to land anyway.
   */
  const [asking, setAsking] = useState(false)
  const timer = useRef(0)
  /** Whether the press that armed it was one that cannot chase a moving target. */
  const byKeyboard = useRef(false)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const arm = (event: React.MouseEvent) => {
    window.clearTimeout(timer.current)
    byKeyboard.current = event.detail === 0
    setAsking(true)
    if (byKeyboard.current) return
    timer.current = window.setTimeout(() => setAsking(false), ARMED_MS)
  }

  /*
   * It reloads afterwards rather than telling every store to re-read itself.
   * The theme, the language and the hidden set are module-level and were
   * populated on the way up; the gallery holds the scroll and the toast in
   * memory. A reload is the honest way to arrive at what a reader who has just
   * erased everything is asking for, which is the app as it comes.
   */
  const erase = () => {
    window.clearTimeout(timer.current)
    forgetEverything()
    window.location.reload()
  }

  return (
    <Dialog
      label={t.settings.title}
      title={t.settings.title}
      onClose={onClose}
      className="dialog-settings"
    >
      {/* The one live setting in here, so it comes first. One answer for the
          whole app — which way of playing suits this reader — where it used to
          be asked again in every puzzle's menu; the reasons are on useArrows.
          A native checkbox like the ones in the puzzles' own preference
          sheets, because from where the reader sits it is the same kind of
          thing: a switch in a list of switches. */}
      <label className="setting">
        <span className="setting-text">
          {t.settings.arrows}
          <em>{t.settings.arrowsHint}</em>
        </span>
        <input
          type="checkbox"
          checked={arrows}
          onChange={(e) => setArrows(e.target.checked)}
        />
      </label>

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

      {asking ? (
        // Not a button any more: the row holds one, and a button inside a
        // button is not a thing the parser will keep.
        <div className="setting setting-danger">
          <span className="setting-text">
            {t.settings.erase}
            {/* Announced, because the row changed under a reader who cannot
                see that it did — and the thing it now says is the warning. */}
            <em role="status">{t.settings.eraseWhat}</em>
          </span>
          <button type="button" className="setting-do" onClick={erase} autoFocus={byKeyboard.current}>
            {t.settings.eraseConfirm}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="setting setting-link setting-danger"
          onClick={arm}
        >
          <span className="setting-text">
            {t.settings.erase}
            <em>{t.settings.eraseHint}</em>
          </span>
          <Icon name="trash" size={18} />
        </button>
      )}
    </Dialog>
  )
}
