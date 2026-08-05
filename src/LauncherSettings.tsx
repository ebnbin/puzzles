import { useState } from 'react'
import Dialog from './Dialog'
import Icon from './Icon'
import { forgetEverything } from './engine/saves'
import { docHref, useLang, useStrings } from './i18n'
import { useScrollLock } from './useScrollLock'

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
  // The launcher scrolls; it must not do so under its own settings. The
  // offset is the launcher's, caught before the dialog scrolled it away.
  useScrollLock(lockAt)

  /*
   * The erase asks first, and asks in place.
   *
   * A dialog on top of a dialog would be the obvious thing and is the one to
   * avoid: two layers means deciding which one Escape closes, and the app has
   * exactly one such stack already (PuzzleHost's sheets) with the ordering
   * written out by hand. This row turns into the question instead, so there is
   * still one layer and Escape still means the same thing.
   *
   * It reloads afterwards rather than telling every store to re-read itself.
   * The theme, the language and the hidden set are module-level and were
   * populated on the way up; the gallery holds the scroll and the toast in
   * memory. A reload is the honest way to arrive at what a reader who has just
   * erased everything is asking for, which is the app as it comes.
   */
  const [asking, setAsking] = useState(false)
  const erase = () => {
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
        <div className="setting setting-danger">
          <span className="setting-text">
            {t.settings.eraseSure}
            <em>{t.settings.eraseWhat}</em>
          </span>
          <span className="setting-answer">
            <button type="button" onClick={() => setAsking(false)}>
              {t.dialog.cancel}
            </button>
            <button type="button" className="danger" onClick={erase}>
              {t.settings.eraseConfirm}
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="setting setting-link setting-danger"
          onClick={() => setAsking(true)}
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
