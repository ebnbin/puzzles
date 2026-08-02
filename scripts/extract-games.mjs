// Derive the launcher's game list and every word of English in the app from
// the vendored source, so none of it is maintained by hand:
//
//   displayName, description, objective  CMakeLists.txt, in each puzzle()
//   how to play                          html/<game>.html, the blurb upstream
//                                        puts under the puzzle on its own page
//
// Run via scripts/build-games.sh.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * How to play, in upstream's own words: the blurb it puts under the puzzle on
 * each game's page, which says what the puzzle is and how the controls work.
 * jspage.pl builds those pages out of exactly these files.
 *
 * The first line is the game's name, which the dialog already has. Only the
 * tags that occur survive, and only `href` on them, so what lands in the JSON
 * is narrow enough to render as markup. The two links there are both absolute
 * and off-site; anything that is not http(s) loses its anchor rather than being
 * trusted. They open in a new tab, since following one from a puzzle would
 * otherwise throw the position away.
 */
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
    // The caption under each tile.
    description: field('DESCRIPTION') ?? '',
    // The one-liner, kept as what the help dialog falls back to if the blurb
    // cannot be fetched.
    objective: (field('OBJECTIVE') ?? '').replace(/\s+/g, ' ').trim(),
  })
}

/*
 * Which puzzles are published — asked of upstream rather than of our own
 * output. html/ holds one page per playable puzzle and is what upstream's own
 * website is built from; `group` is carried there but is an unfinished/ puzzle
 * and is not shipped. build-games.sh publishes exactly this set, and the blurbs
 * above come out of the same directory.
 */
const shipped = new Set(
  fs
    .readdirSync(path.join(root, 'vendor/sgtpuzzles/html'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .filter((name) => name !== 'group'),
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

// Prose, read by whoever opens the help dialog and nobody else, so it is
// fetched on demand rather than carried in the bundle.
const help = Object.fromEntries(games.map((g) => [g.name, helpFor(g.name)]))
const helpPath = path.join(root, 'public/help/en.json')
fs.mkdirSync(path.dirname(helpPath), { recursive: true })
fs.writeFileSync(helpPath, JSON.stringify(help) + '\n')
console.log(`wrote public/help/en.json (${Math.round(fs.statSync(helpPath).size / 1024)} KB)`)

/*
 * Both files have a translated companion that is written by hand and cannot
 * be regenerated from upstream. Nothing downstream would notice a puzzle that
 * gained an entry here and not there — the app would simply fall back to
 * English for it — so say so here, where the drift starts.
 */
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
