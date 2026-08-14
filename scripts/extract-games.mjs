import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const KEEP = new Set(['p', 'ul', 'li', 'em', 'i', 'strong', 'b', 'code', 'a'])

function helpFor(name) {
  const blurb = fs.readFileSync(
    path.join(root, `vendor/sgtpuzzles/html/${name}.html`),
    'utf8',
  )
  const body = blurb.replace(/^.*\n/, '')
  if (!body.trim()) throw new Error(`empty blurb for ${name}`)

  return body
    .replace(/<(\/?)(\w+)([^>]*)>/g, (whole, close, tag, attrs) => {
      const lower = tag.toLowerCase()
      if (!KEEP.has(lower)) return ''
      if (close) return `</${lower}>`
      if (lower !== 'a') return `<${lower}>`
      const href = attrs.match(/href="([^"]*)"/)?.[1]
      if (!href || !/^https?:/.test(href)) return ''
      return `<a href="${href}" target="_blank" rel="noreferrer">`
    })
    .replace(/\s*\n\s*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

const cmake = fs
  .readFileSync(path.join(root, 'vendor/sgtpuzzles/CMakeLists.txt'), 'utf8')
  .replace(/\\\n/g, '')

const declared = []
for (const [, name, body] of cmake.matchAll(/^puzzle\((\w+)([\s\S]*?)\)\s*$/gm)) {
  const field = (key) => body.match(new RegExp(`${key}\\s+"([^"]*)"`))?.[1]
  declared.push({
    name,
    displayName: field('DISPLAYNAME') ?? name[0].toUpperCase() + name.slice(1),
    description: field('DESCRIPTION') ?? '',
    objective: (field('OBJECTIVE') ?? '').replace(/\s+/g, ' ').trim(),
  })
}

const shipped = new Set(
  fs
    .readdirSync(path.join(root, 'vendor/sgtpuzzles/html'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .filter((name) => name !== 'group'),
)

const but = fs.readFileSync(path.join(root, 'vendor/sgtpuzzles/puzzles.but'), 'utf8')
const chapters = [...but.matchAll(/^\\C\{(\w+)\}/gm)].map((m) => m[1])
const chapterIndex = new Map(chapters.map((name, i) => [name, i]))

const games = declared
  .filter((g) => shipped.has(g.name))
  .sort((a, b) => chapterIndex.get(a.name) - chapterIndex.get(b.name))

const missing = [...shipped].filter((n) => !games.some((g) => g.name === n))
if (missing.length) {
  console.error(`no metadata for: ${missing.join(', ')}`)
  process.exit(1)
}

const unchaptered = games.filter((g) => !chapterIndex.has(g.name))
if (unchaptered.length) {
  console.error(`no manual chapter for: ${unchaptered.map((g) => g.name).join(', ')}`)
  process.exit(1)
}

const engine = new Set(
  fs
    .readdirSync(path.join(root, 'public/engine'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, '')),
)
const noEngine = games.filter((g) => !engine.has(g.name))
if (noEngine.length) {
  console.error(`no ES module for: ${noEngine.map((g) => g.name).join(', ')}`)
  process.exit(1)
}

fs.writeFileSync(
  path.join(root, 'src/games.json'),
  JSON.stringify(games, null, 2) + '\n',
)
console.log(`wrote src/games.json (${games.length} games)`)

const help = Object.fromEntries(games.map((g) => [g.name, helpFor(g.name)]))
const helpPath = path.join(root, 'public/help/en.json')
fs.mkdirSync(path.dirname(helpPath), { recursive: true })
fs.writeFileSync(helpPath, JSON.stringify(help) + '\n')
console.log(`wrote public/help/en.json (${Math.round(fs.statSync(helpPath).size / 1024)} KB)`)

for (const [source, companion] of [
  ['src/games.json', 'src/games.zh.json'],
  ['public/help/en.json', 'public/help/zh.json'],
]) {
  const translated = JSON.parse(fs.readFileSync(path.join(root, companion), 'utf8'))
  const missing = games.map((g) => g.name).filter((name) => !(name in translated))
  const extra = Object.keys(translated).filter(
    (name) => !games.some((g) => g.name === name),
  )
  if (missing.length || extra.length)
    console.warn(
      `${companion} is out of step with ${source}:` +
        (missing.length ? ` missing ${missing.join(', ')};` : '') +
        (extra.length ? ` stale ${extra.join(', ')};` : ''),
    )
}
