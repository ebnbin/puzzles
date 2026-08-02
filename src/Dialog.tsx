import { useEffect } from 'react'
import Icon from './Icon'
import { useStrings } from './i18n'

/**
 * A dialog, which is four things this app kept writing out again.
 *
 * A scrim that closes on a press; a card that does not close when *it* is
 * pressed; the three attributes that make the pair a dialog to a screen reader;
 * and Escape. There were three of these — the settings, the help, the back
 * end's own config box — and all three had their own copy, so the aria label
 * was spelt three ways and only two of them answered Escape.
 *
 * What is not here is anything about what a dialog is for. The head is optional
 * and the body is the caller's; there is no notion of a primary action, a
 * layout, or a size, because the three that exist agree on none of those and
 * inventing an agreement is how a shared component starts growing flags.
 *
 * `title` is the one convenience: given, it draws the heading and the corner
 * cross together, because a dialog with a way out at the top has to have it in
 * the same place every time. Left out, the caller writes its own heading and
 * takes responsibility for offering a way out.
 *
 * The sheets are not these. They come up from the bottom edge, they are dragged
 * away rather than dismissed, and which one Escape reaches when several are up
 * is a decision the puzzle screen makes for itself — see PuzzleHost.
 */
/**
 * How many are open, so that Escape reaches only the top one.
 *
 * Each dialog listens on the window, so with two up a press would close both —
 * and the pair that stacks is exactly the pair where that is wrong: a
 * confirmation over the settings, where the answer to "are you sure" is no and
 * the settings should still be there. Counting is enough because they are only
 * ever stacked, never side by side: the last to mount is the top one.
 */
let depth = 0

export default function Dialog({
  label,
  title,
  onClose,
  className,
  onSubmit,
  children,
}: {
  /** What a screen reader calls it. */
  label: string
  /** Drawn as a heading with the cross beside it. Omit to write your own. */
  title?: string
  onClose: () => void
  /** A second class on the card, for a dialog with a shape of its own. */
  className?: string
  /** Given, the card is a form and this is what submitting it does. */
  onSubmit?: () => void
  children: React.ReactNode
}) {
  const t = useStrings()

  useEffect(() => {
    const mine = ++depth
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || mine !== depth) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      depth--
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // A form only when there is something to submit: the settings and the help
  // have nothing to send anywhere, and a form around them would be a lie the
  // browser acts on.
  const Card: React.ElementType = onSubmit ? 'form' : 'div'

  return (
    <div className="dialog-dimmer" onClick={onClose}>
      <Card
        className={className ? `dialog ${className}` : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onSubmit={
          onSubmit &&
          ((e: React.FormEvent) => {
            e.preventDefault()
            onSubmit()
          })
        }
      >
        {title !== undefined && (
          /* The title and the way out, on one line and staying on it: a body
             that scrolls scrolls under them rather than taking them with it. */
          <div className="dialog-head">
            <h2>{title}</h2>
            <button
              type="button"
              className="dialog-close"
              aria-label={t.play.close}
              onClick={onClose}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        )}
        {children}
      </Card>
    </div>
  )
}
