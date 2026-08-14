import { useEffect, useState } from 'react'
import { useLang } from './i18n'
import type { Lang } from './i18n'

const FILE: Record<Lang, string> = {
  en: '/help/en.json',
  zh: '/help/zh.json',
}

const pending: Partial<Record<Lang, Promise<Record<string, string>>>> = {}

export function useHelp(name: string) {
  const [lang] = useLang()
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setHtml(null)
    pending[lang] ??= fetch(FILE[lang]).then((response) => {
      if (!response.ok) throw new Error(`${FILE[lang]}: ${response.status}`)
      return response.json()
    })
    pending[lang]
      .then((all) => {
        if (live) setHtml(all[name] ?? null)
      })
      .catch(() => {
        pending[lang] = undefined
      })
    return () => {
      live = false
    }
  }, [name, lang])

  return html
}
