// 隐藏的谜题名单:JSON 数组存名字,垃圾行一律丢。
import { makeStore } from './store'

const KEY = 'puzzles.hidden'

const [useHidden, setHidden] = makeStore<Set<string>>(
  () => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
      return new Set(
        Array.isArray(stored) ? stored.filter((n) => typeof n === 'string') : [],
      )
    } catch {
      return new Set()
    }
  },
  (next) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...next]))
    } catch {
    }
  },
)

export { useHidden }

export const toggleHidden = (name: string) =>
  setHidden((was) => {
    const next = new Set(was)
    if (!next.delete(name)) next.add(name)
    return next
  })
