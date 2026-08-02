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
    /** Names the one-press language control, whose visible label is the other
        language's own name — so the label cannot say what the button is for. */
    switchLang: 'Switch to 中文',
    /** The way to the manual, at the foot of the gallery. */
    manual: 'Manual',
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

  play: {
    help: 'How to play',
    /**
     * Names the board shown above the blurb, for a reader who cannot see it.
     * Says only what it is a picture of: the words below say what to do with
     * it, and most of these are finished boards but not all — six puzzles have
     * no answer worth photographing (see scripts/build-solved.mjs).
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

  /**
   * The palette tuning panel. Every one of these is a plain-language gloss on
   * a constant in engine/palette.ts, written for someone moving a slider and
   * watching the board — not for someone reading the algorithm. The numbers in
   * them were measured by sweeping each constant over all 426 colours; the
   * comment on each `const` has the workings.
   */
  tuning: {
    title: 'Palette tuning',
    open: 'Tune the palette',
    subtitle:
      'Six numbers turn every light colour into its dark one. Drag to see what each does. The marked span is where the value is worth leaving; outside it, something named breaks.',
    lightOnly:
      'These only apply to the dark board. Switch to dark to see them do anything.',
    reset: 'Reset',
    resetAll: 'Reset all',
    band: 'Recommended',
    dflt: 'Default',
    knobs: {
      FLOOR: {
        name: 'Darkest point',
        what: 'How black the dark board is. Everything that was lightest upstream lands here.',
        low: 'Board goes darker; at 0 a kept black is pure #000000 with nowhere left to go.',
        high: 'Board goes pale — by 0.20 it is a mid grey, and ink loses a third of its contrast.',
      },
      CEILING: {
        name: 'Brightest point',
        what: 'How bright the ink gets. Everything that was darkest upstream lands here.',
        low: 'Ink goes grey rather than white. Still readable, just softer.',
        high: 'Glare. From 0.94 up, sixty slots cross into hurting to look at; 1.00 is pure white.',
      },
      VEIL: {
        name: 'Colour dimming',
        what: 'How far coloured things are pulled down. Touches only the 200 slots that have a hue — the board and the ink do not move at all.',
        low: 'Colours get brighter and start to glow: at 0 the cyans and yellows are the loudest thing on screen.',
        high: 'Everything muddies. Past 0.55 the hues stop standing off the board.',
      },
      LIFT_CEILING: {
        name: 'Dark-colour lift',
        what: 'How far a colour picked to be dark on white paper may be raised. Raising it costs colour, so this is where to stop.',
        low: 'Dark blues and reds sink back into the board — the thing this lift exists to prevent.',
        high: 'They wash out. By 0.82 a navy is lavender.',
      },
      ACHROMATIC: {
        name: 'Grey / colour line',
        what: 'Below this saturation a colour counts as structure and is turned over; above it, as meaning and is kept.',
        low: 'At 0 even pure grey counts as coloured — the whole board stops turning over and dark mode disappears.',
        high: 'Muted colours start being treated as greys and inverted.',
      },
      PAPER_BOARD: {
        name: 'Paper board height',
        what: 'Where the board moves to in the three games that draw a kept black on it. Light Up, Singles and Range only.',
        low: 'Black writing on the board stops being readable against it.',
        high: 'The light things drawn on the paper sink into it instead.',
      },
    },
  },

  notFound: {
    title: 'Not found',
    body: (name: string) => `There is no puzzle called “${name}”.`,
    back: 'Back to the list',
  },
}

/** The shape every other catalogue has to fill. */
export type Strings = typeof en
