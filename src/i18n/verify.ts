// 两份文案 JSON 的构建期对账:键集全等、逐键占位符集合全等。类型只保得住
// 形状(zh 少键会报,多键和占位符不会),这两条要在这里看守。
type Tree = { [key: string]: string | Tree }

const holes = (text: string) =>
  new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))

export function verifyStrings(en: Tree, zh: Tree, at = ''): string[] {
  const bad: string[] = []
  const here = (key: string) => (at ? `${at}.${key}` : key)

  for (const key of Object.keys(en))
    if (!(key in zh)) bad.push(`zh 缺键 ${here(key)}`)
  for (const key of Object.keys(zh))
    if (!(key in en)) bad.push(`zh 多出 en 没有的键 ${here(key)}`)

  for (const key of Object.keys(en)) {
    const a = en[key]
    const b = zh[key]
    if (b === undefined) continue
    if (typeof a === 'string' !== (typeof b === 'string')) {
      bad.push(`${here(key)} 在两份文案里一边是词条一边是分组`)
      continue
    }
    if (typeof a === 'string' && typeof b === 'string') {
      const want = holes(a)
      const got = holes(b)
      if (
        want.size !== got.size ||
        [...want].some((name) => !got.has(name))
      )
        bad.push(
          `${here(key)} 的占位符对不上:en {${[...want].join(',')}} vs zh {${[...got].join(',')}}`,
        )
    } else if (typeof a !== 'string' && typeof b !== 'string') {
      bad.push(...verifyStrings(a, b, here(key)))
    }
  }

  return bad
}
