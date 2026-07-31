/*
 * Every colour in the collection, three ways.
 *
 * The collection has 426 colour slots across its forty puzzles, and three
 * answers for each: what upstream's C computes, what this app draws on a light
 * board, and what it draws on a dark one. This walks all three out of the
 * source — no hex is written here or in the page it emits.
 *
 *   upstream  vendor/sgtpuzzles/<game>.c, compiled and asked.
 *
 *             The colours are `static` inside each game and reachable only
 *             through the `game` struct, so a harness links one puzzle against
 *             the collection's core and calls `thegame.colours()` — the same
 *             call the midend makes at startup. The frontend stub is emcc.c's,
 *             copied: 0.9 grey, then whatever the page says. Upstream's page
 *             says nothing and neither does ours (see `.host-board` in
 *             index.css), so 0.9 grey is what every puzzle is built on.
 *
 *   light     the strings js_set_colour delivers, caught by booting the
 *             shipped wasm with a host that records and does nothing else.
 *             This is `named[]` in the renderer, before palette.ts runs.
 *
 *   dark      forDarkBoard(named, game), which is what the renderer swaps in.
 *
 * The first two are independent routes to the same fact and must agree: the
 * light board is upstream's board. The page says so per slot rather than
 * claiming it, and this script fails if they ever diverge.
 *
 * Requires: gcc, and a preview server (scripts/build-games.sh runs one; on its
 * own, `npx vite preview --port 4173` first).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendor = path.join(root, 'vendor/sgtpuzzles')
const BASE = process.env.PUZZLES_BASE ?? 'http://localhost:4173'
const OUT = path.join(root, 'doc/palette.html')

const games = JSON.parse(fs.readFileSync(path.join(root, 'src/games.json'), 'utf8'))

/* The core the solvers link against — CMakeLists' core_obj, less the platform
   sources. An archive, so nullfe's drawing stubs win over drawing.c the way
   they do in upstream's own cliprogram() builds. */
const CORE = `combi divvy draw-poly drawing dsf findloop grid latin laydomino loopgen
malloc matching midend misc penrose penrose-legacy ps random sort tdq tree234 version
hat spectre`.split(/\s+/)

/* emcc.c's own frontend colour, and a main() that prints what the game says. */
const HARNESS = `#include <stdio.h>
#include "puzzles.h"
void frontend_default_colour(frontend *fe, float *output)
{ output[0] = output[1] = output[2] = 0.9F; }
int main(void) {
    int n = 0, i; char col[8]; float *c = thegame.colours(NULL, &n);
    printf("[");
    for (i = 0; i < n; i++) {
        /* emcc.c's own line, so the rounding is the shipped one. It is single
           precision and it matters: 255 * 0.9f rounds to exactly 229.5, which
           carries to #e6, where the same sum in double truncates to #e5. */
        sprintf(col, "#%02x%02x%02x",
                (unsigned)(0.5F + 255 * c[i*3+0]),
                (unsigned)(0.5F + 255 * c[i*3+1]),
                (unsigned)(0.5F + 255 * c[i*3+2]));
        printf("%s\\"%s\\"", i ? "," : "", col);
    }
    printf("]\\n");
    return 0;
}
`

/**
 * What each slot is called, off the enum the game declares them in. Upstream
 * names every one COL_SOMETHING and counts them with NCOLOURS; a game whose
 * enum this cannot find keeps its indices and says so.
 */
function slotNames(game) {
  const src = fs.readFileSync(path.join(vendor, `${game}.c`), 'utf8')
  for (const [, raw] of src.matchAll(/enum\s*\{([^}]*NCOLOURS[^}]*)\}/g)) {
    const names = []
    const aliases = {}
    // Comments first, and over the whole body: unruly's spans four lines and
    // has commas in its prose, which splitting on commas would turn into names.
    const body = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const part of body.split(',')) {
      const entry = part.trim()
      if (!entry) continue
      if (/^NCOLOURS\b/.test(entry)) return { names, aliases }
      const [name, rhs] = entry.split('=').map((t) => t.trim())
      // `COL_CURSOR_BACKGROUND = COL_LOWLIGHT` is a second name for a slot that
      // already exists, not a slot of its own — six games do this, and counting
      // them would shift every name after it onto the wrong colour.
      const at = rhs ? names.indexOf(rhs) : -1
      if (at >= 0) (aliases[at] ??= []).push(name)
      else names.push(name)
    }
    return { names, aliases }
  }
  return { names: [], aliases: {} }
}


// --- upstream: compile each puzzle's own colours() and ask it ---------------

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'palette-'))
fs.writeFileSync(path.join(tmp, 'harness.c'), HARNESS)
// nullfe minus its own frontend_default_colour, so the harness's is the only one.
fs.writeFileSync(
  path.join(tmp, 'nullfe.c'),
  fs
    .readFileSync(path.join(vendor, 'nullfe.c'), 'utf8')
    .replace(/^void frontend_default_colour\(frontend \*fe, float \*output\) \{\}$/m, ''),
)

console.log('==> compiling the collection core')
const objs = CORE.map((name) => {
  const o = path.join(tmp, `${name}.o`)
  execFileSync('gcc', ['-O0', '-w', `-I${vendor}`, '-c', path.join(vendor, `${name}.c`), '-o', o])
  return o
})
execFileSync('ar', ['rcs', path.join(tmp, 'libcore.a'), ...objs])

console.log('==> asking each puzzle for its colours')
const upstream = new Map()
for (const { name } of games) {
  const bin = path.join(tmp, `dump-${name}`)
  execFileSync('gcc', [
    '-O0', '-w', `-I${vendor}`, '-o', bin,
    path.join(tmp, 'harness.c'), path.join(tmp, 'nullfe.c'),
    path.join(vendor, `${name}.c`), path.join(tmp, 'libcore.a'), '-lm',
  ])
  upstream.set(name, JSON.parse(execFileSync(bin, { encoding: 'utf8' })))
}

// --- light and dark: boot the shipped wasm, then run palette.ts over it -----

/* Imported as it is written. Node strips the types itself, and palette.ts
   imports nothing, so the rules the page reports are the running ones rather
   than a copy of them. */
const P = await import(path.join(root, 'src/engine/palette.ts'))

console.log('==> booting each puzzle')
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM ??
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage()
await page.goto(BASE, { waitUntil: 'load' })

const rows = []
for (const { name, displayName } of games) {
  const light = await page.evaluate(async (game) => {
    const seen = []
    const noop = () => {}
    // Everything the glue reaches for, answered; only the colours are kept.
    const draw = new Proxy(
      {
        setColour: (i, css) => { seen[i] = css },
        // What the renderer answers: the canvas carries no background, so
        // nothing is written and the C keeps the grey it started with.
        defaultColour: () => null,
        fontMidpoint: () => 0,
        newBlitter: () => 0,
      },
      { get: (t, k) => (k in t ? t[k] : noop) },
    )
    const host = new Proxy(
      { gameId: '', draw, selectedPreset: 0, loadPrefs: () => null },
      { get: (t, k) => (k in t ? t[k] : noop) },
    )
    const factory = (await import(`/engine/${game}.js`)).default
    await factory({ puzzle: host })
    return seen
  }, name)

  rows.push({
    name, displayName,
    ...slotNames(name),
    upstream: upstream.get(name),
    light,
    dark: P.forDarkBoard(light, name),
  })
  process.stdout.write(`  ${name.padEnd(10)} ${light.length}\n`)
}
await browser.close()

// --- the two independent routes to the light board must agree --------------

let mismatched = 0
for (const row of rows)
  row.light.forEach((css, i) => {
    if (css.toLowerCase() !== row.upstream[i]) {
      console.error(`  ${row.name}[${i}]: C says ${row.upstream[i]}, the app draws ${css}`)
      mismatched++
    }
  })
if (mismatched) {
  console.error(`\n${mismatched} slots where the light board is not upstream's board`)
  process.exit(1)
}

// --- which rule reached each slot ------------------------------------------

/*
 * Recomputed here from the same tables and thresholds forDarkBoard uses, in
 * the order it applies them. Nothing is duplicated: palette.ts exports the
 * tables, and this reads them.
 */
const parse = (css) => {
  const m = /^#([0-9a-f]{6})$/i.exec(css)
  if (!m) return null
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min)
  return { s, l }
}

function ruleFor(row, index) {
  const { name } = row
  const semantic = P.SEMANTIC[name]
  const colour = parse(row.light[index])
  const tags = []
  if (!colour) return ['unparsed']

  if (P.DERIVED[name]?.includes(index)) tags.push('derived')
  else if (semantic?.includes(index)) tags.push('compress')
  else if (index === P.BACKGROUND && row.light[index] !== row.dark[index] && semantic)
    tags.push('flip')
  else if (colour.s >= P.ACHROMATIC) tags.push('veil')
  else tags.push('flip')

  if (index === P.BACKGROUND && semantic && row.dark[index] !== undefined) {
    const d = parse(row.dark[index])
    if (d && Math.abs(d.l - (P.BOARD_IS_PAPER.has(name) ? P.PAPER_BOARD : P.SEMANTIC_BOARD)) < 1e-6)
      tags[0] = 'board-raised'
  }
  if (P.BEVEL[name]?.some((pair) => pair.includes(index))) tags.push('bevel')
  if (P.FIGURE[name]?.includes(index)) tags.push('figure')
  if (P.RIM[name] && index in P.RIM[name]) tags.push('rim')
  if (row.light[index].toLowerCase() === row.dark[index]?.toLowerCase()) tags.push('unchanged')
  return tags
}

for (const row of rows) row.rules = row.light.map((_, i) => ruleFor(row, i))

fs.writeFileSync(path.join(tmp, 'palette.json'), JSON.stringify(rows, null, 1))
console.log(`\n==> ${rows.reduce((n, r) => n + r.light.length, 0)} slots, light board verified against the C`)
console.log(`==> data: ${path.join(tmp, 'palette.json')}`)


// --- the page --------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Three swatches and the hex under each, for one slot. */
const cell = (css) =>
  `<td class="sw"><i style="background:${esc(css)}"></i><code>${esc(css)}</code></td>`

const RULE_TEXT = {
  flip: 'flip', veil: 'veil', compress: 'compress', derived: 'derived',
  'board-raised': 'board raised', bevel: 'bevel', figure: 'figure',
  rim: 'rim', unchanged: 'unchanged', unparsed: 'not a hex',
}

const table = (row) =>
  row.light
    .map((css, i) => {
      const name = row.names[i]
      const alias = row.aliases[i]?.length ? ` <span class="alias">= ${row.aliases[i].map(esc).join(', ')}</span>` : ''
      const tags = row.rules[i].map((t) => `<span class="tag t-${t}">${RULE_TEXT[t] ?? t}</span>`).join('')
      return `<tr><th><span class="ix">${i}</span>${name ? `<code>${esc(name)}</code>` : '<em>generated</em>'}${alias}</th>` +
        cell(row.upstream[i]) + cell(css) + cell(row.dark[i]) + `<td class="rules">${tags}</td></tr>`
    })
    .join('\n')

const games_html = rows
  .map(
    (row) => `<section id="${row.name}">
<h3>${esc(row.displayName)} <span class="count">${row.light.length} slots</span></h3>
<div class="scroll"><table>
<thead><tr><th>slot</th><th>upstream</th><th>light</th><th>dark</th><th>rule</th></tr></thead>
<tbody>
${table(row)}
</tbody></table></div>
</section>`,
  )
  .join('\n')

const tally = {}
for (const row of rows) for (const tags of row.rules) for (const t of tags) tally[t] = (tally[t] ?? 0) + 1
const total = rows.reduce((n, r) => n + r.light.length, 0)

const params = [
  ['ACHROMATIC', P.ACHROMATIC, 'Saturation at or above which a colour is carrying meaning, and is veiled rather than flipped. The single number that sorts 392 of the 426 slots into their rule.'],
  ['FLOOR', P.FLOOR, "The dark board's lightest black. A flip maps into [FLOOR, CEILING] rather than to 1 − l, so nothing lands on pure black or pure white."],
  ['CEILING', P.CEILING, "The dark board's darkest white, same reason."],
  ['VEIL', P.VEIL, 'How much black is laid over a hue at its brightest. Upstream chose its hues against a white board; at full strength they are the loudest thing on a dark one.'],
  ['SEMANTIC_BOARD', P.SEMANTIC_BOARD, 'Where a board goes when it has to move out from under a black the rules keep — the games in SEMANTIC whose kept grey would otherwise be darker than the flipped board.'],
  ['PAPER_BOARD', P.PAPER_BOARD, 'The same, for the two games whose white half is the board itself rather than something drawn on it.'],
  ['NUDGES', `[${P.NUDGES.join(', ')}]`, 'Offsets tried, in order, when a veiled colour lands too close to something it has to be told apart from.'],
]

const tables = [
  ['SEMANTIC', P.SEMANTIC, 'Slots whose being black or white is something the rules say. Compressed into the dark range the way up they started, rather than turned over.'],
  ['DERIVED', P.DERIVED, "Slots the C defines as a shade of the board — `ret[COL_X] = ret[COL_BACKGROUND] * k`. They keep the contrast upstream gave them against the board, the other way round, found by bisection."],
  ['BEVEL', P.BEVEL, "Pairs that are a lit and a shaded edge of the same relief. The rules are about what a colour is; relief is about where the light comes from, so after the rules run the pair is swapped if the lit side did not come out lighter."],
  ['FIGURE', P.FIGURE, 'Slots that are a picture drawn on the board rather than part of it — Undead\'s three monsters. On a dark board these are served their light values, and only where the call is a shape.'],
  ['RIM', P.RIM, 'Where a fill and its outline are the same slot, and a table of colours by slot has only one colour to give. Dark boards only, and only where the two arrive equal.'],
]

const html = `<!-- Generated by scripts/build-palette.mjs. Do not edit. -->
<style>
:root { --fg:#1a1a1a; --dim:#666; --bg:#fff; --line:#e3e3e3; --card:#fafafa; --accent:#2563eb; }
:root[data-theme="dark"], html[data-theme="dark"] { --fg:#e8e8e8; --dim:#9a9a9a; --bg:#121214; --line:#2c2c30; --card:#1a1a1e; --accent:#7aa2f7; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --fg:#e8e8e8; --dim:#9a9a9a; --bg:#121214; --line:#2c2c30; --card:#1a1a1e; --accent:#7aa2f7; } }
* { box-sizing:border-box }
body { margin:0; padding:2rem 1.25rem 5rem; background:var(--bg); color:var(--fg);
  font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  max-width:64rem; margin-inline:auto; overflow-x:hidden }
h1 { font-size:1.8rem; line-height:1.2; margin:0 0 .4rem }
h2 { font-size:1.25rem; margin:2.5rem 0 .75rem; padding-top:1.25rem; border-top:1px solid var(--line) }
h3 { font-size:1.05rem; margin:1.75rem 0 .5rem; display:flex; align-items:baseline; gap:.6rem }
p, li { color:var(--fg) }
.lede { color:var(--dim); margin:0 0 1.5rem }
code { font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace }
.scroll { overflow-x:auto; -webkit-overflow-scrolling:touch }
table { border-collapse:collapse; width:100%; min-width:40rem; font-size:13px }
th, td { text-align:left; padding:.3rem .5rem; border-bottom:1px solid var(--line); vertical-align:middle }
thead th { color:var(--dim); font-weight:500; font-size:11px; text-transform:uppercase; letter-spacing:.05em }
tbody th { font-weight:400; white-space:nowrap }
.ix { display:inline-block; min-width:1.7rem; color:var(--dim); font:12px ui-monospace,monospace }
.alias { color:var(--dim); font-size:12px }
.sw { white-space:nowrap }
.sw i { display:inline-block; width:1.5rem; height:1.5rem; border-radius:4px; vertical-align:-.45rem;
  margin-right:.4rem; border:1px solid rgba(128,128,128,.35) }
.count { color:var(--dim); font-size:12px; font-weight:400 }
.rules { white-space:nowrap }
.tag { display:inline-block; padding:.05rem .4rem; margin-right:.25rem; border-radius:99px;
  font-size:11px; border:1px solid var(--line); color:var(--dim) }
.t-veil { border-color:#c4923f; color:#a9762a } .t-flip { border-color:#4b8bbe; color:#3a76a6 }
.t-compress { border-color:#8b5cf6; color:#7c4ddb } .t-derived { border-color:#12a594; color:#0e8c7d }
.t-bevel, .t-figure, .t-rim, .t-board-raised { border-color:#d05a6e; color:#c04a5e }
:root[data-theme="dark"] .t-veil { color:#e0b464 } :root[data-theme="dark"] .t-flip { color:#7fb3d9 }
:root[data-theme="dark"] .t-compress { color:#b092f5 } :root[data-theme="dark"] .t-derived { color:#4dd4c0 }
:root[data-theme="dark"] .t-bevel, :root[data-theme="dark"] .t-figure,
:root[data-theme="dark"] .t-rim, :root[data-theme="dark"] .t-board-raised { color:#f08ba0 }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:.9rem 1.1rem; margin:1rem 0 }
.card h4 { margin:0 0 .3rem; font-size:.95rem }
.card p { margin:0; color:var(--dim); font-size:13.5px }
.ok { color:#0e8c7d; font-weight:500 }
dl { margin:0 } dt { font-weight:500; margin-top:.75rem } dd { margin:.15rem 0 0; color:var(--dim); font-size:13.5px }
.toc { display:flex; flex-wrap:wrap; gap:.35rem; margin:1rem 0 }
.toc a { display:inline-block; padding:.15rem .55rem; border:1px solid var(--line); border-radius:99px;
  text-decoration:none; color:var(--fg); font-size:12.5px }
.toc a:hover { border-color:var(--accent); color:var(--accent) }
</style>

<h1>Every colour in the collection</h1>
<p class="lede">${total} colour slots across ${rows.length} puzzles, three ways: what upstream&rsquo;s C computes,
what this app draws on a light board, and what it draws on a dark one.
Generated by <code>scripts/build-palette.mjs</code> &mdash; no hex is written by hand.</p>

<div class="card">
<h4>Where each column comes from</h4>
<p><strong>upstream</strong> &mdash; <code>vendor/sgtpuzzles/&lt;game&gt;.c</code>, compiled and asked. The colours are
<code>static</code> inside each puzzle and reachable only through its <code>game</code> struct, so a harness links one
puzzle against the collection&rsquo;s core and calls <code>thegame.colours()</code> &mdash; the same call the midend makes at
startup. The frontend stub is <code>emcc.c</code>&rsquo;s, copied: <code>0.9F</code> grey, then whatever the page says.
Upstream&rsquo;s page says nothing and neither does ours, so every puzzle in the collection is built on the same 0.9 grey.
The hex is formatted by <code>emcc.c</code>&rsquo;s own <code>sprintf</code> line, in the C, because the rounding is single
precision and it matters: <code>255 * 0.9f</code> rounds to exactly 229.5, which carries to <code>#e6</code>, where the
same sum in double truncates to <code>#e5</code>.</p>
<p style="margin-top:.6rem"><strong>light</strong> &mdash; the strings <code>js_set_colour</code> delivers, caught by booting the shipped
wasm with a host that records and does nothing else. This is <code>named[]</code> in the renderer, before palette.ts runs.</p>
<p style="margin-top:.6rem"><strong>dark</strong> &mdash; <code>forDarkBoard(named, game)</code>, which is what the renderer swaps in.</p>
</div>

<div class="card">
<h4>The light board is upstream&rsquo;s board</h4>
<p>The first two columns are independent routes to the same fact &mdash; one compiles the C, the other runs the shipped
wasm through this app&rsquo;s own JavaScript &mdash; and they agree on
<span class="ok">all ${total} slots</span>. Nothing this port does changes a colour on a light board. The generator
exits non-zero if that ever stops being true, so the claim is checked rather than made.</p>
</div>

<h2>The three rules</h2>
<p>Applied by <code>forDarkBoard</code> in this order. One distinction is behind them: a puzzle&rsquo;s
<em>structure</em> lives in its neutrals and wants to be the other way up on a dark surface; its <em>meaning</em> lives
in its hues &mdash; Mines&rsquo; digits, Map&rsquo;s regions, Tents&rsquo; grass &mdash; and inverting those would be a lie.</p>
<dl>
<dt><span class="tag t-compress">compress</span> ${tally.compress ?? 0} slots</dt>
<dd>A grey whose being black or white is something the rules say. Kept the way up it started, only pulled into the dark
board&rsquo;s range. Black stays black. Listed per game in <code>SEMANTIC</code>, because the line is not quite where
saturation puts it: Pearl&rsquo;s two circles carry meaning and have no hue at all.</dd>
<dt><span class="tag t-veil">veil</span> ${tally.veil ?? 0} slots</dt>
<dd>Anything with a hue at or above <code>ACHROMATIC</code>. Kept, with black laid over it in proportion to how much
light it throws.</dd>
<dt><span class="tag t-flip">flip</span> ${tally.flip ?? 0} slots</dt>
<dd>Every other grey: the board, the shading, the ink, the lines. Turned over into
<code>[FLOOR, CEILING]</code>.</dd>
<dt><span class="tag t-derived">derived</span> ${tally.derived ?? 0} slots</dt>
<dd>Ahead of the other three, and the reason they do not reach these: the C defines the colour <em>as</em> a shade of its
board. Those keep the contrast they had against the board, the other way round.</dd>
</dl>
<p>Which rule a slot takes is computed from its saturation for all but the
${(tally.compress ?? 0) + (tally.derived ?? 0)} slots named in the two tables below.
<strong>No colour on this page was chosen.</strong> Every dark value is the output of one of these rules, and the bevel
correction adds none either &mdash; it exchanges two values a rule already produced.</p>

<h2>Parameters</h2>
<p>The numbers the rules are tuned by. All are in <code>src/engine/palette.ts</code>.</p>
<div class="scroll"><table><thead><tr><th>name</th><th>value</th><th>what it does</th></tr></thead><tbody>
${params.map(([n, v, why]) => `<tr><th><code>${n}</code></th><td><code>${esc(v)}</code></td><td style="white-space:normal">${why}</td></tr>`).join('\n')}
</tbody></table></div>

<h2>Corrections and exceptions</h2>
<p>Laid over the three rules. The first two change a colour; the last three are decided where the shape is drawn, not
in the palette, because the palette has one colour per slot and these need two.</p>
<dl>
${tables.map(([n, t, why]) => {
  const games_in = Object.keys(t instanceof Set ? Object.fromEntries([...t].map((k) => [k, 1])) : t)
  return `<dt><code>${n}</code> &mdash; ${games_in.length} game${games_in.length === 1 ? '' : 's'}</dt>
<dd>${why}<br><span style="font-size:12.5px">${games_in.map(esc).join(', ')}</span></dd>`
}).join('\n')}
<dt><code>BOARD_IS_PAPER</code> &mdash; ${P.BOARD_IS_PAPER.size} games</dt>
<dd>The games whose white half <em>is</em> the board, so nothing is painted white on them. Their board is raised to
<code>PAPER_BOARD</code> rather than <code>SEMANTIC_BOARD</code> when it has to move. Declared rather than computed:
whether a slot is ever drawn is a fact about the C, not about the colour in it, and Singles&rsquo; unused
<code>COL_WHITE</code> is exactly the case that would fool a test on colours alone.<br>
<span style="font-size:12.5px">${[...P.BOARD_IS_PAPER].map(esc).join(', ')}</span></dd>
<dt>Undead&rsquo;s mirrors &mdash; not a table at all</dt>
<dd>The one exception decided by neither the palette nor a slot. Undead&rsquo;s mirrors and its monsters&rsquo; strokes are
drawn in the same colour slot, and the mirrors must turn over while the monsters must not. What separates them is the
C&rsquo;s own difference between a stroke and a bar: every <code>draw_line</code> in the game is inside
<code>draw_monster</code> and arrives at width 1 exactly, and the mirror is the game&rsquo;s only
<code>draw_thick_line</code>. So the rule is on the line width, in the renderer.</dd>
</dl>

<h2>Every slot</h2>
<div class="toc">${rows.map((r) => `<a href="#${r.name}">${esc(r.displayName)}</a>`).join('')}</div>
${games_html}
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, html)
console.log(`==> wrote ${path.relative(root, OUT)} (${Math.round(html.length / 1024)} KB)`)
