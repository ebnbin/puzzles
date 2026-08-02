/**
 * What the three picture builders all have to do.
 *
 * Every picture in this app is a real board, rendered by the real engine in a
 * real browser — there is no drawing here that the puzzle screen could not have
 * produced. Which means all three scripts want the same four things: the
 * position upstream chose, the app opened on it in a named theme, the board
 * photographed, and the photograph squared off. This is those four.
 *
 * Both themes, every time. The dark board is not a filter over the light one —
 * it is a different palette computed by engine/palette.ts — so a picture built
 * in light and shown on dark is the wrong picture, not a dimmer one.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const upstreamIcons = path.join(root, 'vendor/sgtpuzzles/icons')
export const BASE = process.env.PUZZLES_BASE ?? 'http://localhost:4173'
export const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export const THEMES = ['light', 'dark']

export const games = () =>
  JSON.parse(fs.readFileSync(path.join(root, 'src/games.json'), 'utf8'))

/** `set(net_crop 193x193 113x113+0+80)` → the reference size and the rectangle. */
export function readCrops() {
  const text = fs.readFileSync(path.join(upstreamIcons, 'icons.cmake'), 'utf8')
  const crops = new Map()
  for (const [, name, rw, rh, cw, ch, cx, cy] of text.matchAll(
    /set\((\w+)_crop (\d+)x(\d+) (\d+)x(\d+)\+(\d+)\+(\d+)\)/g,
  )) {
    crops.set(name, { ref: { w: +rw, h: +rh }, rect: { w: +cw, h: +ch, x: +cx, y: +cy } })
  }
  return crops
}

/**
 * Puzzles whose interesting moment is mid-move. Upstream redoes one move and
 * freezes the animation this far through it.
 */
export function readRedos() {
  const text = fs.readFileSync(path.join(upstreamIcons, 'icons.cmake'), 'utf8')
  return new Map(
    [...text.matchAll(/set\((\w+)_redo ([\d.]+)\)/g)].map(([, n, p]) => [n, +p]),
  )
}

export const savePath = (game) => path.join(upstreamIcons, `${game}.sav`)

/**
 * The app, open on one puzzle in one theme, with a board that has been drawn.
 *
 * There is one address, so which puzzle to open is `puzzles.recent` plus the flag beside it, and nothing
 * else. Seed it, then come back through about:blank — a second `goto` of the
 * same address would not reload. The theme is seeded the same way rather than
 * left to `colorScheme`, because the app resolves "system" itself and the
 * pictures must not depend on what the machine building them prefers.
 */
export async function openBoard(browser, { game, theme, viewport = { width: 900, height: 900 } }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: theme })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(BASE, { waitUntil: 'load' })
  await page.evaluate(
    ({ name, want }) => {
      localStorage.clear()
      localStorage.setItem('puzzles.recent', name)
      localStorage.setItem('puzzles.playing', '1')
      localStorage.setItem('puzzles.theme', want)
    },
    { name: game, want: theme },
  )
  await page.goto('about:blank')
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForFunction(() => document.querySelector('.host-board')?.width > 0, null, {
    timeout: 30000,
  })
  await page.waitForTimeout(500)
  return { context, page, errors }
}

/**
 * The position the thumbnails are taken from: upstream's saved game, plus — for
 * the six puzzles whose interesting moment is mid-move — one redo frozen part
 * way through its animation.
 *
 * The animation is measured before it is used: take the clock off
 * requestAnimationFrame, step until the puzzle stops asking for frames, then
 * replay and jump straight to the wanted fraction. That way the frame is the
 * same on every build rather than however far it happened to get.
 */
export async function dealIconPosition(page, { game, redos }) {
  const save = fs.readFileSync(savePath(game), 'utf8')
  await page.evaluate((text) => window.__puzzle.loadGame(text), save)
  await page.waitForTimeout(400)

  const proportion = redos.get(game)
  if (proportion === undefined) return { proportion }

  const duration = await page.evaluate(async () => {
    const api = window.__puzzle
    api.redo()
    api.stopTimer()
    let t = 0
    while (window.__animating && t < 5) {
      api.tick(0.01)
      t += 0.01
    }
    return t
  })
  await page.evaluate((text) => window.__puzzle.loadGame(text), save)
  await page.waitForTimeout(300)
  await page.evaluate(
    ({ d, p }) => {
      const api = window.__puzzle
      api.redo()
      api.stopTimer()
      api.tick(d * p)
    },
    { d: duration, p: proportion },
  )
  await page.waitForTimeout(200)
  return { proportion }
}

/** The board's size in its own pixels, which is what the crop rectangles scale against. */
export const boardSize = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.host-board')
    return { w: c.width, h: c.height }
  })

/**
 * The colour to pad a picture out to square with: the board's own top-left
 * pixel.
 *
 * Not a colour looked up in the palette, which would be the same thing for
 * thirty-nine of the forty and wrong for the fortieth: Untangle's corner is the
 * margin around its playing area, #e6e6e6, where its COL_BACKGROUND is the
 * #bbbbbb inside. Padding with what the edge actually is makes the seam
 * invisible by construction, in either theme, without this file knowing
 * anything about palettes.
 */
export const cornerColour = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('.host-board').getContext('2d').getImageData(0, 0, 1, 1).data
    return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  })

/**
 * A picture squared off to `size`, scaled to fit and padded rather than cropped
 * — nothing a board drew is ever cut away here.
 *
 * Done in the page because it already has a canvas and an image decoder, and
 * because `imageSmoothingQuality` there is the browser's own downscaler.
 */
export async function square(page, shot, { size, pad }) {
  const url = await page.evaluate(
    async ({ data, size, pad }) => {
      const image = new Image()
      image.src = data
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = pad
      ctx.fillRect(0, 0, size, size)
      ctx.imageSmoothingQuality = 'high'
      const scale = Math.min(size / image.width, size / image.height)
      const w = image.width * scale
      const h = image.height * scale
      ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
      return canvas.toDataURL('image/png')
    },
    { data: `data:image/png;base64,${shot.toString('base64')}`, size, pad },
  )
  return Buffer.from(url.split(',')[1], 'base64')
}

/** `<name>-light.png`, `<name>-dark.png`. Flat, so a picture is one lookup. */
export const outFile = (dir, name, theme) => path.join(dir, `${name}-${theme}.png`)

/** Start each build from nothing, so a renamed puzzle cannot leave a stale file. */
export function freshDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}
