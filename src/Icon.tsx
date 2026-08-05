/**
 * The app's icons, drawn rather than downloaded.
 *
 * A handful of glyphs is far less than any icon font weighs, and inlining them
 * means no extra request, no flash of missing icon, and `currentColor`
 * throughout. They are built from circles, straight lines and quarter turns on
 * a 24 grid — the same vocabulary the puzzles themselves are drawn in.
 *
 * Always `aria-hidden`: every icon here sits inside a button that already has
 * a name, either its own text or an `aria-label`. Announcing the glyph as well
 * would just say everything twice.
 */

/**
 * The glyphs that go on a puzzle key, which is a closed set: each one stands
 * for exactly one thing, so it also names the words said about it. See
 * `keys` in the string catalogues.
 */
export type KeyGlyph = 'clear' | 'hint' | 'possible' | 'single' | 'blank' | 'jumble'

/**
 * And the three that are not glyphs at all but pictures, because the thing
 * they stand for is already drawn — the same ghost, vampire and zombie the
 * board shows, cut off it by scripts/build-art.mjs. A key that puts a
 * monster in a square should show that monster, not somebody's shorthand for
 * it; these are the only keys in the collection where the puzzle itself has
 * already answered what the key means.
 */
export type KeyArt = 'ghost' | 'vampire' | 'zombie'

export type KeyIcon = KeyGlyph | KeyArt

export type IconName =
  | 'back'
  | 'undo'
  | 'redo'
  | 'menu'
  | 'add'
  | 'restart'
  | 'solve'
  | 'type'
  | 'prefs'
  | KeyGlyph
  | 'external'
  | 'eye'
  | 'eyeOff'
  | 'close'
  | 'help'
  | 'alert'
  | 'caret'
  | 'sun'
  | 'moon'
  | 'trash'

const PATHS: Record<IconName, React.ReactNode> = {
  back: (
    <>
      <path d="M19.5 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  undo: (
    <>
      <path d="M9.5 14 4.5 9l5-5" />
      <path d="M4.5 9H12a5.5 5.5 0 0 1 0 11H8" />
    </>
  ),
  redo: (
    <>
      <path d="M14.5 14l5-5-5-5" />
      <path d="M19.5 9H12a5.5 5.5 0 0 0 0 11h4" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  /* A circle left open at the top, with the tail and head of the arrow. */
  restart: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 7.5-7.5H7" />
      <path d="M10 1.5 6.5 4.5 10 7.5" />
    </>
  ),
  /* A bulb as the puzzles would draw one: a circle over a screw base. */
  solve: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9.5 15.8V18a1.6 1.6 0 0 0 1.6 1.6h1.8A1.6 1.6 0 0 0 14.5 18v-2.2" />
    </>
  ),
  /* A board and the lines that divide it. What the sheet behind this button
     decides is how many squares there are, which is the one thing a grid can
     show without being any particular puzzle. */
  type: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" />
      <path d="M3.6 9.2h16.8" />
      <path d="M3.6 14.8h16.8" />
      <path d="M9.2 3.6v16.8" />
      <path d="M14.8 3.6v16.8" />
    </>
  ),
  prefs: (
    <>
      <path d="M4 8h2.4" />
      <path d="M11.6 8H20" />
      <circle cx="9" cy="8" r="2.6" />
      <path d="M4 16h9.4" />
      <path d="M18.6 16H20" />
      <circle cx="16" cy="16" r="2.6" />
    </>
  ),
  /* --- the keys a puzzle asks for ---------------------------------------
   *
   * These stand in for a character a touch device has no way to type. Undead's
   * three monsters used to be here as well, drawn in this vocabulary; they are
   * pictures now — see `KeyArt` above and `PuzzleKeypad`.
   */

  /* Backspace, as every keyboard draws it. */
  clear: (
    <>
      <path d="M20 5.5H9.2L3.4 12l5.8 6.5H20a1.6 1.6 0 0 0 1.6-1.6V7.1A1.6 1.6 0 0 0 20 5.5Z" />
      <path d="m12.4 9.6 5.2 4.8" />
      <path d="m17.6 9.6-5.2 4.8" />
    </>
  ),
  /* A wand: one move made for you. Not the bulb — that is Solve, which makes
     all of them. */
  hint: (
    <>
      <path d="M3.6 20.4 13.8 10.2" />
      <path d="m16.4 7.6 2.4-2.4" />
      <path d="M19.6 11.4v2.8" />
      <path d="M18.2 12.8h2.8" />
      <path d="M12.4 3.4v2.4" />
      <path d="M11.2 4.6h2.4" />
    </>
  ),
  /* --- the three keys this side answers -----------------------------------
   *
   * All three are a square, because all three are about what goes in one, and
   * they are told apart by what is inside it. They were drawn to share nothing
   * with upstream's four-dot `marks`, which at the time was still on Undead's
   * keypad; Undead has these three now and that glyph is gone, so the reason
   * has outlived itself. They are kept as they are because they read well on
   * their own and because a key that changes its face is a key the reader has
   * to learn twice.
   */

  /* A tick: the digits that check out. */
  possible: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="m7.9 12.3 2.9 2.9 5.3-6.4" />
    </>
  ),
  /* An arrow down into the square: the one thing left, written in. The other
     two of these three only ever change what is pencilled; this is the one
     that puts something in a square, so it is the one that points inwards. */
  single: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 7.2v6.4" />
      <path d="m9 10.8 3 3 3-3" />
    </>
  ),
  /* And the same square struck through, which is what an empty one looks
     like everywhere else it is drawn. */
  blank: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M7.4 16.6 16.6 7.4" />
    </>
  ),
  /* Two paths crossing: the same pieces, somewhere else. */
  jumble: (
    <>
      <path d="M3.4 7.4h3.8l9.6 9.2h3.8" />
      <path d="M3.4 16.6h3.8l9.6-9.2h3.8" />
      <path d="m17.8 4.2 3 3.2-3 3.2" />
      <path d="m17.8 13.4 3 3.2-3 3.2" />
    </>
  ),

  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  /* Two quarter turns of the same line, which is all a cross is. */
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M9.5 9.4a2.6 2.6 0 1 1 4 2.2c-.9.6-1.5 1.1-1.5 2v.6" />
      <circle cx="12" cy="17.1" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  /* The same circle as `help`, with the stroke and the dot the other way up:
     these two are the pair a reader meets in this app — one is asking, the
     other is being told. */
  alert: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7.4v5.2" />
      <circle cx="12" cy="16.6" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  /* Small, and drawn shallow: it sits beside a word rather than in a button
     of its own, and a steep chevron there reads as a second glyph. */
  caret: <path d="m7.5 10 4.5 4.5 4.5-4.5" />,
  /*
   * Light and dark, and the pair is copied rather than invented: the manual has
   * had these two exact shapes in its bar all along (build-doc.mjs), and the
   * reader who presses one has just come from the other. Same rule about which
   * shows, too — whichever names what a press would do, so the sun appears on a
   * dark page and the moon on a light one.
   */
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2.2" />
      <path d="M12 19.2v2.2" />
      <path d="M2.6 12h2.2" />
      <path d="M19.2 12h2.2" />
      <path d="m5.3 5.3 1.6 1.6" />
      <path d="m17.1 17.1 1.6 1.6" />
      <path d="m18.7 5.3-1.6 1.6" />
      <path d="m6.9 17.1-1.6 1.6" />
    </>
  ),
  moon: <path d="M20.6 13.4A8.6 8.6 0 1 1 10.6 3.4 6.7 6.7 0 0 0 20.6 13.4Z" />,
  /* A bin, for the one control in the app that destroys something. */
  trash: (
    <>
      <path d="M4.5 6.8h15" />
      <path d="M9.2 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4v1.6" />
      <path d="M6.6 6.8 7.5 19a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l.9-12.2" />
      <path d="M10.4 10.4v6" />
      <path d="M13.6 10.4v6" />
    </>
  ),
  /* An eye, and the same eye struck through: shown and hidden. Drawn small —
     they live in the corner of a tile. */
  eye: (
    <>
      <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4.4 7.4A16.6 16.6 0 0 0 2.8 12s3.4 6.2 9.2 6.2a8.6 8.6 0 0 0 3.6-.8" />
      <path d="M8.6 6.5A8.5 8.5 0 0 1 12 5.8c5.8 0 9.2 6.2 9.2 6.2a16.4 16.4 0 0 1-2.9 3.6" />
      <path d="M9.9 9.9a2.85 2.85 0 1 0 4.2 4.2" />
      <path d="m4 4 16 16" />
    </>
  ),
}

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
