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
    footer:
      "Simon Tatham's Portable Puzzle Collection, distributed under the " +
      '<a href="licence.html#licence">MIT licence</a>.',
  },
  zh: {
    dir: 'zh/',
    htmlLang: 'zh-Hans',
    home: 'Puzzles',
    section: '手册',
    footer:
      'Simon Tatham’s Portable Puzzle Collection，以 ' +
      '<a href="licence.html#licence">MIT 许可证</a>分发。' +
      '本手册为英文原版的简体中文译本。',
  },
}

const LANGS = /** @type {const} */ (['en', 'zh'])
const LABEL = { en: 'EN', zh: '中文' }

/** The app's back arrow, drawn the same way Icon.tsx draws it. */
const BACK_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M19.5 12H5"/><path d="M11 6l-6 6 6 6"/></svg>'

/*
 * Resolve the theme before anything is painted, exactly as index.html does —
 * same storage key, same two colours — so following a link into the manual
 * does not flash white at a reader who has chosen dark. The second listener
 * keeps the app's idea of the language in step when it is changed from here.
 */
const HEAD_SCRIPT = `<script>
;(function () {
  try {
    var choice = localStorage.getItem('puzzles.theme')
    var dark =
      choice === 'dark' ||
      (choice !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document
      .querySelector('meta[name="theme-color"]')
      .setAttribute('content', dark ? '#101013' : '#fafaf9')
  } catch (e) {}
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('.doc-lang a')
    if (!link) return
    try {
      localStorage.setItem('puzzles.lang', link.getAttribute('data-lang'))
    } catch (e) {}
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
<link rel="stylesheet" href="/doc.css">
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
  return `<header class="doc-top">
<a class="doc-home" href="/">${BACK_ICON}${c.home}</a>
<span class="doc-top-title">${c.section}</span>
<span class="doc-lang">${choices}</span>
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

// --- 3. dress ------------------------------------------------------------
const styledEn = styleTree(OUT, 'en')
const styledZh = existsSync(join(OUT, 'zh')) ? styleTree(join(OUT, 'zh'), 'zh') : 0

writeFileSync(
  join(ROOT, 'public/doc.css'),
  '/* Generated by scripts/build-doc.mjs from src/tokens.css and src/doc.css.\n' +
    '   Edit those, not this. */\n' +
    readFileSync(join(ROOT, 'src/tokens.css'), 'utf8') +
    '\n' +
    readFileSync(join(ROOT, 'src/doc.css'), 'utf8'),
)

console.log(`manual: ${styledEn} pages en, ${styledZh} pages zh`)
