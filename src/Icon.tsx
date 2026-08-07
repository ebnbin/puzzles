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
export type KeyGlyph =
  | 'clear'
  | 'marks'
  | 'hint'
  | 'possible'
  | 'single'
  | 'blank'
  | 'jumble'

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
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowLeft'
  | 'arrowRight'
  | 'arrowUpLeft'
  | 'arrowUpRight'
  | 'arrowDownLeft'
  | 'arrowDownRight'
  | 'rotate'
  | 'turnLeft'
  | 'turnRight'
  | 'lock'
  | 'pencil'
  | 'black'
  | 'white'
  | 'slide'
  | 'pushLine'
  | 'pullLine'
  | 'lockTile'
  | 'lockTileOn'
  | 'lockPlace'
  | 'lockPlaceOn'
  | 'pushUp'
  | 'pushDown'
  | 'pushLeft'
  | 'pushRight'
  | 'place'
  | 'hold'
  | 'flip'
  | 'select'
  | 'jump'
  | 'domino'
  | 'dominoOn'
  | 'line'
  | 'lineOn'
  | 'vertex'
  | 'cycle'
  | 'laser'
  | 'ball'
  | 'ballOn'
  | 'unlock'
  | 'slash'
  | 'backslash'
  | 'emptyCell'
  | 'dotSquare'
  | 'circleSquare'
  | 'tent'
  | 'grass'
  | 'lamp'
  | 'plusSquare'
  | 'minusSquare'
  | 'crossSquare'
  | 'questionSquare'
  | 'track'
  | 'pickCell'
  | 'floodFill'
  | 'advance'
  | 'edge'
  | 'noEdge'
  | 'island'
  | 'islandDone'
  | 'linkFrom'
  | 'linkTo'
  | 'drawLine'
  | 'galaxyArrow'
  | 'stipple'
  | 'uncover'
  | 'chord'
  | 'flag'
  | 'mark'
  | 'erase'
  | 'done'
  | 'cancel'

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
  /* A square with every corner marked: upstream's M, which fills a full set of
     pencil marks into every square that has no digit in it. Drawn for that key,
     deleted when the key came off these keypads, and back unchanged with it —
     see the note on the three below, which were drawn around this one. */
  marks: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="8.4" cy="8.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="8.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="15.6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.6" r="1.15" fill="currentColor" stroke="none" />
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
   * keypad — `possible` began as `marks` with two of its four dots left out,
   * which said "fewer marks" exactly and was dropped because a glyph reading as
   * a worse copy of another glyph is worse than one sharing nothing with it.
   *
   * That reason lapsed when `marks` came off these keypads and is live again
   * now that it is back: the four sit in one row, on all five of these puzzles,
   * and the dots belong to the one that fills them all in.
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
  /*
   * The four directions, as one shape turned four ways: a shaft the width of
   * the grid and a head over the end of it.
   *
   * Longer and thinner than `back`, which is the same drawing doing a different
   * job. These four sit together in a block and are read as a set — what tells
   * one from another is which way it points, so the pointing is what is drawn
   * large, and the four have to be exact rotations of each other or the block
   * looks assembled rather than turned.
   */
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  /*
   * And the same shape again at forty-five degrees, for the one puzzle whose
   * board has eight ways out of a square rather than four.
   *
   * The head is the chevron above turned with it, which on a diagonal draws as
   * a right angle — two strokes of 8 against the four's 8.49, and a shaft of
   * 15.6 against 14. Near enough that a corner key and the key beside it read
   * as the same arrow pointing somewhere else, which is the whole job: in
   * Inertia these eight are one control, and a diagonal that looked like a
   * different sort of key would read as doing a different sort of thing.
   */
  arrowUpLeft: (
    <>
      <path d="M17.5 17.5 6.5 6.5" />
      <path d="M6.5 14.5v-8h8" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M9.5 6.5h8v8" />
    </>
  ),
  arrowDownLeft: (
    <>
      <path d="M17.5 6.5 6.5 17.5" />
      <path d="M14.5 17.5h-8v-8" />
    </>
  ),
  arrowDownRight: (
    <>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 9.5v8h-8" />
    </>
  ),
  /*
   * A turn, about the thing being turned.
   *
   * The dot is not decoration: without it this is `restart`, which is the same
   * ring wound the same way, and the two must not be confusable — one turns a
   * tile, the other throws the board away. Drawing the tile itself was the
   * first attempt and it does not survive the size: a square inside a ring
   * closes up into a blot at the 20 these are rendered at, which is the only
   * size that counts. A single dot stays open, and says the same thing — this
   * spins about its own centre.
   */
  rotate: (
    <>
      <path d="M5.6 7.5a7.5 7.5 0 1 1-1.1 3.9" />
      <path d="m9.4 7.2-3.9.6-.6-3.9" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  /*
   * A square that has been filled in, and one that has been left white.
   *
   * Pattern's own two, drawn as the board draws them rather than as the key
   * works: the key steps a square round a three-state cycle, but from an
   * untouched square — which is where nearly every press happens, since that is
   * how they all start — one of them gives black and the other white. The word
   * on a long press carries the rest of the cycle, which a picture cannot.
   *
   * Safe to draw them the board's way round in both themes because Pattern's
   * black and white are in `SEMANTIC` (palette.ts): its chapter states the rule
   * in terms of the colours, so the dark board keeps them rather than flipping
   * them, and a filled key still means the darker square on either theme.
   *
   * The house square, the same 17.2 with the same 2.6 corner as every other
   * square glyph here, so the pair reads as this app's squares and not as two
   * new shapes. Told apart by fill alone, which is the one difference that
   * survives being 20 pixels across.
   */
  black: <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" fill="currentColor" />,
  white: <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />,
  /*
   * A pencil, for the key that switches between writing in ink and pencilling.
   *
   * The one glyph on these five puzzles' screens that is not a square. That is
   * the point: the keypad above already carries four square-based glyphs about
   * pencil marks — `marks`, `possible`, `single`, `blank` — and a fifth square
   * would join a set it does not belong to. Those four are about what is *in* a
   * square; this is about what the next press will *be*, so it is drawn as the
   * thing that does the writing.
   *
   * The band is what keeps it a pencil at 20px rather than a diagonal stroke:
   * candidate B was this without it and read as a slash.
   */
  pencil: (
    <>
      <path d="M4.2 19.8 5.4 15.6 16.2 4.8a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L9 19.2Z" />
      <path d="m14.8 6.2 3 3" />
    </>
  ),
  /*
   * Twiddle's pair: a ring turning one way, and the same ring turned the other.
   *
   * Drawn without the centre dot that `rotate` above carries. That dot is Net's
   * and it earns its place there by keeping one glyph apart from `restart`,
   * which is a lone ring in a screen full of them. These two are never alone —
   * they sit either side of the up arrow, mirrored, and a pair of opposed
   * arrows says "this way or that" without help. Rendered at 20 beside the
   * dotted version, the dot is what the ring's inside fills up with.
   *
   * A square inside the ring was the other candidate, since what turns in
   * Twiddle is a block of tiles rather than one thing. It is the ink-blot shape
   * this file keeps rediscovering: at 20 the ring closes over the square.
   */
  turnLeft: (
    <>
      <path d="M5.6 7.5a7.5 7.5 0 1 1-1.1 3.9" />
      <path d="m9.4 7.2-3.9.6-.6-3.9" />
    </>
  ),
  turnRight: (
    <g transform="translate(24,0) scale(-1,1)">
      <path d="M5.6 7.5a7.5 7.5 0 1 1-1.1 3.9" />
      <path d="m9.4 7.2-3.9.6-.6-3.9" />
    </g>
  ),
  /*
   * Guess's two, both drawn as the board draws them: a peg is a disc.
   *
   * `hold` is upstream's own marker, not an invention — a bar the width of the
   * peg, drawn just under it (guess.c:1302), and `encode_ui` writes a held peg
   * as an underscore. Same bargain as Undead's monsters: where the puzzle has
   * already decided what the thing looks like, the key shows that.
   *
   * `place` is a peg with an arrow above it, and the arrow is there for the
   * pair rather than for itself. A bare disc beside a disc-with-a-bar is two
   * dots differing by two pixels, and these two are on screen together — Enter
   * offering Place while Space offers Hold is the ordinary state of this
   * puzzle. Rendered side by side at 20 before it was settled.
   *
   * The third face is `done`, borrowed: submitting a finished guess is
   * carry-out-what-you-set-up, the same as Rectangles' and Same Game's.
   */
  place: (
    <>
      <circle cx="12" cy="15.4" r="5.6" fill="currentColor" />
      <path d="M12 2.4v4.8" />
      <path d="m9 5 3 3 3-3" />
    </>
  ),
  hold: (
    <>
      <circle cx="12" cy="10.4" r="6.4" fill="currentColor" />
      <path d="M6.4 20.2h11.2" />
    </>
  ),
  /*
   * Flip: a square with half of it turned over.
   *
   * The invert mark, and it is the honest one here for a reason about the
   * parameters rather than about the drawing. What a press flips is the square
   * *and the ones tied to it*, and their shape is a setting — "Crosses" gives
   * the four neighbours, "Random" gives an arbitrary shape per square — so a
   * plus of five squares, which is otherwise the most informative picture
   * available, would be a lie on half the presets. What never varies is that
   * squares turn over, so that is what the glyph says.
   *
   * A square with a turning arrow was the other candidate and reads as rotation,
   * which nothing in Flip does, two cells from `turnLeft`.
   */
  flip: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path
        d="M20.6 3.4 3.4 20.6V6a2.6 2.6 0 0 1 2.6-2.6Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M20.6 3.4 3.4 20.6" />
    </>
  ),
  /*
   * Same Game's one new face: a region.
   *
   * Three tiles in an L rather than a tidy 2x2, because that is what a region
   * in this puzzle looks like — same-coloured neighbours, in whatever shape they
   * happen to fall. A block of four says "a block", which is the one shape a
   * samegame region almost never is.
   *
   * Its other two faces are `done` and `cancel`, borrowed rather than drawn.
   * That is the "one glyph, one thing" rule holding rather than bending: select
   * a region and then confirm or drop it is the same shape as Rectangles' drag,
   * and the two glyphs already mean carry-out-what-you-set-up and
   * drop-what-you-set-up. Group-based drawings were tried for both and all of
   * them lost — a struck-through group and a bare cross are two diagonals, and
   * those two sit side by side on this screen the moment a region is selected.
   */
  select: (
    <>
      <rect x="3.2" y="3.2" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <rect x="3.2" y="13.6" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <rect x="13.6" y="13.6" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
    </>
  ),
  /*
   * Pegs' one, and it is the game's whole rule drawn once: a peg hops over its
   * neighbour into the hole beyond, and the neighbour is what the move removes.
   * Both of the first two are filled because both have to be pegs for the move
   * to be legal, and the third is hollow because it has to be empty.
   *
   * Nothing in it is an arrow, and that is what decided it. This button sits in
   * a block of four arrow keys, and the four candidates that said "the arrows
   * will take this peg" — a disc with a chevron beside it, a disc ringed by four
   * chevrons — all read at 20 as a fifth arrow among four. The two that put a
   * curved arrow over one disc were worse: at 20 they are the redo glyph, which
   * is a real button two rows down.
   *
   * The same picture serves both of this key's faces. See the note beside pegs
   * in engine/keys.ts, where the board's own drawing of the mode is the reason.
   */
  jump: (
    <>
      <path d="M4.4 15a7.6 7.6 0 0 1 15.2 0" />
      <circle cx="4.4" cy="17.6" r="3" fill="currentColor" />
      <circle cx="12" cy="17.6" r="2" fill="currentColor" />
      <circle cx="19.6" cy="17.6" r="3" />
    </>
  ),
  /*
   * Dominosa's four, two pairs, and each pair is one thing before and after.
   *
   * The domino is the silhouette rather than the two squares it will cover,
   * because the button is named for what a press produces. Filled when one is
   * there, which is the board's own drawing: upstream paints a placed domino as
   * a solid slab of COL_DOMINO with the numbers reversed out of it in white
   * (dominosa.c:3192-3221), so outline-to-solid is that picture arriving.
   *
   * The line is the opposite statement and is drawn as the opposite picture:
   * two squares held apart by a bar, where the domino is one shape. Its `On` is
   * a thicker bar rather than a filled anything — there is nothing to fill, and
   * the board's own mark is a one-pixel rule along the shared border.
   *
   * A dashed divider inside the domino outline was the other line candidate and
   * it lost twice over: at 20 the dashes close up into a solid stroke, so it
   * became the domino key with a spot on it, and it says "one shape" where the
   * whole point of the mark is that these two are not one shape.
   */
  domino: (
    <>
      <rect x="2.4" y="7" width="19.2" height="10" rx="2.4" />
      <path d="M12 7v10" />
    </>
  ),
  dominoOn: <rect x="2.4" y="7" width="19.2" height="10" rx="2.4" fill="currentColor" />,
  line: (
    <>
      <rect x="1.8" y="7" width="7.8" height="10" rx="2" />
      <rect x="14.4" y="7" width="7.8" height="10" rx="2" />
      <path d="M12 5.6v12.8" />
    </>
  ),
  lineOn: (
    <>
      <rect x="1.8" y="7" width="7.8" height="10" rx="2" />
      <rect x="14.4" y="7" width="7.8" height="10" rx="2" />
      <path d="M12 5.6v12.8" strokeWidth="3.4" />
    </>
  ),
  /*
   * Untangle's two, and they are both nouns rather than verbs.
   *
   * `vertex` is one point with its edges running off it — the thing the button
   * acts on, drawn the way the board draws it, with the picking-up and the
   * putting-down left to the word. Net's padlock is the same bargain and for
   * the same reason: a key that does a thing and undoes it cannot have a
   * picture of the doing.
   *
   * Two that tried to show the doing both lost at 20. The node lifted off a
   * dashed ghost of where it came from turns the ghost into a smudge; a dashed
   * ring around the node closes into the halo this file has been caught by
   * before (see `rotate`).
   *
   * `cycle` is four points with one of them picked, which is what "cycle
   * through all the points" looks like standing still. It carries no arrow, and
   * that was the deciding constraint for both: this pair sits in a block with
   * four arrow keys, and anything arrow-shaped reads at 20 as a fifth one. A
   * row of three dots with an arrow threaded through it was tried and is the
   * thing that rule exists to stop.
   */
  vertex: (
    <>
      <path d="M12 12 4 5.6" />
      <path d="M12 12 20.4 8" />
      <path d="M12 12 8.6 20.6" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </>
  ),
  cycle: (
    <>
      <circle cx="12" cy="4.8" r="2.4" fill="currentColor" />
      <circle cx="19.2" cy="12" r="2.4" />
      <circle cx="12" cy="19.2" r="2.4" />
      <circle cx="4.8" cy="12" r="2.4" />
    </>
  ),
  /*
   * Black Box's three, plus the padlock below opened.
   *
   * `laser` is an emitter with three rays spreading out of it, and the rays fan
   * rather than point because this button sits among four arrows: a single
   * straight beam is a dash at 20, and a beam with a head on it is an arrow.
   * Two others lost — a beam with a dot at the far end reads as a key, and a
   * ring with a beam through it as a coin.
   *
   * `ball` is a cell with a ring in it and `ballOn` the same cell with the ring
   * filled, which is the board: a guess is drawn as a black circle inside an
   * arena square, and a press puts one there or takes it away. The square is
   * doing work — what this key acts on is a cell of the arena, and a bare disc
   * would have said "a ball" without saying where.
   */
  laser: (
    <>
      <rect x="2.4" y="8.4" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <path d="M12.4 12h9" />
      <path d="M12.8 7.6 20 5.4" />
      <path d="M12.8 16.4 20 18.6" />
    </>
  ),
  ball: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="4.4" />
    </>
  ),
  ballOn: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
    </>
  ),
  /*
   * The squares the rest of the collection fills in, on the same 17.2 house
   * square as `black` and `white` above. Nine puzzles put one of three or four
   * things in a cell and say which in their label, so these are the vocabulary
   * those faces are drawn from — with `black`, `white` and `blank` doing double
   * duty where the thing really is the same thing.
   *
   * `slash` is the same drawing as `blank`, and that is allowed rather than
   * tidied away. There it is a square with its marks struck out; here it is
   * Slant's line leaning right, which is what that puzzle *puts in* a square.
   * Two puzzles, never on screen together, and folding them into one name would
   * make both call sites read wrong.
   *
   * `emptyCell` is a square with a dash in it rather than a bare outline,
   * because three of these puzzles need "white" and "empty" to be different
   * pictures — Unruly and Mosaic play with both, and a bare outline is already
   * `white`. The dash is the shortest mark that says "nothing here" without
   * being a line, a dot or a cross, all three of which mean something else in
   * this set.
   */
  slash: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M7.4 16.6 16.6 7.4" />
    </>
  ),
  backslash: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="m7.4 7.4 9.2 9.2" />
    </>
  ),
  emptyCell: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M8.6 12h6.8" />
    </>
  ),
  dotSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </>
  ),
  circleSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="4.6" />
    </>
  ),
  /*
   * A tent and a patch of grass, which is what Tents' two keys put down. The
   * tent is upstream's own shape — its board draws a triangle with a pole — and
   * the grass is three blades, since one is a tally mark and two is a quotation
   * mark.
   */
  tent: (
    <>
      <path d="M12 4.4 3.6 19.6h16.8Z" />
      <path d="M12 4.4v15.2" />
    </>
  ),
  grass: (
    <>
      <path d="M4.6 20.4c0-5 1.4-8 3.4-9.6" />
      <path d="M12 20.4c0-6.4.8-10.4 0-14.8" />
      <path d="M19.4 20.4c0-5-1.4-8-3.4-9.6" />
    </>
  ),
  /* A lit lamp: Light Up's whole game in one glyph, and its board draws the
     same thing — a disc with the light coming off it. */
  lamp: (
    <>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
      <path d="M12 2.6v2.6" />
      <path d="M12 18.8v2.6" />
      <path d="M2.6 12h2.6" />
      <path d="M18.8 12h2.6" />
      <path d="m5.4 5.4 1.8 1.8" />
      <path d="m16.8 16.8 1.8 1.8" />
      <path d="m18.6 5.4-1.8 1.8" />
      <path d="m7.2 16.8-1.8 1.8" />
    </>
  ),
  /*
   * Four more of the same square, for Magnets' poles and its two markers. The
   * `?` is a glyph rather than a drawing because upstream's is too: it writes
   * two question marks on the domino, and there is no picture of "I am not
   * sure" that a square can hold at 20 pixels.
   */
  plusSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 7.6v8.8" />
      <path d="M7.6 12h8.8" />
    </>
  ),
  minusSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M7.6 12h8.8" />
    </>
  ),
  crossSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="m8.4 8.4 7.2 7.2" />
      <path d="m15.6 8.4-7.2 7.2" />
    </>
  ),
  questionSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5" />
      <path d="M12 16.9v.1" />
    </>
  ),
  /*
   * Tracks' rail: two sleepers across a line, which is what its board draws
   * inside a square once you say a track goes through it. Its other key takes
   * `crossSquare`, since a cross on an edge is exactly what upstream calls it.
   */
  track: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M3.4 12h17.2" />
      <path d="M9 8.8v6.4" />
      <path d="M15 8.8v6.4" />
    </>
  ),
  /*
   * Filling's second key adds one square to the run it is about to fill and
   * takes it out again. The board says so by drawing that square heavier, so
   * this is a square with a heavier outline, and its opposite is the plain one.
   */
  pickCell: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" strokeWidth="3.4" />
    </>
  ),
  /*
   * Flood's two. The first is a drop falling into the corner it floods — the
   * whole board runs from that one square, so the glyph is the corner and not
   * the grid. The second is the skip-forward mark, for replaying the solver a
   * move at a time: a solid triangle against a bar, which is the one arrow-like
   * shape in this set that no line-arrow could be mistaken for.
   */
  floodFill: (
    <>
      <path d="M4.2 4.2h6.4v6.4H4.2Z" fill="currentColor" />
      <path d="M17 6.6c1.9 2.4 3 4.1 3 5.4a3 3 0 0 1-6 0c0-1.3 1.1-3 3-5.4Z" />
      <path d="M4.2 14.6v5.2h5.2" />
      <path d="M13.4 19.8h6.4" />
    </>
  ),
  advance: (
    <>
      <path d="M5 5.4 15 12 5 18.6Z" fill="currentColor" />
      <path d="M18.6 5.4v13.2" />
    </>
  ),
  /*
   * Palisade's pair: a square with one side drawn as a wall, and the same side
   * struck through. Which side does not matter and cannot — the cursor stands
   * on the border it will act on, and the board draws which one that is.
   */
  edge: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 3.6v16.8" strokeWidth="3.4" />
    </>
  ),
  noEdge: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 3.6v4.4" />
      <path d="M12 16v4.4" />
      <path d="m9.4 9.4 5.2 5.2" />
      <path d="m14.6 9.4-5.2 5.2" />
    </>
  ),
  /*
   * The last five puzzles, whose keys open something and close it again rather
   * than putting a thing in a square. Each pair is the same object twice, the
   * way Sixteen's and Dominosa's are: what identifies the button survives the
   * press, and what changes says which half of the flow it is in.
   *
   * Bridges' island is a disc with four stubs — the board's own islands, which
   * bridges run off in four directions. Finished, it gains the ring upstream
   * draws round one you have said you are done with.
   *
   * Signpost's two are the same two squares, and which of them is filled is the
   * whole message: the filled one is the square the cursor is standing on, so
   * "from here" is filled on the left and "to here" filled on the right. No
   * arrowhead, though this is the one puzzle whose board is made of arrows —
   * these sit beside four of ours, and that is the constraint that wins.
   *
   * Pearl's is a line turning a corner inside a square, which is the shape that
   * puzzle is made of and the one thing a loop segment can look like at 20.
   *
   * Galaxies' arrow points at its dot, which is what its markers are for: an
   * arrow you drop in a square to remind yourself which dot owns it.
   *
   * Map's stipple is upstream's own word and drawing — a region dotted in a
   * colour you are not yet sure of.
   */
  island: (
    <>
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <path d="M12 3.4v3.4" />
      <path d="M12 17.2v3.4" />
      <path d="M3.4 12h3.4" />
      <path d="M17.2 12h3.4" />
    </>
  ),
  islandDone: (
    <>
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <circle cx="12" cy="12" r="8.4" />
    </>
  ),
  linkFrom: (
    <>
      <rect x="2.4" y="8" width="8" height="8" rx="1.8" fill="currentColor" />
      <path d="M10.8 12h2.4" />
      <rect x="13.6" y="8" width="8" height="8" rx="1.8" />
    </>
  ),
  linkTo: (
    <>
      <rect x="2.4" y="8" width="8" height="8" rx="1.8" />
      <path d="M10.8 12h2.4" />
      <rect x="13.6" y="8" width="8" height="8" rx="1.8" fill="currentColor" />
    </>
  ),
  drawLine: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M3.6 12h4.8a3.6 3.6 0 0 1 3.6 3.6v4.8" />
    </>
  ),
  galaxyArrow: (
    <>
      <circle cx="17.6" cy="6.4" r="2.6" fill="currentColor" />
      <path d="M4.2 19.8 14.4 9.6" />
      <path d="M4.2 14.4v5.4h5.4" />
    </>
  ),
  stipple: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="8.4" cy="8.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="8.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="15.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  /*
   * Mines' three: open this one, open the ring around it, and the flag.
   *
   * `uncover` is a square with its corner turned back, which is the one thing
   * that says "there is something under this" without drawing what. Three other
   * ideas lost at 20: a centre dot said only "a square with a thing in it", a
   * burst read as noise, and a lid lifting off produced a caret that sat two
   * cells from four real arrow keys.
   *
   * `chord` is the same square shrunk to its middle and given its eight
   * neighbours, because that is exactly the move — "if the square has exactly as
   * many flags surrounding it as it should have mines, then all the covered
   * squares next to it which are not flagged will be uncovered". A centre with
   * four arrows was the obvious alternative and is the universal move/pan glyph,
   * two cells from the arrows again; a full 3x3 grid is the `type` icon.
   *
   * `flag` is worn by both of Space's faces, place and remove, for the reason
   * `lock` above gives: the board draws which state the square is actually in,
   * so the key shows the thing and the word says the direction. Here the word
   * can be exact, because upstream reports "Mark" or "Unmark" and we are only
   * repeating it.
   */
  uncover: (
    <>
      <path d="M3.6 6.2a2.6 2.6 0 0 1 2.6-2.6h11.6a2.6 2.6 0 0 1 2.6 2.6v11.6a2.6 2.6 0 0 1-2.6 2.6H6.2a2.6 2.6 0 0 1-2.6-2.6Z" />
      <path d="M14.4 3.6v6.4h6" />
    </>
  ),
  chord: (
    <>
      <rect x="9" y="9" width="6" height="6" rx="1.3" fill="currentColor" />
      <circle cx="4.2" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="19.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="19.8" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  flag: (
    <>
      <path d="M6.4 20.6h11.2" />
      <path d="M8.6 20.6V3.8" />
      <path d="M8.6 4.6h9.2l-2.6 3.6 2.6 3.6H8.6" />
    </>
  ),
  /*
   * Netslide's one key: a couple of tiles, and a push.
   *
   * Direction is the one thing it cannot honestly show, because the press has
   * no fixed one — the cursor lives on the ring of arrows around the grid, and
   * what it slides is whichever row or column the arrow it is sitting on points
   * into. So the arrow here is a convention, the way `jumble`'s crossed paths
   * do not claim a particular shuffle, and the board's own highlighted arrow is
   * what says which way this press will go.
   *
   * Two tiles rather than three: at 20 a third merges the row into a bar. The
   * two obvious alternatives are both taken — a bar and an arrow reads as a
   * fifth arrow key beside the four it would sit among, and a filled square
   * with an arrow is already Sixteen's `carryTile`.
   */
  slide: (
    <>
      <rect x="2.4" y="9.3" width="5.4" height="5.4" rx="1.2" />
      <rect x="8.6" y="9.3" width="5.4" height="5.4" rx="1.2" />
      <path d="M15.4 12h5.2" />
      <path d="m18 9.4 2.6 2.6-2.6 2.6" />
    </>
  ),
  /* --- Sixteen's two sticky locks, and the arrows while one is on ---------
   *
   * A padlock, because that is what these two keys are: upstream calls them
   * "Lock tile" and "Lock pos" and the reader presses one to hold something
   * still. They used to be a tile with an arrow beside it, which drew the
   * *consequence* — something moves — and so read as a third way to push,
   * beside the two that really do push. What the key does is lock.
   *
   * The pair are told apart by what is being held, in the distinction these
   * two keys have always used here: a filled square is a tile, an outline is
   * the place a tile sits in. Locking the tile carries it along with the
   * cursor; locking the place keeps the cursor still and lets tiles run past.
   * Open shackle while off, shut while on — which is also when the button
   * wears its pressed background, so the state is said twice.
   *
   * The padlock is the whole glyph and the square is a badge inside it, which
   * is the second arrangement tried and the reason is the shackle. A padlock
   * beside a square has to be small, and a small padlock's shackle moves by
   * about a pixel between open and shut at 20 — so the state, which is the
   * thing these keys exist to show, was the part that disappeared. Full size
   * it swings clear and is legible in both themes. An earlier attempt failed
   * the other way round, as a badge stuck on the corner of the square, where
   * the shackle closed up entirely and the lock read as a second little square.
   *
   * So the square gives up its size to the lock and keeps only its fill, which
   * is enough: the two buttons sit side by side and are read against each other.
   */
  lockTile: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.6-.9" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" fill="currentColor" />
    </>
  ),
  lockTileOn: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.8 0V11" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" fill="currentColor" />
    </>
  ),
  lockPlace: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.6-.9" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" />
    </>
  ),
  lockPlaceOn: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.8 0V11" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" />
    </>
  ),
  /*
   * And the four arrows while a lock is on, which is the one moment in the
   * collection when an arrow key stops moving the cursor and starts playing.
   *
   * Upstream makes that switch invisible — `cur_mode` never reaches
   * `game_redraw` — so the arrows have to say it themselves, or the reader is
   * pressing the same four buttons for two different jobs with nothing to tell
   * them apart. A tile at the head of the arrow, filled, and the arrow driving
   * into it: this one shoves, it does not point.
   */
  pushUp: (
    <>
      <rect x="8.2" y="2.6" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M12 21v-7.4" />
      <path d="m8.4 17.2 3.6-3.6 3.6 3.6" />
    </>
  ),
  pushDown: (
    <>
      <rect x="8.2" y="13.8" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M12 3v7.4" />
      <path d="m8.4 6.8 3.6 3.6 3.6-3.6" />
    </>
  ),
  pushLeft: (
    <>
      <rect x="2.6" y="8.2" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M21 12h-7.4" />
      <path d="m17.2 8.4-3.6 3.6 3.6 3.6" />
    </>
  ),
  pushRight: (
    <>
      <rect x="13.8" y="8.2" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M3 12h7.4" />
      <path d="m6.8 8.4 3.6 3.6-3.6 3.6" />
    </>
  ),
  /* --- Sixteen's rim pair: one step on, one step back ----------------------
   *
   * A tile with a plus, and a tile with a minus. It is the smallest claim these
   * two buttons can make, and it is the largest one this side is entitled to.
   *
   * What we know about them is exactly "a pair of inverse operations". We
   * cannot tell which edge of the rim the cursor is on — upstream reports the
   * same word on all four and means whichever way that edge's arrow points —
   * so we do not know the axis, let alone the direction. An icon should be as
   * specific as its knowledge and no more, and two versions were drawn that
   * were more: `slide` mirrored, which names left and right outright, and a
   * reference arrow with a smaller one along or against it, defended on the
   * grounds that the reference was only layout. An arrow points; pointing is
   * meaning; on the top rim both of those said "right" for a slide running up.
   *
   * A third version dropped arrows for a ring turning each way, on the argument
   * that a slide wraps — `(cx - dx + w) % w` in execute_move, so a line really
   * is a cycle. True, and still too much: what a reader sees is a row sliding
   * sideways, with the wrap a detail at the end of it, and the manual's own
   * word is "slide". The ring was not chosen because it describes Sixteen. It
   * was chosen because, having ruled out direction, rotation is nearly the only
   * direction-free pair of inverses there is — which is searching under a
   * constraint rather than designing.
   *
   * Push and pull were tried too, in nine forms across two rounds: palm against
   * a block and hook around it, plate and claw, near and far, small and large,
   * a door handle in and out, a spring squeezed and stretched. None survives 20
   * and they all fail the same way — push differs from pull by the shape of a
   * grip or the width of a gap, and 20px has no room for a small feature. The
   * verbs are good, so they went to the words instead, where there is room.
   *
   * That leaves the quantity, and the quantity is exact rather than a metaphor:
   * upstream writes these moves `R{y},+1` and `R{y},-1`. One step on, one step
   * back. The square frame rather than a circle because the thing taking the
   * step is a tile, and a rounded square is what a tile is throughout this file.
   */
  pushLine: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" />
      <path d="M12 7.8v8.4" />
      <path d="M7.8 12h8.4" />
    </>
  ),
  pullLine: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" />
      <path d="M7.8 12h8.4" />
    </>
  ),
  /*
   * Rectangles' four faces, worn two at a time by the same two buttons.
   *
   * `mark` is a rectangle, wider than tall so that it is not one of this file's
   * several squares: what the key starts is a rectangle being dragged out, and
   * a rectangle is the whole of what the puzzle is about. `erase` is the same
   * box with its inside crossed out, which is exactly what that key does —
   * "erase the contents of a rectangle without affecting its edges", says its
   * chapter, so the outline stays and the middle goes.
   *
   * The eraser glyph everyone else would reach for lost its band at 20 and read
   * as a blob; a box with a broken inner line read as noise. Both were drawn and
   * looked at before this pair was kept.
   *
   * `done` and `cancel` are a tick and a cross, and there is nothing clever to
   * say about them. `cancel` repeats `close` above rather than sharing it,
   * because the two mean different things — one shuts a dialog, one abandons a
   * drag — and a glyph in this file stands for one thing.
   */
  mark: <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.6" />,
  erase: (
    <>
      <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.6" />
      <path d="m9.4 9.6 5.2 4.8" />
      <path d="m14.6 9.6-5.2 4.8" />
    </>
  ),
  done: <path d="m4.6 12.4 5 5 9.8-11" />,
  cancel: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  /* A padlock, shut. The key it stands for opens one as readily as it closes
     one, but a shut lock is what "lock" looks like everywhere, and the board
     draws which state the tile is actually in. */
  lock: (
    <>
      <rect x="5.6" y="10.8" width="12.8" height="9" rx="2" />
      <path d="M8.6 10.8V7.8a3.4 3.4 0 0 1 6.8 0v3" />
    </>
  ),
  /*
   * And the same padlock with the shackle sprung, for the one puzzle whose back
   * end says which way its press will go. Net's does not, which is why Net has
   * only the shut one.
   *
   * The body does not move. Swinging the shackle clear and sliding the body
   * left reads as "open" a shade more plainly at 56, and at 20 it reads as a
   * different object — the same rule that keeps Sixteen's square still.
   */
  unlock: (
    <>
      <rect x="5.6" y="10.8" width="12.8" height="9" rx="2" />
      <path d="M8.6 10.8V7.8a3.4 3.4 0 0 1 6.8-.6" />
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
