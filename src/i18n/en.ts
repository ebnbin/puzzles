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

  launcher: {
    settings: 'Settings',
    /** Named for the game, since the button is in its corner. */
    hide: (game: string) => `Hide ${game}`,
    show: (game: string) => `Show ${game}`,
    hidden: (count: number) => `Hidden (${count})`,
    /** Said in passing when a tile is put away or brought back. */
    nowHidden: (game: string) => `${game} hidden`,
    nowShown: (game: string) => `${game} shown`,
    install: 'Install app',
    /** The two steps iOS insists on doing by hand. */
    installIosIntro: 'Safari can put Puzzles on your Home Screen:',
    installIosShare: 'Tap the Share button',
    installIosAdd: 'Choose “Add to Home Screen”',
    credit:
      'Puzzles are the work of Simon Tatham and contributors, distributed under the MIT licence.',
    source: 'Source:',
  },

  settings: {
    title: 'Settings',
    haptics: 'Long-press vibration',
    appearance: 'Appearance',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    manual: 'Manual',
    manualHint: 'Rules and controls for every puzzle',
    done: 'Done',
  },

  play: {
    back: 'All puzzles',
    help: 'How to play',
    /** Leads out of the one-paragraph blurb and into the manual proper. */
    fullInstructions: 'Full instructions',
    close: 'Close',
    undo: 'Undo',
    redo: 'Redo',
    menu: 'Menu',
    switcher: 'Switch puzzle',
    /* Named for what the press does, not for where you are. */
    toDark: 'Switch to dark',
    toLight: 'Switch to light',
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
    marks: 'Fill in all pencil marks',
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
    /** Names the icon beside a field, which has only the field for context. */
    share: (what: string) => `Share ${what}`,
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
