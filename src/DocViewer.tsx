import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Icon from './Icon'
import { docHref, useLang, useStrings } from './i18n'
import './doc.css'

let page: string | null = null
let fragment: string | null = null
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}

// halibut 把跨页链接写成 <file>.html#<file>,自家名字的锚指着 h1、跟过去会滚过
// 页头,所以它等于「回到页顶」——和独立手册页头部脚本是同一条规则,联动改。
const parse = (target: string): { file: string; frag: string | null } => {
  const [file, frag = ''] = target.split('#')
  return { file, frag: frag && frag !== file.replace(/\.html$/, '') ? frag : null }
}

export function openManual(target = 'index.html') {
  const parsed = parse(target)
  page = parsed.file
  fragment = parsed.frag
  emit()
}

const closeManual = () => {
  page = null
  emit()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const cache = new Map<string, string>()

// 提取锚和 verify-doc 用的是同一对标记,那边逐页校验过它的存在。
const body = (html: string): string => {
  const open = html.indexOf('<main class="doc-main">')
  const close = html.lastIndexOf('</main>')
  if (open < 0 || close < 0) throw new Error('doc page without <main>')
  return html.slice(html.indexOf('>', open) + 1, close)
}

export default function DocViewer() {
  const open = useSyncExternalStore(subscribe, () => page)
  return open ? <Viewer file={open} /> : null
}

function Viewer({ file }: { file: string }) {
  const [lang] = useLang()
  const t = useStrings()
  const [html, setHtml] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // capture + stopPropagation:手册开着时按键不许漏给底下的谜题
    // (PuzzleHost 的 u/r/n 快捷键挂在 window 上,漏一个 u 就是一次盲撤销)。
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation()
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeManual()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  useEffect(() => {
    let live = true
    setHtml(null)
    setFailed(false)
    const key = `${lang}/${file}`
    const hit = cache.get(key)
    ;(hit !== undefined
      ? Promise.resolve(hit)
      : fetch(docHref(lang, file)).then((response) => {
          if (!response.ok) throw new Error(`${response.status}`)
          return response.text().then(body)
        })
    )
      .then((main) => {
        cache.set(key, main)
        if (live) setHtml(main)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [lang, file, tries])

  const scrollTo = (frag: string | null) => {
    const box = scroller.current
    if (!box) return
    const target = frag && box.querySelector(`a[name="${CSS.escape(frag)}"]`)
    if (target) target.scrollIntoView()
    else box.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (html === null) return
    const frag = fragment
    fragment = null
    scrollTo(frag)
  }, [html])

  const follow = (event: React.MouseEvent) => {
    const link = (event.target as HTMLElement).closest('a')
    const href = link?.getAttribute('href')
    if (!link || !href) return
    event.preventDefault()
    if (href.startsWith('#')) {
      scrollTo(parse(`${file}${href}`).frag)
      return
    }
    if (/^[\w-]+\.html(#|$)/.test(href)) {
      const next = parse(href)
      if (next.file === file) scrollTo(next.frag)
      else openManual(href)
      return
    }
    // 手册里的站外链接:同 tab 跳转会卸掉整个 app,一律新标签。
    window.open(link.href, '_blank', 'noopener')
  }

  return (
    <div className="doc-viewer" role="dialog" aria-modal="true" aria-label={t.settings.manual}>
      <header className="doc-viewer-top">
        <span className="doc-viewer-title">{t.settings.manual}</span>
        <button
          type="button"
          className="dialog-close"
          aria-label={t.play.close}
          onClick={closeManual}
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="doc-viewer-scroll" ref={scroller}>
        {failed ? (
          <p className="doc-viewer-note">
            {t.settings.manualFailed}
            <button type="button" onClick={() => setTries((n) => n + 1)}>
              {t.settings.manualRetry}
            </button>
          </p>
        ) : html !== null ? (
          <main className="doc-main" onClick={follow} dangerouslySetInnerHTML={{ __html: html }} />
        ) : null}
      </div>
    </div>
  )
}
