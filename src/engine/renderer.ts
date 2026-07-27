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

export class CanvasRenderer {
  private readonly onscreen: HTMLCanvasElement
  private readonly offscreen: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  /** Colour strings, indexed as the back end numbers them. */
  private colours: string[] = []

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

  constructor(canvas: HTMLCanvasElement) {
    this.onscreen = canvas
    this.offscreen = document.createElement('canvas')
    const ctx = this.offscreen.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('no 2d context')
    this.ctx = ctx
  }

  // --- colours ------------------------------------------------------------

  setColour(index: number, css: string) {
    this.colours[index] = css
  }

  /**
   * The back end offers to take its background colour from the page. Only an
   * opaque sRGB colour will do; anything else — including the transparent
   * default — leaves it to pick its own, which is what upstream's pages get.
   */
  defaultColour(): [number, number, number] | null {
    const css = window.getComputedStyle(this.onscreen).backgroundColor
    const m = css.match(
      /^rgb\((\d+(?:\.\d+)?), (\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\)$/,
    )
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null
  }

  // --- frame ---------------------------------------------------------------

  startDraw() {
    this.dirty = null
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
    if (!this.dirty) return
    const { x0, y0, x1, y1 } = this.dirty
    const ctx = this.onscreen.getContext('2d', { alpha: false })
    ctx?.drawImage(this.offscreen, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0)
  }

  // --- shapes --------------------------------------------------------------

  rect(x: number, y: number, w: number, h: number, colour: number) {
    this.ctx.fillStyle = this.colours[colour]
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
    const css = this.colours[colour]
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
    const { ctx } = this
    ctx.beginPath()
    ctx.moveTo(points[0] + 0.5, points[1] + 0.5)
    for (let i = 2; i < points.length; i += 2)
      ctx.lineTo(points[i] + 0.5, points[i + 1] + 0.5)
    ctx.closePath()
    if (fill >= 0) {
      ctx.fillStyle = this.colours[fill]
      ctx.fill()
    }
    ctx.lineWidth = 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = this.colours[outline]
    ctx.stroke()
  }

  circle(x: number, y: number, r: number, fill: number, outline: number) {
    const { ctx } = this
    ctx.beginPath()
    ctx.arc(x + 0.5, y + 0.5, r, 0, 2 * Math.PI)
    if (fill >= 0) {
      ctx.fillStyle = this.colours[fill]
      ctx.fill()
    }
    ctx.lineWidth = 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = this.colours[outline]
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
   * Room the board has been given, in CSS pixels. Set before the puzzle
   * starts so its first size already fits; null leaves the back end to pick,
   * which is what upstream's pages get.
   */
  private available: Size | null = null

  setAvailable(w: number, h: number) {
    this.available = { w, h }
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
