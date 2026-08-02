/*
 * The manual: generated, translated, and given a stylesheet.
 *
 * Upstream ships the manual as halibut's raw output — HTML 4.01, no CSS, and
 * no viewport meta, so on a phone it renders at desktop width and has to be
 * pinched. The words are worth reading; the page has simply never been dressed.
 *
 * This script does three things and stops:
 *
 *   1. runs halibut over vendor's puzzles.but with upstream's own flags, so
 *      the anchors the game pages link to (../doc/<game>.html#<game>) resolve
 *      exactly as they always have;
 *   2. lays the Simplified Chinese translation of that same output, kept in
 *      doc-zh/, alongside it as a second tree under public/doc/zh/;
 *   3. gives every page a head worth having and wraps its body in the app's
 *      chrome.
 *
 * The body markup itself is not touched. What comes out between <main> and
 * </main> is byte-for-byte what halibut wrote (or, for the second tree, what
 * the translation of it says) — the styling reaches it through element
 * selectors and the position of the nav paragraph, not through classes
 * sprinkled into the prose. verify-doc.mjs checks that.
 *
 * Regenerating is the whole job, every time: there is no in-place edit to be
 * idempotent about, because step 1 starts by deleting the tree.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, 'vendor/sgtpuzzles')
const OUT = join(ROOT, 'public/doc')
const ZH_SRC = join(ROOT, 'doc-zh')

/* --- the chrome ---------------------------------------------------------
 * The only words this script contributes. Everything else on the page is
 * upstream's, or a translation of upstream's.
 */
const CHROME = {
  en: {
    dir: '',
    htmlLang: 'en',
    home: 'Puzzles',
    section: 'Manual',
    /* One label for both states, because there is no React here to rewrite it
       on the way past and a stale one is worse than a general one. */
    theme: 'Light or dark',
    footer:
      "Simon Tatham's Portable Puzzle Collection, distributed under the " +
      '<a href="licence.html#licence">MIT licence</a>.',
  },
  zh: {
    dir: 'zh/',
    htmlLang: 'zh-Hans',
    home: 'Puzzles',
    section: '手册',
    theme: '浅色或深色',
    footer:
      'Simon Tatham’s Portable Puzzle Collection，以 ' +
      '<a href="licence.html#licence">MIT 许可证</a>分发。' +
      '本手册为英文原版的简体中文译本。',
  },
}

const LANGS = /** @type {const} */ (['en', 'zh'])
const LABEL = { en: 'EN', zh: '中文' }

/** The app's glyphs, drawn the same way Icon.tsx draws them. */
const icon = (size, body) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
  `stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

const BACK_ICON = icon(18, '<path d="M19.5 12H5"/><path d="M11 6l-6 6 6 6"/>')

/*
 * Both of them, always in the markup, with the stylesheet showing whichever
 * names what a press would do — the sun while the page is dark, as in the
 * app. There is no script here to swap them with, and one that did would have
 * to run after the theme is resolved and again on every toggle; `data-theme`
 * is already on the root by then, so CSS can simply read it.
 */
const SUN_ICON = icon(
  20,
  '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2"/>' +
    '<path d="M12 19.2v2.2"/><path d="M2.6 12h2.2"/><path d="M19.2 12h2.2"/>' +
    '<path d="m5.3 5.3 1.6 1.6"/><path d="m17.1 17.1 1.6 1.6"/>' +
    '<path d="m18.7 5.3-1.6 1.6"/><path d="m6.9 17.1-1.6 1.6"/>',
)
const MOON_ICON = icon(
  20,
  '<path d="M20.6 13.4A8.6 8.6 0 1 1 10.6 3.4 6.7 6.7 0 0 0 20.6 13.4Z"/>',
)

/*
 * Resolve the theme before anything is painted, exactly as index.html does —
 * same storage key, same two colours — so following a link into the manual
 * does not flash white at a reader who has chosen dark. A blocked store is
 * only a lost preference, so the read is what is guarded and not the applying:
 * the system's answer still gets used, and the root still gets an attribute
 * for the stylesheet to read.
 *
 * Then three listeners. The first keeps the app's idea of the language in step
 * when it is changed from here; the second is the bar's own light-and-dark
 * button; the third makes the bar's arrow a real back where there is one.
 */
const HEAD_SCRIPT = `<script>
;(function () {
  var root = document.documentElement
  var bar = document.querySelector('meta[name="theme-color"]')
  function paint(dark) {
    root.dataset.theme = dark ? 'dark' : 'light'
    bar.setAttribute('content', dark ? '#101013' : '#fafaf9')
  }
  function stored() {
    try {
      return localStorage.getItem('puzzles.theme') === 'dark'
    } catch (e) {
      return false
    }
  }
  paint(stored())
  // The app is a tab of its own — this page was opened from it — and the two
  // share one setting, so a change made over there has to arrive here. Fires
  // in every other document of the origin and never in the one that wrote.
  addEventListener('storage', function (event) {
    if (event.key === null || event.key === 'puzzles.theme') paint(stored())
  })
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('.doc-lang a')
    if (!link) return
    try {
      localStorage.setItem('puzzles.lang', link.getAttribute('data-lang'))
    } catch (e) {}
  })
  // The same one press the app has, doing the same thing to the same key:
  // commit to a side, write it down, and turn this page over on the spot.
  // "System" is a third state and stays where a third state can be shown,
  // which is the app's settings.
  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('.doc-theme')
    if (!button) return
    var dark = root.dataset.theme !== 'dark'
    try {
      localStorage.setItem('puzzles.theme', dark ? 'dark' : 'light')
    } catch (e) {}
    paint(dark)
  })
  // The arrow means "back to the app". Where the app really is the page
  // behind this one, take that step, so the reader lands on the board they
  // left rather than on a second copy of the app pushed over the manual.
  // Arriving from elsewhere in the manual, or from nowhere at all, the href
  // stands: home is then somewhere to go, and the manual carries its own
  // previous and next for moving within itself.
  document.addEventListener('click', function (event) {
    var home = event.target.closest && event.target.closest('.doc-home')
    if (!home || event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    // A tab of its own has nothing behind it; back would be a dead click.
    if (history.length < 2) return
    var from = document.referrer
    var root = location.origin + '/'
    if (from.lastIndexOf(root, 0) !== 0) return
    if (from.slice(location.origin.length).lastIndexOf('/doc/', 0) === 0) return
    event.preventDefault()
    history.back()
  })
})()
</script>`

/** Everything before `<body>`, replaced wholesale. */
function head(lang, title, links) {
  const c = CHROME[lang]
  return `<!doctype html>
<html lang="${c.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fafaf9">
<title>${title}</title>
<link rel="stylesheet" href="${STYLESHEET}">
${links.join('\n')}
${HEAD_SCRIPT}
</head>`
}

/** The bar, which is the app saying where you are. */
function topBar(lang, file) {
  const c = CHROME[lang]
  const choices = LANGS.map((code) => {
    const current = code === lang ? ' aria-current="true"' : ''
    return (
      `<a href="/doc/${CHROME[code].dir}${file}" data-lang="${code}" ` +
      `hreflang="${CHROME[code].htmlLang}"${current}>${LABEL[code]}</a>`
    )
  }).join('')
  // Two classes doing two jobs: `segmented` is the app's own control, shared
  // rather than imitated (see src/segmented.css), and `doc-lang` is what the
  // script in the head listens on to keep the app's idea of the language in
  // step when it is changed from here.
  return `<header class="doc-top">
<a class="doc-home" href="/">${BACK_ICON}${c.home}</a>
<span class="doc-top-title">${c.section}</span>
<span class="segmented doc-lang">${choices}</span>
<button type="button" class="doc-theme" aria-label="${c.theme}">${SUN_ICON}${MOON_ICON}</button>
</header>`
}

/**
 * Halibut's output is machine-regular: a doctype, a head, `<body>` on its own
 * line, the prose, then `<hr><address></address></body>`. Both ends are
 * asserted rather than assumed — if a halibut upgrade changes the shape, this
 * should stop rather than quietly emit half a page.
 */
function restyle(source, lang, file) {
  const title = /<title>([\s\S]*?)<\/title>/.exec(source)
  if (!title) throw new Error(`${file}: no <title>`)

  const headEnd = source.indexOf('</head>')
  const links = [...source.slice(0, headEnd).matchAll(/<link [^>]*>/g)].map(
    (m) => m[0],
  )

  const open = source.indexOf('\n<body>\n')
  if (open < 0) throw new Error(`${file}: no <body> line`)
  const TAIL = '\n<hr><address></address></body>\n</html>\n'
  if (!source.endsWith(TAIL)) throw new Error(`${file}: unexpected tail`)

  const body = source.slice(open + '\n<body>\n'.length, source.length - TAIL.length)

  return `${head(lang, title[1], links)}
<body>
${topBar(lang, file)}
<main class="doc-main">
${body}
</main>
<footer class="doc-foot"><p>${CHROME[lang].footer}</p></footer>
</body>
</html>
`
}

function styleTree(dir, lang) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.html'))
  for (const file of files) {
    const path = join(dir, file)
    writeFileSync(path, restyle(readFileSync(path, 'utf8'), lang, file))
  }
  return files.length
}

// --- 1. generate ---------------------------------------------------------
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
execFileSync(
  'halibut',
  [
    '--html',
    '-Chtml-contents-filename:index.html',
    '-Chtml-index-filename:indexpage.html',
    '-Chtml-template-filename:%k.html',
    '-Chtml-template-fragment:%k',
    join(VENDOR, 'puzzles.but'),
  ],
  { cwd: OUT, stdio: 'inherit' },
)

// --- 2. lay the translation alongside ------------------------------------
const english = readdirSync(OUT).filter((f) => f.endsWith('.html'))
if (existsSync(ZH_SRC)) {
  const zh = readdirSync(ZH_SRC).filter((f) => f.endsWith('.html'))
  const missing = english.filter((f) => !zh.includes(f))
  if (missing.length)
    throw new Error(`doc-zh is missing: ${missing.join(', ')}`)
  mkdirSync(join(OUT, 'zh'), { recursive: true })
  for (const file of english)
    cpSync(join(ZH_SRC, file), join(OUT, 'zh', file))
}

/* --- 3. the stylesheet, before the pages that have to name it -------------
 *
 * Three files, in the order the app itself includes them: the tokens both
 * sides are built from, the one control both sides have, and the manual's own
 * rules. segmented.css is here rather than copied into doc.css because a
 * control described twice is a control that drifts, and this one had.
 *
 * Stamped with the digest of what came out. The app's own stylesheet is
 * hashed by Vite and so is a different address every time it changes; this one
 * was `/doc.css` for ever, and the service worker — which serves an asset from
 * its cache — took that literally. A reader who had opened the manual once
 * kept its first stylesheet through every deploy after, so pages arrived with
 * rules five versions old and the light-and-dark button drew both of its
 * faces. A query is enough: the worker keys on the whole URL, and this one
 * changes exactly when the contents do.
 */
const css =
  '/* Generated by scripts/build-doc.mjs from src/tokens.css,\n' +
  '   src/segmented.css and src/doc.css. Edit those, not this. */\n' +
  ['src/tokens.css', 'src/segmented.css', 'src/doc.css']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'))
    .join('\n')

writeFileSync(join(ROOT, 'public/doc.css'), css)
const STYLESHEET = `/doc.css?v=${createHash('sha256').update(css).digest('hex').slice(0, 8)}`

// --- 4. dress ------------------------------------------------------------
const styledEn = styleTree(OUT, 'en')
const styledZh = existsSync(join(OUT, 'zh')) ? styleTree(join(OUT, 'zh'), 'zh') : 0

console.log(`manual: ${styledEn} pages en, ${styledZh} pages zh, ${STYLESHEET}`)
