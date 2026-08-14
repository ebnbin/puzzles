import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, 'vendor/sgtpuzzles')
const OUT = join(ROOT, 'public/doc')
const ZH_SRC = join(ROOT, 'doc-zh')

const ORIGIN = 'https://puzzles.ebnbin.dev'

const CHROME = {
  en: {
    htmlLang: 'en',
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

const BRAND = 'Puzzles'

const LANGS =  (['en', 'zh'])
const LABEL = { en: 'EN', zh: '中文' }

const icon = (size, body) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
  'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
  `stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

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

// 这个字符串随每个手册页原样发布,里面的 // 注释是产物内容,不归本仓库的注释
// 规矩管。其中删自身 hash 的那段不冗余:halibut 把每页链成 <file>.html#<file>,
// 自带同名 fragment 会让页面开在半中腰;只删「等于本页名」的,#net-controls
// 这类真跳转必须原样保留。主题/语言解析和 index.html 内联脚本是同一段,联动改。
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
  // Only \`dark\` is dark. Absent, \`system\` from the version that offered it,
  // or anything else is light — the machine is not asked, here or in the app.
  // useTheme's \`read\`, in the form a page with no React can use.
  function stored() {
    try {
      return localStorage.getItem('puzzles.theme') === 'dark'
    } catch (e) {}
    return false
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
  // One press, turning the page over. There are two states now and this writes
  // whichever one is not showing, which is the same press the app has in its
  // two bars — the manual's is no longer the odd one out.
  //
  // Reads the painted attribute rather than the stored value. With only two
  // states those cannot disagree, but the attribute is what the reader can see,
  // and a button that reverses what is in front of them is the one to write.
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

function topBar(lang, file) {
  const c = CHROME[lang]
  const choices = LANGS.map((code) => {
    const current = code === lang ? ' aria-current="true"' : ''
    return (
      `<a href="/doc/${code}/${file}" data-lang="${code}" ` +
      `hreflang="${CHROME[code].htmlLang}"${current}>${LABEL[code]}</a>`
    )
  }).join('')
  return `<header class="doc-top">
<span class="doc-top-title">${BRAND}</span>
<span class="segmented doc-lang">${choices}</span>
<button type="button" class="doc-theme" aria-label="${c.theme}">${SUN_ICON}${MOON_ICON}</button>
</header>`
}

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

const css =
  '/* Generated by scripts/build-doc.mjs from src/tokens.css,\n' +
  '   src/segmented.css and src/doc.css. Edit those, not this. */\n' +
  ['src/tokens.css', 'src/segmented.css', 'src/doc.css']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'))
    .join('\n')

writeFileSync(join(OUT, 'doc.css'), css)
// doc.css 是同一地址原地重写,必须带内容摘要 query:service worker 按整条 URL
// 存,没有它老样式表会被永远端出;vercel 对它写 immutable 也只因这个 query 才合法。
const STYLESHEET = `/doc/doc.css?v=${createHash('sha256').update(css).digest('hex').slice(0, 8)}`

const styledEn = styleTree(join(OUT, 'en'), 'en')
const styledZh = existsSync(join(OUT, 'zh')) ? styleTree(join(OUT, 'zh'), 'zh') : 0

writeFileSync(
  join(ROOT, 'public/sitemap.txt'),
  [
    `${ORIGIN}/`,
    ...LANGS.flatMap((lang) =>
      readdirSync(join(OUT, lang))
        .filter((f) => f.endsWith('.html'))
        .sort()
        .map((f) => `${ORIGIN}/doc/${lang}/${f}`),
    ),
  ].join('\n') + '\n',
)

console.log(`manual: ${styledEn} pages en, ${styledZh} pages zh, ${STYLESHEET}`)
