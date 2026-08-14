export interface Size {
  w: number
  h: number
}

import { BACKGROUND, FIGURE, figureInk, forDarkBoard, RIM } from './palette'

export type Drawn =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; colour: number }
  | { kind: 'poly'; points: number[]; colour: number }

export class CanvasRenderer {
  private readonly onscreen: HTMLCanvasElement
  private readonly offscreen: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  private readonly named: string[] = []

  private colours: string[] = []

  private dark = false
  private repalette = true

  private scale = 1

  private dirty: { x0: number; y0: number; x1: number; y1: number } | null = null

  private readonly blitters = new Map<number, HTMLCanvasElement>()

  private readonly midpoints = new Map<string, number>()

  private readonly game: string

  constructor(canvas: HTMLCanvasElement, game = '') {
    this.game = game
    this.onscreen = canvas
    this.offscreen = document.createElement('canvas')
    const ctx = this.offscreen.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('no 2d context')
    this.ctx = ctx
  }

  setColour(index: number, css: string) {
    this.named[index] = css
    this.repalette = true
  }

  setDark(dark: boolean): boolean {
    if (dark === this.dark) return false
    this.dark = dark
    this.repalette = true
    return true
  }

  defaultColour(): [number, number, number] | null {
    const css = window.getComputedStyle(this.onscreen).backgroundColor
    const m = css.match(
      /^rgb\((\d+(?:\.\d+)?), (\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\)$/,
    )
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null
  }

  private palette(): string[] {
    if (this.repalette) {
      this.colours = this.dark
        ? forDarkBoard(this.named, this.game)
        : this.named.slice()
      this.repalette = false
    }
    return this.colours
  }

  colour(n: number): string | undefined {
    return this.palette()[n]
  }

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

  private tape: Drawn[] | null = null

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

  line(x1: number, y1: number, x2: number, y2: number, width: number, colour: number) {
    const { ctx } = this
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

  private ink(slot: number): string {
    if (this.dark && FIGURE[this.game]?.includes(slot)) return figureInk(this.named[slot])
    return this.colours[slot]
  }

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

  private setFont(ctx: CanvasRenderingContext2D, size: number, monospaced: boolean) {
    const s = window.getComputedStyle(this.onscreen)
    ctx.font = `${size}px ` + (monospaced ? 'monospace' : 'sans-serif')
    ctx.font =
      `${s.fontStyle} ${s.fontWeight} ${size}px ` +
      (monospaced ? 'monospace' : s.fontFamily)
  }

  fontMidpoint(height: number, monospaced: boolean): number {
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
    this.ctx.save()
    this.ctx.resetTransform()
    this.ctx.drawImage(blitter, x * this.scale, y * this.scale)
    this.ctx.restore()
  }

  private available: Size | null = null

  setAvailable(w: number, h: number) {
    this.available = { w, h }
  }

  forgetAvailable() {
    this.available = null
  }

  cssSize(): Size {
    const rect = this.onscreen.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }

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
