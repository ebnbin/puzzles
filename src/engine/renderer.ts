/**
 * The puzzle's drawing layer, ported from upstream's emcclib.js into
 * TypeScript so it is ours to change.
 *
 * The back end draws in immediate mode — fill this rectangle, stroke that
 * line — so this is not React rendering shapes; React owns the canvas element
 * and its lifecycle, and these are the operations the C code issues into it.
 * Isolating them here is what makes them replaceable: the same interface
 * could be backed by SVG, by WebGL, or by a recorder that captures draw calls
 * for comparison against the original build.
 *
 * Drawing goes to an offscreen canvas and is copied across in one blit at the
 * end of each frame, which is how upstream avoids flicker.
 */

export interface Size {
  w: number
  h: number
}

import { BACKGROUND, FIGURE, figureInk, forDarkBoard, RIM } from './palette'

/** A shape the board asked for, with the colour slot it asked for it in. */
export type Drawn =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; colour: number }
  | { kind: 'poly'; points: number[]; colour: number }

export class CanvasRenderer {
  private readonly onscreen: HTMLCanvasElement
  private readonly offscreen: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  /** Colour strings exactly as the back end numbered them. */
  private readonly named: string[] = []

  /** What is actually drawn with: `named`, or its dark-board rewrite. */
  private colours: string[] = []

  private dark = false
  private repalette = true

  /**
   * Logical pixels per physical pixel. Always an integer of at least 1, so
   * pixel boundaries land where the back end expects; not the same thing as
   * devicePixelRatio.
   */
  private scale = 1

  /** Smallest rectangle covering this frame's changes, in physical pixels. */
  private dirty: { x0: number; y0: number; x1: number; y1: number } | null = null

  private readonly blitters = new Map<number, HTMLCanvasElement>()

  /** Font metrics are expensive to measure, and there are few distinct fonts. */
  private readonly midpoints = new Map<string, number>()

  /** Which puzzle this is, so the dark palette can know its exceptions. */
  private readonly game: string

  constructor(canvas: HTMLCanvasElement, game = '') {
    this.game = game
    this.onscreen = canvas
    this.offscreen = document.createElement('canvas')
    const ctx = this.offscreen.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('no 2d context')
    this.ctx = ctx
  }

  // --- colours ------------------------------------------------------------

  setColour(index: number, css: string) {
    this.named[index] = css
    this.repalette = true
  }

  /**
   * Which way up the board is. The back end is never told: it names its
   * colours once and then only ever refers to them by number, so the dark
   * board is this table rewritten between two frames.
   */
  setDark(dark: boolean): boolean {
    if (dark === this.dark) return false
    this.dark = dark
    this.repalette = true
    return true
  }

  /**
   * The back end offers to take its background colour from the page. Only an
   * opaque sRGB colour will do; anything else — including the transparent
   * default — leaves it to pick its own, which is what upstream's pages get.
   *
   * Left transparent deliberately, in both themes. Handing back #e6e6e6 — the
   * very grey the back end falls back to — is not the same as handing back
   * nothing: 230/255 is not 0.9, and that rounding moves the derived colours
   * in twelve of the forty games. The dark board comes from the palette
   * rewrite instead, which leaves this path exactly as upstream has it.
   *
   * That rewrite — every rule about what a colour becomes on dark, and why —
   * is in ./palette.ts. This function is the reason it has to exist.
   */
  defaultColour(): [number, number, number] | null {
    const css = window.getComputedStyle(this.onscreen).backgroundColor
    const m = css.match(
      /^rgb\((\d+(?:\.\d+)?), (\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\)$/,
    )
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null
  }

  /** The table actually drawn with, rebuilt if the board has turned over. */
  private palette(): string[] {
    if (this.repalette) {
      this.colours = this.dark
        ? forDarkBoard(this.named, this.game)
        : this.named.slice()
      this.repalette = false
    }
    return this.colours
  }

  /**
   * What the board is drawing colour `n` in, or undefined for a number the
   * back end never named.
   *
   * One caller, outside every drawing path: a key that is a picture of a board
   * colour rather than of a glyph — Guess's pegs. Asking the renderer rather
   * than keeping a table of the game's constants on this side is the whole
   * point of it being here, since half of what makes that colour is the dark
   * rewrite above, which nothing else can reproduce.
   */
  colour(n: number): string | undefined {
    return this.palette()[n]
  }

  // --- frame ---------------------------------------------------------------

  startDraw() {
    this.palette()
    this.dirty = null
    if (this.watcher) this.tape = []
  }

  drawUpdate(x: number, y: number, w: number, h: number) {
    const s = this.scale
    const x0 = x * s
    const y0 = y * s
    const x1 = x0 + w * s
    const y1 = y0 + h * s
    this.dirty = this.dirty
      ? {
          x0: Math.min(this.dirty.x0, x0),
          y0: Math.min(this.dirty.y0, y0),
          x1: Math.max(this.dirty.x1, x1),
          y1: Math.max(this.dirty.y1, y1),
        }
      : { x0, y0, x1, y1 }
  }

  endDraw() {
    if (this.watcher && this.tape) this.watcher(this.tape)
    if (!this.dirty) return
    const { x0, y0, x1, y1 } = this.dirty
    const ctx = this.onscreen.getContext('2d', { alpha: false })
    ctx?.drawImage(this.offscreen, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0)
  }

  // --- recording -----------------------------------------------------------

  /**
   * Watch what the board draws, for the one thing that cannot be asked any
   * other way: which part of Map's board belongs to a clue.
   *
   * The shapes arrive here carrying the *colour number* the game asked for,
   * not the pixels it came out as — `rect` and `poly` are the two calls Map
   * paints a square with, and both are given a slot index straight out of
   * map.c. So this is reading what the game said, one step before the theme
   * translates it, which is a good deal closer to the source than the name
   * "reading the drawing" suggests.
   *
   * Off unless somebody is holding the tape, and a push onto an array is the
   * whole of the cost when they are. Nothing else in the app records; see
   * engine/map for the one caller and for why the question has no other
   * answer.
   */
  private tape: Drawn[] | null = null

  /**
   * And the standing form of the same thing, for the puzzle that has to read
   * every frame rather than one it asked for: Palisade, whose keys have no
   * other way to know where its cursor is. Handed each frame as it closes.
   *
   * A watcher and `record` share the tape, which is safe because they are one
   * puzzle each — Map asks a question once at load, Palisade listens all game.
   * Setting one while the other is running would take the other's tape away.
   */
  private watcher: ((tape: readonly Drawn[]) => void) | null = null

  watch(fn: ((tape: readonly Drawn[]) => void) | null): void {
    this.watcher = fn
    this.tape = fn ? [] : null
  }

  record(): void {
    this.tape = []
  }

  stop(): Drawn[] {
    const tape = this.tape ?? []
    this.tape = null
    return tape
  }

  // --- shapes --------------------------------------------------------------

  /**
   * The one call that paints the ground, and it paints it in the background's
   * own slot — so that slot keeps the board's colour here even where `FIGURE`
   * gives it a second one elsewhere, or the whole board would go to #bebebe. A
   * rect in any other slot is drawing, not ground: Undead's pupils are 1x1
   * rects wherever the tile is small enough to round their radius away.
   */
  rect(x: number, y: number, w: number, h: number, colour: number) {
    this.tape?.push({ kind: 'rect', x, y, w, h, colour })
    this.ctx.fillStyle = colour === BACKGROUND ? this.colours[colour] : this.ink(colour)
    this.ctx.fillRect(x, y, w, h)
  }

  clip(x: number, y: number, w: number, h: number) {
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, w, h)
    this.ctx.clip()
  }

  unclip() {
    this.ctx.restore()
  }

  /**
   * Canvas coordinates address pixel corners and the back end means pixel
   * centres, hence the half-pixel offsets. The endpoints are filled by hand
   * because callers expect them drawn and canvas will not reliably do it.
   */
  line(x1: number, y1: number, x2: number, y2: number, width: number, colour: number) {
    const { ctx } = this
    /*
     * A line is a shape too — the zombie's crossed eyes and its mouth are three
     * of these. But Undead's mirrors are lines in the same slot, and they are
     * board furniture: served the figure's ink they come out #0f0f0f on a
     * #222222 board, 1.20:1, and the puzzle's whole structure disappears.
     *
     * The width tells them apart, and not by luck: it is the C's own difference
     * between a stroke and a bar. `draw_line` reaches this port as width 1
     * exactly (see `js_canvas_draw_line(x1, y1, x2, y2, 1, colour)`), and every
     * one of Undead's five is inside `draw_monster`; the mirror is its only
     * `draw_thick_line`, at TILESIZE/16.
     *
     * Which leaves one seam: a board small enough for TILESIZE/16 to come out 1
     * would put a mirror on this side of the line. Undead's largest preset is
     * 7x7, which is TILESIZE 40 and a mirror two pixels thick; it would take a
     * custom board about twice that before the two met.
     */
    const css = width === 1 ? this.ink(colour) : this.colours[colour]
    ctx.beginPath()
    ctx.moveTo(x1 + 0.5, y1 + 0.5)
    ctx.lineTo(x2 + 0.5, y2 + 0.5)
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = css
    ctx.stroke()
    ctx.fillStyle = css
    ctx.fillRect(x1, y1, 1, 1)
    ctx.fillRect(x2, y2, 1, 1)
  }

  /** `points` is a flat [x0, y0, x1, y1, …]. A fill of -1 means outline only. */
  poly(points: number[], fill: number, outline: number) {
    this.tape?.push({ kind: 'poly', points: [...points], colour: fill })
    const { ctx } = this
    ctx.beginPath()
    ctx.moveTo(points[0] + 0.5, points[1] + 0.5)
    for (let i = 2; i < points.length; i += 2)
      ctx.lineTo(points[i] + 0.5, points[i + 1] + 0.5)
    ctx.closePath()
    if (fill >= 0) {
      ctx.fillStyle = this.ink(fill)
      ctx.fill()
    }
    ctx.lineWidth = 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = this.ink(outline)
    ctx.stroke()
  }

  /**
   * The colour a shape is drawn in, which is not always the colour the board
   * would use for that slot: see `FIGURE` in palette.ts. Those slots have a
   * second job the table's one cell is already spoken for — the monsters' paper
   * and their ink, where the cell holds the ground and the clue numbers. The
   * second job is served here, and only here, where the call is a shape.
   *
   * It is served the *compressed* light value, not the light value itself:
   * the same rule `SEMANTIC` runs, so the drawing lands inside the range the
   * other 426 slots land in rather than outside both ends of it.
   */
  private ink(slot: number): string {
    if (this.dark && FIGURE[this.game]?.includes(slot)) return figureInk(this.named[slot])
    return this.colours[slot]
  }

  /**
   * A rim the same colour as its fill is no rim, and on one board that is the
   * difference between seeing a clue and not. See `RIM` in palette.ts for
   * which circle, in which puzzle, and why the palette cannot answer it on its
   * own: the fill and the rim are the same slot, and a table of colours by
   * slot has only one colour to give.
   *
   * Dark boards only, and only where the two arrive equal — so upstream's own
   * rendering, which is what the light board is, passes through untouched.
   */
  private rim(fill: number, outline: number): string {
    if (this.dark && fill === outline) {
      const swap = RIM[this.game]?.[outline]
      if (swap !== undefined) return this.colours[swap]
    }
    return this.ink(outline)
  }

  circle(x: number, y: number, r: number, fill: number, outline: number) {
    const { ctx } = this
    ctx.beginPath()
    ctx.arc(x + 0.5, y + 0.5, r, 0, 2 * Math.PI)
    if (fill >= 0) {
      ctx.fillStyle = this.ink(fill)
      ctx.fill()
    }
    ctx.lineWidth = 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = this.rim(fill, outline)
    ctx.stroke()
  }

  // --- text ----------------------------------------------------------------

  /** Take the puzzle's font from the canvas's own computed style, as upstream does. */
  private setFont(ctx: CanvasRenderingContext2D, size: number, monospaced: boolean) {
    const s = window.getComputedStyle(this.onscreen)
    // Set something certain to parse first: building a font string out of
    // computed style is fragile, so this is the fallback if it does not.
    ctx.font = `${size}px ` + (monospaced ? 'monospace' : 'sans-serif')
    // font-stretch serialises as a percentage, which canvas will not accept
    // in a font shorthand, so it is left out.
    ctx.font =
      `${s.fontStyle} ${s.fontWeight} ${size}px ` +
      (monospaced ? 'monospace' : s.fontFamily)
  }

  /**
   * How far below a vertically centred position the text baseline belongs,
   * so that the midpoint of baseline and cap-height lands on the centre.
   *
   * There is no way to ask a browser for this, so as upstream does: draw a
   * test string white on black to a throwaway canvas and find the topmost and
   * bottommost lit pixels. Only accurate to a pixel, which is all that is
   * needed, and expensive enough to be worth caching per font.
   */
  fontMidpoint(height: number, monospaced: boolean): number {
    // Guard the degenerate case: getImageData rejects a zero-height rect.
    if (height === 0) return 0

    const probe = this.onscreen.getContext('2d', { alpha: false })
    if (!probe) return 0
    this.setFont(probe, height, monospaced)

    const cached = this.midpoints.get(probe.font)
    if (cached !== undefined) return cached

    const test = 'ABCDEFGHIKLMNOPRSTUVWXYZ0123456789'
    const width = (probe.measureText(test).width + 1) | 0
    const measure = document.createElement('canvas')
    const mctx = measure.getContext('2d', { alpha: false })
    if (!mctx) return 0
    measure.width = width
    measure.height = 2 * height
    mctx.fillStyle = '#000000'
    mctx.fillRect(0, 0, width, 2 * height)
    const baseline = (1.5 * height) | 0
    mctx.fillStyle = '#ffffff'
    this.setFont(mctx, height, monospaced)
    mctx.fillText(test, 0, baseline)

    const pixels = mctx.getImageData(0, 0, width, 2 * height).data
    let ymin = 2 * height
    let ymax = -1
    for (let y = 0; y < 2 * height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[4 * (y * width + x)] !== 0) {
          if (ymin > y) ymin = y
          if (ymax < y) ymax = y
          break
        }
      }
    }

    const midpoint = (baseline - (ymin + ymax) / 2) | 0
    this.midpoints.set(probe.font, midpoint)
    return midpoint
  }

  /** Vertical alignment is already handled by the C side via fontMidpoint. */
  text(
    x: number,
    y: number,
    halign: number,
    colour: number,
    fontsize: number,
    monospaced: boolean,
    str: string,
  ) {
    const { ctx } = this
    this.setFont(ctx, fontsize, monospaced)
    /*
     * Text takes its slot's colour like everything else. A table used to sit
     * here that gave a few slots their light value back when they were writing
     * on a figure rather than on the board — Guess writes a number on a
     * coloured peg with the same slot it rims the peg in, and the rim wants to
     * be light while the number wanted to stay dark. It is gone: one slot now
     * means one colour whatever the call, and a number written on a peg is a
     * light number on a mid-tone disc. Measured over all ten of Guess's discs
     * that is 1.58:1 at worst where the table gave 7.96:1, and over Map's four
     * regions 1.90:1 against 6.60:1. Legible if you look, not if you glance —
     * traded for the rule being the same one everywhere.
     */
    ctx.fillStyle = this.colours[colour]
    ctx.textAlign = halign === 0 ? 'left' : halign === 1 ? 'center' : 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(str, x, y)
  }

  // --- blitters ------------------------------------------------------------
  // Saved patches of the image, used to draw and erase things that move
  // without repainting what is underneath. Keyed by the C-side pointer.

  newBlitter(id: number, w: number, h: number) {
    const blitter = document.createElement('canvas')
    blitter.width = w * this.scale
    blitter.height = h * this.scale
    this.blitters.set(id, blitter)
  }

  freeBlitter(id: number) {
    this.blitters.delete(id)
  }

  blitterSave(id: number, x: number, y: number) {
    const blitter = this.blitters.get(id)
    if (!blitter) return
    const ctx = blitter.getContext('2d', { alpha: false })
    ctx?.drawImage(this.offscreen, -x * this.scale, -y * this.scale)
  }

  blitterLoad(id: number, x: number, y: number) {
    const blitter = this.blitters.get(id)
    if (!blitter) return
    // The blitter holds physical pixels, so undo the scaling transform and
    // place it ourselves.
    this.ctx.save()
    this.ctx.resetTransform()
    this.ctx.drawImage(blitter, x * this.scale, y * this.scale)
    this.ctx.restore()
  }

  // --- size ----------------------------------------------------------------

  /**
   * Room the board has been given, in CSS pixels — and the answer to every
   * "how much room is there?" the back end asks, including the ones it asks
   * on its own after a new game or a preference change. usePuzzleFit keeps it
   * to the room the board is actually allowed, which is not the whole area.
   *
   * Null until the first fit, so the board the back end lays out at startup is
   * the one it would have chosen unaided, which is what upstream's pages get.
   */
  private available: Size | null = null

  setAvailable(w: number, h: number) {
    this.available = { w, h }
  }

  /**
   * Stop answering the "how much room is there?" question, so the next size
   * the back end works out is the one it would have chosen on its own.
   *
   * That answer is the whole difference between a board that fills the screen
   * and a board at its natural size: `midend_size` bounds the tile size above
   * by the game's own preferred value when the front end declines to state a
   * size, and searches for the largest that fits when it does. See
   * `naturalSize` in usePuzzleFit for the one caller.
   */
  forgetAvailable() {
    this.available = null
  }

  /** What the board currently measures on the page, in CSS pixels. */
  cssSize(): Size {
    const rect = this.onscreen.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }

  /** Physical pixels, which is what the back end measures in. */
  preferredSize(): Size | null {
    if (!this.available) return null
    const dpr = window.devicePixelRatio || 1
    return {
      w: Math.max(1, Math.round(this.available.w * dpr)),
      h: Math.max(1, Math.round(this.available.h * dpr)),
    }
  }

  setSize(w: number, h: number, scale: number) {
    const dpr = window.devicePixelRatio || 1
    this.onscreen.width = w
    this.onscreen.height = h
    this.offscreen.width = w
    this.offscreen.height = h
    this.onscreen.style.width = `${w / dpr}px`
    this.onscreen.style.height = `${h / dpr}px`
    this.scale = scale
    this.ctx.resetTransform()
    this.ctx.scale(scale, scale)
  }

  /** Physical pixel coordinates for a pointer event, in back-end units. */
  eventCoords(event: { clientX: number; clientY: number }) {
    const rect = this.onscreen.getBoundingClientRect()
    const xscale = this.onscreen.width / this.onscreen.offsetWidth / this.scale
    const yscale = this.onscreen.height / this.onscreen.offsetHeight / this.scale
    return {
      x: (event.clientX - rect.left) * xscale,
      y: (event.clientY - rect.top) * yscale,
    }
  }
}
