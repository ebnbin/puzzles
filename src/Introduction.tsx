import Icon from './Icon'
import { useStrings } from './i18n'

/**
 * What a puzzle you have not met before is asking of you, said once.
 *
 * Forty boards and no two are played the same way; arriving at one of them
 * cold, the first question is "what am I meant to be doing", and the answer was
 * behind a button in the corner that you had to know to press.
 *
 * It used to be offered by opening the how-to-play dialog on that first visit,
 * which answered the question and covered the board doing it — a picture of a
 * finished grid and three paragraphs of rules, over the thing the reader had
 * just come to look at. This is the same offer at the size the question
 * deserves: one sentence, upstream's own `OBJECTIVE` from its CMakeLists.txt,
 * over a board that is still visible around it. The rules are still behind that
 * button, for the reader who wants them.
 *
 * The same box a refusal comes in, in the accent rather than in red — see
 * `p.notice` — because arriving at a new puzzle is not a thing that went wrong.
 * The gallery's toast made the same move for the same reason.
 *
 * And it waits. The floating note beside it is about a press and leaves on its
 * own three seconds later, because a remark nobody asked for should not become
 * furniture. This one was not asked for either, but it is the only thing on the
 * screen that says what the game is, and a reader who looks up from the board
 * to read it should not find it already gone. So it stays until it is closed,
 * and the close is the only thing that closes it.
 */
export default function Introduction({
  text,
  onClose,
}: {
  text: string
  onClose: () => void
}) {
  const t = useStrings()
  return (
    <p className="notice notice-intro is-floating" role="status">
      <span>{text}</span>
      <button type="button" aria-label={t.play.close} onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </p>
  )
}
