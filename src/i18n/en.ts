/**
 * Every word the app says for itself, in English.
 *
 * This file is the source: `zh.ts` is typed against it, so a string added here
 * without a translation is a compile error rather than a blank in the
 * interface.
 *
 * What is deliberately *not* here:
 *
 *   - The puzzle names, which are proper nouns and stay as upstream writes
 *     them, in the manual as well as the launcher.
 *   - Anything the back end says. Preset names, the status line, and the
 *     labels on the parameter dialogs are strings inside the compiled
 *     WebAssembly. Translating them means changing the C, and the whole point
 *     of this build is that the C is untouched.
 */
export const en = {
  /** The collection's name. Not translated — it is what it is called. */
  brand: 'Puzzles',

  /**
   * Under the name, and in the page's description.
   *
   * Not translated either, though for a different reason than the name. It
   * turns on "vibes" in the sense the phrase has picked up from vibe coding —
   * an interval spent waiting on a model — which the people it is addressed to
   * say in English whatever else they are speaking. Rendered in Chinese it
   * would be a loanword translated back into the language that borrowed it,
   * and the joke, which is the whole line, would not survive the trip.
   */
  tagline: 'Think between vibes.',

  launcher: {
    settings: 'Settings',
    /** Named for the game, since the button is in its corner. */
    hide: (game: string) => `Hide ${game}`,
    show: (game: string) => `Show ${game}`,
    hidden: (count: number) => `Hidden (${count})`,
    /** Said in passing when a tile is put away or brought back. */
    nowHidden: (game: string) => `${game} hidden`,
    nowShown: (game: string) => `${game} shown`,
    credit:
      'Puzzles are the work of Simon Tatham and contributors, distributed under the MIT licence.',
    source: 'Source:',
  },

  /**
   * The dialog behind the gallery's one settings button: one place to read
   * more, and the one control in the app that destroys something.
   *
   * The appearance used to live in here, because it had three states and this
   * was the only control able to show three at once. It has two now, so it is
   * a press in the bar outside — see ThemeToggle — and the names it is called
   * by are still kept here with the rest of the settings vocabulary.
   */
  settings: {
    title: 'Settings',
    language: 'Language',
    /**
     * The two the theme button is named by, in the bar rather than in here: it
     * says what a press would do, so the name is the side it is about to go to.
     */
    themeLight: 'Light',
    themeDark: 'Dark',
    manual: 'Manual',
    manualHint: 'Rules and controls for every puzzle',
    /**
     * The row that erases, in its two states. `eraseHint` is a list because
     * "everything" is not a size: a reader deciding this wants to know it is
     * their forty games and not the app itself. `eraseWhat` replaces it once
     * the row is armed, and is short because a button has appeared beside it
     * and the two have one row to share.
     */
    erase: 'Erase everything',
    eraseHint: 'Games, settings, and what is hidden',
    eraseWhat: 'This cannot be undone',
    eraseConfirm: 'Erase',
  },

  play: {
    help: 'How to play',
    /**
     * Names the board shown above the blurb, for a reader who cannot see it.
     * Says only what it is a picture of: the words below say what to do with
     * it, and most of these are finished boards but not all — six puzzles have
     * no answer worth photographing (see scripts/build-howto.mjs).
     */
    picture: (name: string) => `A ${name} board`,
    /** Leads out of the one-paragraph blurb and into the manual proper. */
    fullInstructions: 'Full instructions',
    close: 'Close',
    undo: 'Undo',
    redo: 'Redo',
    menu: 'Menu',
    /** The name in the bar is the way to the gallery, so it says where it
     *  goes rather than what it closes. */
    switcher: 'All puzzles',
    keypad: 'Puzzle keys',
    error: 'Something went wrong starting this puzzle.',
    /**
     * The four that move the board's own cursor, for the reader who asked for
     * them. Named as what they are and not as what they do, because what they
     * do is each puzzle's own answer — in Cube the arrow rolls the cube, in
     * Fifteen it slides a tile, in Sixteen it walks the rim — and a name that
     * tried to cover all thirty-nine would say nothing about any of them.
     */
    arrows: {
      group: 'Arrow keys',
      up: 'Up',
      down: 'Down',
      left: 'Left',
      right: 'Right',
      /**
       * And the corners, for the one puzzle that has them. Named as compounds
       * of the four above rather than as compass points: a reader who has just
       * read "Up" and "Left" off the two keys beside this one should not have
       * to work out that "north-west" is the same idea again.
       */
      upLeft: 'Up and left',
      upRight: 'Up and right',
      downLeft: 'Down and left',
      downRight: 'Down and right',
    },
    /**
     * And the keys that act where the arrows have got to, which is what makes
     * moving a cursor worth doing. Named per puzzle — see CURSOR_KEYS — because
     * what Enter does is the puzzle's own answer.
     *
     * These say the word on a long press where the arrows do not. An arrow
     * points, so it needs no gloss; a padlock says "lock" but not "lock what,
     * in this puzzle", and Net's is a tile you have finished with.
     */
    cursor: {
      rotateLeft: 'Rotate left',
      lock: 'Lock or unlock',
      /**
       * Named as the switch rather than as either side of it, which upstream's
       * own label is not: `current_key_label` says "Ink" when you are
       * pencilling and "Pencil" when you are not, because it names where the
       * press will take you. A word on a button that is only shown when the
       * button is held cannot move like that, so it names the pair.
       */
      pencil: 'Switch between ink and pencil',
      /**
       * Pattern's pair, which say what the picture says and nothing more.
       *
       * They used to name the whole cycle — "Black, then white, then grey" —
       * because upstream's keys step round one and the square on the button was
       * only the first press. They are named for a colour now and reach it in
       * one press from anywhere (see `does` in keys.ts), so there is no second
       * press left to describe. A tip that repeated the picture would be worth
       * removing if these were the only two; they are not, and a row where some
       * buttons answer a long press and others ignore it is worse than a short
       * answer.
       */
      black: 'Black',
      white: 'White',
      /**
       * Sixteen's two, named for what the arrows will do next rather than for
       * the mode being switched on, because the mode is not a thing the reader
       * can see — Sixteen never draws it. Upstream's own soft-key words are
       * "Lock tile" and "Lock pos", which say what is being held rather than
       * what that buys, and a reader holding the button down is asking the
       * second question.
       *
       * They differ in one clause and it is the whole difference, so the two
       * lines are built to be read against each other.
       */
      carryTile: 'Arrows carry this tile along',
      holdPlace: 'Arrows slide tiles past this square',
      /**
       * Twiddle's pair, in its chapter's words rather than in the back end's.
       * `current_key_label` says "Turn left" and "Turn right", which are short
       * because they are soft-key captions and ambiguous because turning left
       * is not a direction of rotation in most people's hands. The manual says
       * "rotate the current square anticlockwise or clockwise respectively",
       * and a long press has room for the word that cannot be misread.
       */
      turnLeft: 'Turn anticlockwise',
      turnRight: 'Turn clockwise',
      /**
       * Rectangles' four, which are two buttons through one flow rather than
       * four keys. The first two open a drag and are named for what they will
       * draw; the last two close one and are named for the press, because by
       * then the rectangle is on the board in front of the reader and what is
       * in question is only whether to keep it.
       */
      /**
       * Netslide's one, in the words its chapter borrows from Sixteen's: "use
       * the return key to move the row/column in the direction indicated". The
       * direction is the board's to indicate — the cursor is sitting on the
       * arrow that gives it — so this says which line moves and leaves which
       * way to the highlighted arrow the reader is looking at.
       */
      slide: 'Slide this row or column',
      /**
       * Mines' four, in its chapter's words. "Clear around" is the manual's own
       * name for the second — "if you left-click in an uncovered square, it
       * will clear around the square" — and it is worth the longer line, since
       * it is the one press here that opens squares the reader did not point at.
       *
       * The flag says which direction it is going, where Net's padlock cannot:
       * upstream reports "Mark" or "Unmark" from the square under the cursor,
       * so this only repeats it. The picture stays the same either way.
       */
      /**
       * Same Game's two, in its chapter's words. "Region" is the puzzle's own
       * noun for a run of touching squares of one colour, and it is worth
       * keeping: what is picked and removed is never a single square, which is
       * exactly why a lone one cannot be selected at all — and why the button
       * has nothing to say when the cursor is on one.
       */
      select: 'Select this region',
      remove: 'Remove the selected region',
      uncover: 'Uncover this square',
      chord: 'Clear around this square',
      flag: 'Flag this as a mine',
      unflag: 'Take the flag off',
      mark: 'Draw a rectangle',
      erase: 'Clear a rectangle, keeping its edges',
      done: 'Finish here',
      cancel: 'Cancel',
    },
  },

  /**
   * What a key does, for the keys that are a picture. Shown on a long press,
   * and what a screen reader calls the button. Named by the glyph, since a
   * glyph is only ever used for one thing.
   */
  keys: {
    clear: 'Clear',
    /*
     * The three answered on this side. The first leaves out everything the
     * board has already ruled out. The second goes the other way, reading the
     * marks rather than writing them. The third takes the lot off, which is the
     * only thing that makes the first fill again rather than subtract.
     *
     * "Only one answer" and not "one mark left", because the second reads two
     * ways: the square with one mark on it, and the value with one square left
     * to go in. Both are squares that can only be one thing, which is the whole
     * of what the key claims and all it is worth saying on a long press.
     *
     * The first said "Fill in the possible pencil marks" until `marks` came
     * back beside it, and two keys in one row cannot both begin "Fill in … the
     * pencil marks" — upstream's word is upstream's, so ours moved. It is the
     * better line anyway: this key subtracts far more often than it fills, and
     * "leave only" is the one sentence true of it in both directions.
     */
    possible: 'Leave only the pencil marks still possible',
    single: 'Fill in the squares with only one answer',
    blank: 'Clear all pencil marks',
    /**
     * Upstream's M, in upstream's words: the manual for Keen and for Towers
     * says it "will fill in a full set of pencil marks in every square that
     * does not have a main digit in it". The clause is the key; the rest of the
     * sentence says which squares, and a reader holding the button down is
     * looking at them.
     */
    marks: 'Fill in a full set of pencil marks',
    hint: 'Hint',
    jumble: 'Shuffle',
    ghost: 'Ghost',
    vampire: 'Vampire',
    zombie: 'Zombie',
    /**
     * A digit key that is also saying how many of itself are left to place.
     *
     * The key would otherwise need no name at all — a 9 says it is a 9 — so
     * this exists only because the number in its corner would be read out
     * beside it as a second digit.
     */
    left: (digit: string, count: number) => `${digit}, ${count} left to place`,
    /** Dominosa: light up every domino carrying this number. */
    highlight: (n: string) => `Highlight dominoes with ${n}`,
  },

  menu: {
    title: 'Puzzle menu',
    newGame: 'New game',
    restart: 'Restart',
    solve: 'Solve',
    preferences: 'Preferences',
    /**
     * Ours, and the only row in that section that is: everything above it comes
     * out of the compiled back end and is in English whatever the reader has
     * chosen. Last in the list for that reason as well as by request — the
     * puzzle's own settings are what the heading promises, and this is the app
     * adding one of its own underneath them.
     */
    arrows: 'Show arrow keys',
    gameId: 'Game ID',
    seed: 'Random seed',
  },

  /** The sheet that is only about which puzzle you are being set. */
  types: {
    title: 'Type',
    /**
     * On the one chip the puzzle came set to.
     *
     * Worth a word rather than a mark because it is not guessable from where
     * the chip sits: on twenty of the forty puzzles the default is not the
     * first in the list. Keen opens on the fifth of its eleven.
     */
    standard: 'Default',
  },

  dialog: {
    cancel: 'Cancel',
    ok: 'OK',
  },

  notFound: {
    title: 'Not found',
    body: (name: string) => `There is no puzzle called “${name}”.`,
    back: 'Back to the list',
  },
}

/** The shape every other catalogue has to fill. */
export type Strings = typeof en
