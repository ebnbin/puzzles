import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOC = join(ROOT, 'public/doc')
const EN = join(DOC, 'en')
const ZH = join(DOC, 'zh')

let failures = 0
const ok = (m) => console.log(`  ok  ${m}`)
const bad = (m) => {
  console.log(`FAIL  ${m}`)
  failures++
}

function body(html) {
  const open = html.indexOf('<main class="doc-main">\n')
  const close = html.lastIndexOf('\n</main>')
  if (open < 0 || close < 0) return null
  return html.slice(open + '<main class="doc-main">\n'.length, close)
}

const tags = (html) =>
  [...html.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase()).join(',')
const attrs = (html, name) =>
  (html.match(new RegExp(`${name}="[^"]*"`, 'g')) ?? []).join('|')

const scratch = mkdtempSync(join(tmpdir(), 'puzzles-doc-'))
try {
  execFileSync(
    'halibut',
    [
      '--html',
      '-Chtml-contents-filename:index.html',
      '-Chtml-index-filename:indexpage.html',
      '-Chtml-template-filename:%k.html',
      '-Chtml-template-fragment:%k',
      join(ROOT, 'vendor/sgtpuzzles/puzzles.but'),
    ],
    { cwd: scratch, stdio: 'inherit' },
  )

  const fresh = readdirSync(scratch).filter((f) => f.endsWith('.html'))
  const published = readdirSync(EN).filter((f) => f.endsWith('.html'))
  fresh.length === published.length && fresh.length === 45
    ? ok(`${fresh.length} pages, same set as halibut just produced`)
    : bad(`halibut wrote ${fresh.length}, public/doc/en has ${published.length}`)

  let differing = 0
  for (const file of fresh) {
    const raw = readFileSync(join(scratch, file), 'utf8')
    const open = raw.indexOf('\n<body>\n')
    const inner = raw.slice(
      open + '\n<body>\n'.length,
      raw.length - '\n<hr><address></address></body>\n</html>\n'.length,
    )
    if (body(readFileSync(join(EN, file), 'utf8')) !== inner) {
      if (differing < 3) console.log(`      ${file}`)
      differing++
    }
  }
  differing === 0
    ? ok('every English page is byte-identical to halibut inside <main>')
    : bad(`${differing} pages differ from halibut`)
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

{
  const trees = [
    ['en', EN, 'en'],
    ['zh', ZH, 'zh-Hans'],
  ]
  for (const [label, dir, htmlLang] of trees) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.html'))
    const missing = files.filter((f) => {
      const html = readFileSync(join(dir, f), 'utf8')
      return !(
        html.includes('<meta name="viewport" content="width=device-width') &&
        /<link rel="stylesheet" href="\/doc\/doc\.css\?v=[0-9a-f]{8}">/.test(html) &&
        html.includes('<meta charset="utf-8">') &&
        html.includes("localStorage.getItem('puzzles.theme')") &&
        html.includes("location.hash === '#' + self") &&
        html.includes(`<html lang="${htmlLang}">`) &&
        html.includes('class="segmented doc-lang"')
      )
    })
    missing.length === 0
      ? ok(`${label}: all ${files.length} pages carry viewport, stylesheet, UTF-8, theme, top-of-page and the language switch`)
      : bad(`${label}: ${missing.length} incomplete, e.g. ${missing[0]}`)
  }
}

{
  const wrong = []
  for (const [label, dir] of [['en', EN], ['zh', ZH]])
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.html')))
      if (
        !readFileSync(join(dir, file), 'utf8').includes(
          '<span class="doc-top-title">Puzzles</span>',
        )
      )
        wrong.push(`${label}/${file}`)
  wrong.length === 0
    ? ok('every page names the collection, in English, at the head of the bar')
    : bad(`${wrong.length} pages do not, e.g. ${wrong[0]}`)
}

{
  const files = readdirSync(EN).filter((f) => f.endsWith('.html'))
  const problems = []
  for (const file of files) {
    const en = body(readFileSync(join(EN, file), 'utf8'))
    let zh
    try {
      zh = body(readFileSync(join(ZH, file), 'utf8'))
    } catch {
      problems.push(`${file}: no Chinese page`)
      continue
    }
    if (tags(en) !== tags(zh)) problems.push(`${file}: tag sequence`)
    if (attrs(en, 'href') !== attrs(zh, 'href')) problems.push(`${file}: links`)
    if (attrs(en, 'name') !== attrs(zh, 'name')) problems.push(`${file}: anchors`)
  }
  problems.length === 0
    ? ok(`${files.length} translated pages: same tags, same links, same anchors`)
    : bad(problems.slice(0, 5).join('; '))
}

{
  const games = JSON.parse(readFileSync(join(ROOT, 'src/games.json'), 'utf8'))
  const dead = []
  for (const { name } of games)
    for (const dir of [EN, ZH]) {
      let html
      try {
        html = readFileSync(join(dir, `${name}.html`), 'utf8')
      } catch {
        dead.push(`${dir}/${name}.html`)
        continue
      }
      const heading = html.match(/<h1><a name="([^"]+)"><\/a>/)
      if (heading?.[1] !== name)
        dead.push(`${name}.html opens on ${heading?.[1] ?? 'no h1 anchor'}`)
    }
  dead.length === 0
    ? ok(`all ${games.length} "Full instructions" pages open on their own chapter, both languages`)
    : bad(dead.slice(0, 5).join(', '))
}

console.log(failures ? `\n${failures} failed` : '\nall good')
process.exit(failures ? 1 : 0)
