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
  },

  /**
   * What a key does, for the keys that are a picture. Shown on a long press,
   * and what a screen reader calls the button. Named by the glyph, since a
   * glyph is only ever used for one thing.
   */
  keys: {
    clear: 'Clear',
    /*
     * The three that replaced upstream's `M` on every keypad that had it. The
     * first leaves out everything the board has already ruled out. The second
     * goes the other way, reading the marks rather than writing them. The third
     * takes the lot off, which is the only thing that makes the first fill
     * again rather than subtract.
     *
     * "Only one answer" and not "one mark left", because the second reads two
     * ways: the square with one mark on it, and the value with one square left
     * to go in. Both are squares that can only be one thing, which is the whole
     * of what the key claims and all it is worth saying on a long press.
     */
    possible: 'Fill in the possible pencil marks',
    single: 'Fill in the squares with only one answer',
    blank: 'Clear all pencil marks',
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
    gameId: 'Game ID',
    seed: 'Random seed',
  },

  /** The sheet that is only about which puzzle you are being set. */
  types: {
    title: 'Type',
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
