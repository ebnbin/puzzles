// Derive the launcher's game list from upstream's CMakeLists.txt, and each
// game's description from the manual halibut has just built, so both always
// match the vendored source rather than being maintained by hand. Run via
// scripts/build-games.sh, after the docs are generated.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * A chapter's opening prose: everything between the chapter heading and the
 * first section of it, which is where the manual explains what the puzzle is
 * before it gets on to controls and parameters.
 *
 * Only the handful of tags that actually occur there survive, and only `href`
 * survives on them, so what lands in the JSON is already narrow enough to
 * render as markup. Links are rewritten to absolute paths — they are written
 * relative to /doc/, and the help dialog is not — and opened in a new tab,
 * since following one from a puzzle would otherwise throw the position away.
 */
const KEEP = new Set(['p', 'em', 'code', 'ul', 'li', 'pre', 'a'])

function manualFor(name) {
  const page = fs.readFileSync(path.join(root, `public/doc/${name}.html`), 'latin1')
  const intro = page.match(/<h1>.*?<\/h1>(.*?)(?=<h2>|<hr>)/s)
  if (!intro) throw new Error(`no chapter intro in doc/${name}.html`)

  const html = intro[1]
    // Halibut drops an empty anchor at every index entry. They have nothing to
    // point at once the text is out of the manual, and they have to go as
    // pairs — dropping the opening tag alone would strand its closer.
    .replace(/<a name="[^"]*"><\/a>/g, '')
    .replace(/<(\/?)(\w+)([^>]*)>/g, (whole, close, tag, attrs) => {
      const lower = tag.toLowerCase()
      if (!KEEP.has(lower)) return ''
      if (close) return `</${lower}>`
      if (lower !== 'a') return `<${lower}>`
      const href = attrs.match(/href="([^"]*)"/)?.[1]
      if (!href) throw new Error(`anchor with no href in ${name}: ${whole}`)
      const to = /^https?:/.test(href)
        ? href
        : `/doc/${href.startsWith('#') ? `${name}.html${href}` : href}`
      return `<a href="${to}" target="_blank" rel="noreferrer">`
    })
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()

  const opens = (html.match(/<a /g) ?? []).length
  const closes = (html.match(/<\/a>/g) ?? []).length
  if (opens !== closes) {
    throw new Error(`unbalanced anchors in ${name}: ${opens} open, ${closes} closed`)
  }
  return html
}

// Join CMake's backslash line continuations before matching.
const cmake = fs
  .readFileSync(path.join(root, 'vendor/sgtpuzzles/CMakeLists.txt'), 'utf8')
  .replace(/\\\n/g, '')

const declared = []
for (const [, name, body] of cmake.matchAll(/^puzzle\((\w+)([\s\S]*?)\)\s*$/gm)) {
  const field = (key) => body.match(new RegExp(`${key}\\s+"([^"]*)"`))?.[1]
  declared.push({
    name,
    displayName: field('DISPLAYNAME') ?? name[0].toUpperCase() + name.slice(1),
    // The one-liner, kept as what the help dialog falls back to if the manual
    // cannot be fetched.
    objective: (field('OBJECTIVE') ?? '').replace(/\s+/g, ' ').trim(),
  })
}

const shipped = new Set(
  fs
    .readdirSync(path.join(root, 'public/games'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, '')),
)

// Order the launcher the way the manual orders its chapters, which is roughly
// the order the puzzles joined the collection — Net first, newest last. The
// upstream website lists them alphabetically instead; both orders are its own,
// this one just makes for a friendlier first screen.
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

// Every published puzzle is also built as an ES module for the React host.
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

// The descriptions are prose, read by whoever opens the help dialog and nobody
// else, so they are fetched on demand rather than carried in the bundle.
const manual = Object.fromEntries(games.map((g) => [g.name, manualFor(g.name)]))
const manualPath = path.join(root, 'public/manual.json')
fs.writeFileSync(manualPath, JSON.stringify(manual) + '\n')
console.log(
  `wrote public/manual.json (${Math.round(fs.statSync(manualPath).size / 1024)} KB)`,
)
