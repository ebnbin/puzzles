// 停靠面板的记忆:够宽的屏幕上,类型 / 菜单面板最后一次由用户置成的状态。全局一份、
// 不分游戏,进任何游戏都按它复原。只记用户的主动操作:窗口收窄把面板挤掉不算,再拉宽
// 仍按这份复原;窄屏的 sheet 是临时的,不读不写这里。不进首页设置。
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
