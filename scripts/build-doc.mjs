/*
 * The manual: generated, translated, and given a stylesheet.
 *
 * Upstream ships the manual as halibut's raw output — HTML 4.01, no CSS, and
 * no viewport meta, so on a phone it renders at desktop width and has to be
 * pinched. The words are worth reading; the page has simply never been dressed.
 *
 * This script does three things and stops:
 *
 *   1. runs halibut over vendor's puzzles.but with upstream's own flags, into
 *      public/doc/en/;
 *   2. lays the Simplified Chinese translation of that same output, kept in
 *      doc-zh/, alongside it as a second tree under public/doc/zh/;
 *   3. gives every page a head worth having and wraps its body in the app's
 *      chrome.
 *
 * One directory per language, neither of them the default. English used to sit
 * at the root of public/doc/ with the translation hanging off it, which said
 * that the manual was English and also had a Chinese version — a shape
 * upstream's own gallery pages once required, linking in as
 * ../doc/<game>.html. Those pages are not published here. Halibut's
 * cross-references are relative and stay within one tree, so the move costs
 * them nothing.
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
    htmlLang: 'en',
    /* One label for both states, because there is no React here to rewrite it
       on the way past and a stale one is worse than a general one. */
    theme: 'Light or dark',
    footer:
      "Simon Tatham's Portable Puzzle Collection, distributed under the " +
      '<a href="licence.html#licence">MIT licence</a>.',
  },
  zh: {
    htmlLang: 'zh-Hans',
    theme: '浅色或深色',
    footer:
      'Simon Tatham’s Portable Puzzle Collection，以 ' +
      '<a href="licence.html#licence">MIT 许可证</a>分发。' +
      '本手册为英文原版的简体中文译本。',
  },
}

/*
 * What stands at the head of the bar, in either language.
 *
 * The app's name rather than the word "Manual", which is what it used to say —
 * and which said the smaller of the two true things. A reader arrives here from
 * a puzzle, in a tab of its own with no way back (see topBar), so the question
 * the bar answers is not "which part of the app is this" but "what is this a
 * tab of". The name answers that; "Manual" left the app itself unnamed.
 *
 * Untranslated, like i18n's `brand`: it is what the collection is called.
 */
const BRAND = 'Puzzles'

const LANGS = /** @type {const} */ (['en', 'zh'])
const LABEL = { en: 'EN', zh: '中文' }

/** The app's glyphs, drawn the same way Icon.tsx draws them. */
const icon = (size, body) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
  `stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

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
 * It also drops the fragment a page arrives at its own name under, for the
 * reason written at the top of the script itself.
 *
 * Then two listeners: one keeps the app's idea of the language in step when it
 * is changed from here, the other is the bar's own light-and-dark button.
 */
const HEAD_SCRIPT = `<script>
;(function () {
  // Open at the top of the page, not a screenful into it.
  //
  // Halibut writes every cross-reference as file plus fragment — the contents
  // page links Net as \`net.html#net\` — because in its world one file may hold
  // several chapters. Here one never does: \`-Chtml-template-filename:%k.html\`
  // against \`-Chtml-template-fragment:%k\` puts each chapter in a file named
  // after it, so that fragment names the h1 rather than picking one chapter out
  // of many, and following it scrolls off the two things standing above the
  // h1 — halibut's own Previous | Contents | Index | Next row, and the
  // chapter's list of its own sections. Arriving with both gone reads as a page
  // that opened halfway through, which is what it is.
  //
  // Only the page's own name is dropped, and only from the address it was
  // loaded with; \`#net-controls\` is a real jump into the chapter and every
  // index entry is one too, so they are left exactly as they are. Rewriting
  // before the parser reaches <body> is enough on its own: the browser takes
  // the scroll from the URL once the document is parsed, and by then there is
  // nothing there to scroll to. Measured on net.html at a phone's width: this
  // opens at 0, and without it the page arrives 191px down.
  var self = location.pathname.replace(/.*\\//, '').replace(/\\.html$/, '')
  if (self && location.hash === '#' + self) {
    history.replaceState(null, '', location.pathname + location.search)
  }
  var root = document.documentElement
  var bar = document.querySelector('meta[name="theme-color"]')
  function paint(dark) {
    root.dataset.theme = dark ? 'dark' : 'light'
    bar.setAttribute('content', dark ? '#101013' : '#fafaf9')
  }
  var system = matchMedia('(prefers-color-scheme: dark)')
  // Stored light or dark wins; anything else — including nothing stored, which
  // is the common case — means whatever the machine is set to. useTheme's
  // \`read\` and \`resolve\`, in the form a page with no React can use.
  function stored() {
    try {
      var value = localStorage.getItem('puzzles.theme')
      if (value === 'light' || value === 'dark') return value === 'dark'
    } catch (e) {}
    return system.matches
  }
  paint(stored())
  // The app is a tab of its own — this page was opened from it — and the two
  // share one setting, so a change made over there has to arrive here. Fires
  // in every other document of the origin and never in the one that wrote.
  addEventListener('storage', function (event) {
    if (event.key === null || event.key === 'puzzles.theme') paint(stored())
  })
  // And the machine changing its mind, which reaches this page only while the
  // reader has left the setting to it — \`stored\` ignores it otherwise.
  system.addEventListener('change', function () {
    paint(stored())
  })
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('.doc-lang a')
    if (!link) return
    try {
      localStorage.setItem('puzzles.lang', link.getAttribute('data-lang'))
    } catch (e) {}
  })
  // One press, committing to a side: it writes light or dark, so a page left on
  // the machine's answer stops following it from here on. "System" is a third
  // state and stays where a third state can be shown, which is the app's
  // settings — and this is the only press of its kind left, the puzzle screen
  // having given its one up. A page of prose has nowhere else to put one.
  //
  // Reads the painted attribute rather than the stored value, so the side it
  // commits to is the opposite of what is on the screen, whether that came
  // from a choice or from the machine.
  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('.doc-theme')
    if (!button) return
    var dark = root.dataset.theme !== 'dark'
    try {
      localStorage.setItem('puzzles.theme', dark ? 'dark' : 'light')
    } catch (e) {}
    paint(dark)
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

/**
 * The bar, which is the app saying where you are — and, at this end of it,
 * nothing more than that.
 *
 * It used to open with a back arrow to the app. There was never anywhere for
 * it to go: the manual is only ever reached in a tab of its own, so the board
 * it was opened from is still there in the tab behind, and the arrow either
 * did nothing that the tab strip did not already do or pushed a second copy of
 * the app over the page. What is left is the label, saying which of the app's
 * two things you are looking at.
 */
function topBar(lang, file) {
  const c = CHROME[lang]
  const choices = LANGS.map((code) => {
    const current = code === lang ? ' aria-current="true"' : ''
    return (
      `<a href="/doc/${code}/${file}" data-lang="${code}" ` +
      `hreflang="${CHROME[code].htmlLang}"${current}>${LABEL[code]}</a>`
    )
  }).join('')
  // Two classes doing two jobs: `segmented` is the app's own control, shared
  // rather than imitated (see src/segmented.css), and `doc-lang` is what the
  // script in the head listens on to keep the app's idea of the language in
  // step when it is changed from here.
  return `<header class="doc-top">
<span class="doc-top-title">${BRAND}</span>
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
mkdirSync(join(OUT, 'en'), { recursive: true })
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
  { cwd: join(OUT, 'en'), stdio: 'inherit' },
)

// --- 2. lay the translation alongside ------------------------------------
const english = readdirSync(join(OUT, 'en')).filter((f) => f.endsWith('.html'))
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
 * Inside public/doc/, beside the two trees that are the only thing that ever
 * asks for it, rather than at the root of public/ where it used to sit.
 *
 * Stamped with the digest of what came out. The app's own stylesheet is
 * hashed by Vite and so is a different address every time it changes; this one
 * is one address regenerated in place, and the service worker — which serves an
 * asset from its cache — took that literally. A reader who had opened the
 * manual once kept its first stylesheet through every deploy after, so pages
 * arrived with rules five versions old and the light-and-dark button drew both
 * of its faces. A query is enough: the worker keys on the whole URL, and this
 * one changes exactly when the contents do.
 */
const css =
  '/* Generated by scripts/build-doc.mjs from src/tokens.css,\n' +
  '   src/segmented.css and src/doc.css. Edit those, not this. */\n' +
  ['src/tokens.css', 'src/segmented.css', 'src/doc.css']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'))
    .join('\n')

writeFileSync(join(OUT, 'doc.css'), css)
const STYLESHEET = `/doc/doc.css?v=${createHash('sha256').update(css).digest('hex').slice(0, 8)}`

// --- 4. dress ------------------------------------------------------------
const styledEn = styleTree(join(OUT, 'en'), 'en')
const styledZh = existsSync(join(OUT, 'zh')) ? styleTree(join(OUT, 'zh'), 'zh') : 0

console.log(`manual: ${styledEn} pages en, ${styledZh} pages zh, ${STYLESHEET}`)
