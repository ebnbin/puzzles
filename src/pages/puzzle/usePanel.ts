// 停靠面板的记忆(puzzles.panel):够宽的屏幕上类型 / 菜单面板最后一次由用户置成的状态,全局一份。
// 只记用户的主动操作,窗口收窄挤掉不算;窄屏的 sheet 不读不写这里。不进首页设置。
import { makeStore } from '../../store'

export type Panel = 'types' | 'menu' | null

const KEY = 'puzzles.panel'

export const [usePanel, setPanel] = makeStore<Panel>(
  () => {
    try {
      const raw = window.localStorage.getItem(KEY)
      return raw === 'types' || raw === 'menu' ? raw : null
    } catch {
      return null
    }
  },
  (panel) => {
    try {
      if (panel) window.localStorage.setItem(KEY, panel)
      else window.localStorage.removeItem(KEY)
    } catch {
    }
  },
)
