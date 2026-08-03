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
   * The dialog behind the gallery's one settings button. Two things to decide
   * and one place to read more. The appearance is here and only here, now that
   * the puzzle screen's press has gone: three states, and this is the one
   * control in the app able to show three. The manual keeps a press of its own,
   * which commits to a side.
   */
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    manual: 'Manual',
    manualHint: 'Rules and controls for every puzzle',
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
     * The pair that replaced upstream's `M` on every keypad that had it. The
     * first leaves out everything the board has already ruled out; the second
     * takes the lot off so the first can start again, which is the only thing
     * that makes it fill rather than subtract.
     */
    possible: 'Fill in the possible pencil marks',
    blank: 'Clear all pencil marks',
    hint: 'Hint',
    jumble: 'Shuffle',
    ghost: 'Ghost',
    vampire: 'Vampire',
    zombie: 'Zombie',
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
