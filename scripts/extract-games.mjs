// Derive the launcher's game list from upstream's CMakeLists.txt, so display
// names and descriptions always match the vendored source rather than being
// maintained by hand. Run via scripts/build-games.sh.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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
    description: field('DESCRIPTION') ?? '',
    objective: (field('OBJECTIVE') ?? '').replace(/\s+/g, ' ').trim(),
  })
}

const shipped = new Set(
  fs
    .readdirSync(path.join(root, 'public/games'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, '')),
)

const games = declared
  .filter((g) => shipped.has(g.name))
  .sort((a, b) => a.displayName.localeCompare(b.displayName))

const missing = [...shipped].filter((n) => !games.some((g) => g.name === n))
if (missing.length) {
  console.error(`no metadata for: ${missing.join(', ')}`)
  process.exit(1)
}

fs.writeFileSync(
  path.join(root, 'src/games.json'),
  JSON.stringify(games, null, 2) + '\n',
)
console.log(`wrote src/games.json (${games.length} games)`)
