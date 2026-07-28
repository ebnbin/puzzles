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
    credit:
      'Puzzles are the work of Simon Tatham and contributors, distributed under the MIT licence.',
    source: 'Source:',
  },

  settings: {
    title: 'Settings',
    design: 'New design',
    designOn: 'Redesigned for phone and desktop',
    designOff: 'The original layout',
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
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Leave fullscreen',
    menu: 'Menu',
    keypad: 'Puzzle keys',
    error: 'Something went wrong starting this puzzle.',
  },

  menu: {
    title: 'Puzzle menu',
    newGame: 'New game',
    restart: 'Restart',
    solve: 'Solve',
    enterGameId: 'Game ID…',
    enterSeed: 'Seed…',
    preferences: 'Preferences…',
    type: 'Type',
    share: 'Share',
    gameId: 'Game ID',
    seed: 'Random seed',
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
