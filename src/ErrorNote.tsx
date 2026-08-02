import { useEffect, useRef } from 'react'
import Icon from './Icon'

/**
 * What the back end says when it will not do something.
 *
 * There are four places it can say it — under the title bar, under the
 * parameters, under the preferences, under a typed address — and they are all
 * the same event: one sentence out of the C explaining why the thing just
 * asked for did not happen. So they are one thing here, and look like it.
 *
 * They did not. The bar had a tinted pill and the three in the sheets had a
 * bare line of text, and that line was not even the colour it was written to
 * be: `.sheet p` sets the sheet's prose grey at a specificity of (0,1,1), and
 * `.sheet-custom-error` asked for `--danger` at (0,1,0), so a refused width
 * arrived looking exactly like the caption beside it. Being red is most of
 * what makes a refusal legible as one, and it was being lost in the cascade.
 *
 * Two things every one of them now does.
 *
 * `role="alert"` — the sentence appears after the press, in a place the
 * reader is not looking, so it has to announce itself. The bar had no role at
 * all.
 *
 * Scrolls itself in. The parameters are a form of seven or eight rows and
 * this lands under the last of them: measured on a 390-wide screen, Solo's
 * "Both dimensions must be at least 2" appears entirely below the fold while
 * the field it is about is at the top. A message you cannot see is not a
 * quieter message, it is no message, and the reader is left thinking the
 * press did nothing. `nearest` so a note already on screen does not move.
 */
export default function ErrorNote({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <p className="notice-error" role="alert" ref={ref}>
      <Icon name="alert" size={16} />
      <span>{text}</span>
    </p>
  )
}
