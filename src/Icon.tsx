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
  | 'carryTile'
  | 'holdPlace'
  | 'carryTileOn'
  | 'holdPlaceOn'
  | 'slide'
  | 'place'
  | 'hold'
  | 'flip'
  | 'select'
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
   * Sixteen's two sticky modifiers, which are the same move told apart by what
   * the cursor does: a square and an arrow, twice.
   *
   * Its chapter describes them as one of the two ways to play — "move the
   * cursor onto a tile, hold Control and press an arrow key to move the tile
   * under the cursor and move the cursor along with the tile. Or, hold Shift to
   * move only the tile." So one carries the square away and the cursor rides
   * with it, and the other leaves the cursor where it is while tiles go past.
   *
   * Drawn as that difference and nothing else, in where the arrow sits rather
   * than in what it points at. `carryTile` puts it on the square's own line and
   * against its edge, so the two are one object going somewhere together, and
   * fills the square because it is a tile. `holdPlace` lifts the square clear
   * and runs the arrow underneath it, apart: the board goes past, the square
   * stays, and it is drawn hollow because it is a place and not a tile.
   *
   * An earlier pair sent the arrow *through* an outlined square, which is the
   * more obvious picture of "passes by" and the one thing that cannot be drawn
   * here — line and outline close into a blot at 20px, the same way the first
   * `rotate` did. Rendered side by side at 20 light, 20 dark and 56 before this
   * pair was picked, which is the only way to find that out.
   *
   * The square drops to 9 across from the house 17.2, which it has to: these are
   * the only two glyphs here that put a square and something else on the same 24
   * grid, and a full-size square leaves no room for an arrow that reads. Each is
   * centred in its own box rather than sharing the square's position, because
   * they are 40 pixels apart in separate buttons and never seen edge to edge.
   */
  carryTile: (
    <>
      <rect x="3.2" y="7.2" width="9" height="9" rx="2" fill="currentColor" />
      <path d="M14 11.7h6.6" />
      <path d="m17.6 8.5 3.2 3.2-3.2 3.2" />
    </>
  ),
  holdPlace: (
    <>
      <rect x="3.2" y="3.4" width="9" height="9" rx="2" />
      <path d="M3 19h17.6" />
      <path d="m17.4 15.8 3.2 3.2-3.2 3.2" />
    </>
  ),
  /*
   * And the same two with the mode switched on, which they have to have because
   * Sixteen draws it nowhere else: `cur_mode` lives in its `game_ui` and never
   * reaches `game_redraw`, so the key is the only place the state exists.
   *
   * The square does not move. That is deliberate and it is the whole design:
   * the reader finds the button by its square — filled for the tile, hollow for
   * the place — so the thing that identifies it has to survive being pressed.
   * What changes is the arrow, which becomes a double chevron: the arrows have
   * stopped walking the cursor and started shoving the board, and that is a
   * statement about the arrows, not about the square.
   *
   * Four pairs were rendered at 20 light, 20 dark on the pressed surface, and 56.
   * A padlock badge lost its shackle at 20 and read as a second small square;
   * a ring round the square is the ink-blot shape this file has been caught by
   * before; and swapping the fill — the obvious "inverted" idea — makes carry-on
   * identical to hold-off, which is worse than saying nothing.
   */
  carryTileOn: (
    <>
      <rect x="3.2" y="7.2" width="9" height="9" rx="2" fill="currentColor" />
      <path d="m14 8.5 3.2 3.2-3.2 3.2" />
      <path d="m18 8.5 3.2 3.2-3.2 3.2" />
    </>
  ),
  holdPlaceOn: (
    <>
      <rect x="3.2" y="3.4" width="9" height="9" rx="2" />
      <path d="m13.6 15.8 3.2 3.2-3.2 3.2" />
      <path d="m17.6 15.8 3.2 3.2-3.2 3.2" />
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
