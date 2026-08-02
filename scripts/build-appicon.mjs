/**
 * The app's own icon: Net and Cube, cut apart by a diagonal.
 *
 * Two of the forty tiles that public/icons/ already holds — Net's above the
 * line, Cube's below it, both in the light theme — with a black seam running
 * from the top-right corner to the bottom-left one. What it says is what this
 * app is: not one puzzle, and not a picture of a puzzle, but the collection.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A SQUARE
 * ---------------------------------------------------------------------------
 *
 * It was drawn with a 112 corner, which is what the SVG it replaced had. Every
 * platform that shows this rounds it again on its own: iOS masks the
 * apple-touch-icon to its squircle whatever shape arrives, and Android masks a
 * maskable icon to whatever the launcher's theme uses. A rounded icon inside
 * that is rounded twice — the app's arc showing inside the system's as a ring
 * of background, which is the one thing a home-screen icon must not look like.
 *
 * So it is a full square, and the shape is the system's to choose. That is what
 * `purpose: "any maskable"` in the manifest says: crop it. The composition
 * survives being cropped because it has no margin to lose — no wordmark, no
 * centred glyph, just two boards and the line between them, and any shape cut
 * out of the middle of that is still two boards and the line between them.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS ONE DOES NOT NEED THE APP RUNNING
 * ---------------------------------------------------------------------------
 *
 * The other three builders photograph a real board in a real browser, so they
 * need vite preview up and the wasm loaded (see scripts/lib/pictures.mjs). This
 * one composes two pictures those builders already produced, so it needs a
 * canvas and nothing else — a blank page is enough. It still runs in Chromium
 * rather than in Node because that is where this repo has an image decoder and
 * a downscaler, and adding an image library to package.json to avoid opening a
 * tab it already opens for three other scripts is not a trade worth making.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS DRAWN AT 2048 AND REDUCED
 * ---------------------------------------------------------------------------
 *
 * The tiles are 256 and are pixel art in the sense that matters — straight grid
 * lines and flat fills — so they must be enlarged by whole numbers and never
 * interpolated. The diagonal and the four corners are the opposite: they are
 * geometry, and they look like a staircase unless something averages them.
 *
 * 2048 satisfies both at once. The tiles go up 8x with smoothing off, so every
 * source pixel becomes an exact 8x8 block; reducing to 512 averages 4x4 blocks,
 * each of which falls wholly inside one of those, so the artwork arrives as a
 * clean 2x nearest enlargement with nothing blurred. The seam and the corners,
 * which do not lie on those boundaries, get the averaging they need. The
 * smaller sizes are honest downscales of the same drawing.
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { root, CHROMIUM } from './lib/pictures.mjs'

const OUT = path.join(root, 'public')
const TILES = path.join(OUT, 'icons')

/** Above the line and below it. Both light: the icon is one theme, cut. */
const ABOVE = 'net-light.png'
const BELOW = 'cube-light.png'

/** The seam. Black, not the dark background — this is a line, not a surface. */
const SEAM = '#000000'

/** The seam's thickness, on 512. Four is where it survives being shrunk. */
const WIDTH = 4

/** Drawn here, reduced from here. See the note above. */
const CANVAS = 2048

/**
 * What each size is for. 180 is Apple's fixed name and Apple's fixed size; 192
 * and 512 are the two the manifest lists; 32 is the tab.
 */
const SIZES = [
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
]

const dataUrl = (file) =>
  `data:image/png;base64,${fs.readFileSync(path.join(TILES, file)).toString('base64')}`

const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage()
await page.goto('about:blank')

const drawn = await page.evaluate(
  async ({ above, below, seam, width, canvasSize, sizes }) => {
    const load = async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      return image
    }
    const [top, bottom] = await Promise.all([load(above), load(below)])

    const big = document.createElement('canvas')
    big.width = big.height = canvasSize
    const ctx = big.getContext('2d')
    // Whole-number enlargement, so a grid line stays one colour across its
    // width instead of being smeared into its neighbours.
    ctx.imageSmoothingEnabled = false

    const scale = canvasSize / 512
    const n = canvasSize

    // The seam runs corner to corner: x + y = n. Above and left of it is Net.
    const half = (invert) => {
      const p = new Path2D()
      if (invert) {
        p.moveTo(n, 0)
        p.lineTo(n, n)
        p.lineTo(0, n)
      } else {
        p.moveTo(0, 0)
        p.lineTo(n, 0)
        p.lineTo(0, n)
      }
      p.closePath()
      return p
    }

    for (const [image, invert] of [
      [top, false],
      [bottom, true],
    ]) {
      ctx.save()
      ctx.clip(half(invert))
      ctx.drawImage(image, 0, 0, n, n)
      ctx.restore()
    }

    // Over the join rather than between the halves: a stroke centred on the
    // line covers half a width of each, which is what makes it read as one
    // line drawn on top rather than as a gap the two failed to meet across.
    ctx.imageSmoothingEnabled = true
    ctx.strokeStyle = seam
    ctx.lineWidth = width * scale
    ctx.beginPath()
    ctx.moveTo(n, 0)
    ctx.lineTo(0, n)
    ctx.stroke()

    // No corner cut here: see the note at the top. It goes out square and every
    // platform that shows it rounds it its own way.
    const out = {}
    for (const { file, size } of sizes) {
      const small = document.createElement('canvas')
      small.width = small.height = size
      const sctx = small.getContext('2d')
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'
      sctx.drawImage(big, 0, 0, size, size)
      out[file] = small.toDataURL('image/png')
    }
    return out
  },
  {
    above: dataUrl(ABOVE),
    below: dataUrl(BELOW),
    seam: SEAM,
    width: WIDTH,
    canvasSize: CANVAS,
    sizes: SIZES,
  },
)

for (const { file } of SIZES) {
  const bytes = Buffer.from(drawn[file].split(',')[1], 'base64')
  fs.writeFileSync(path.join(OUT, file), bytes)
  console.log(`  ${file.padEnd(22)} ${String(bytes.length).padStart(6)} bytes`)
}

await browser.close()
console.log(`app icon: ${ABOVE} over ${BELOW}, ${WIDTH}px seam in ${SEAM}, square`)
