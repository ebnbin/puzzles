import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { root, CHROMIUM } from './lib/pictures.mjs'

const OUT = path.join(root, 'public')
const TILES = path.join(OUT, 'tiles')

const ABOVE = 'net-light.png'
const BELOW = 'cube-light.png'

const SEAM = '#000000'

const WIDTH = 4

// 先 2048 再缩是算好的:tiles 是 256 的像素画,须 8x 整数放大且 smoothing off;
// 缩到 512 时 4x4 平均恰好整落在 8x8 块内,格线不糊,而对角缝和圆角恰恰靠这次
// 平均抗锯齿。改 CANVAS 必须保持这套整除关系。
const CANVAS = 2048

// 四个都出正方形、不自带圆角:iOS/Android 都会按自己的形状再裁一次,预圆角会
// 被裁出一圈底色环;manifest 的 purpose "any maskable" 说的就是「随便裁」。
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
    ctx.imageSmoothingEnabled = false

    const scale = canvasSize / 512
    const n = canvasSize

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

    ctx.imageSmoothingEnabled = true
    ctx.strokeStyle = seam
    ctx.lineWidth = width * scale
    ctx.beginPath()
    ctx.moveTo(n, 0)
    ctx.lineTo(0, n)
    ctx.stroke()

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
