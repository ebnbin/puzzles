/** Every word the app says for itself, in Simplified Chinese. */
import type { Strings } from './en'

export const zh: Strings = {
  /** The collection's name. Not translated — it is what it is called. */
  brand: 'Puzzles',

  /** In English here too, deliberately; see the note beside it in en.ts. */
  tagline: 'Think between vibes.',

  launcher: {
    settings: '设置',
    hide: (game: string) => `隐藏${game}`,
    show: (game: string) => `显示${game}`,
    hidden: (count: number) => `已隐藏（${count}）`,
    nowHidden: (game: string) => `已隐藏 ${game}`,
    nowShown: (game: string) => `已显示 ${game}`,
    credit: 'Puzzles 由 Simon Tatham 及众多贡献者开发，基于 MIT 许可证发布。',
    source: '源码：',
  },

  settings: {
    title: '设置',
    appearance: '外观',
    themeSystem: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    language: '语言',
    manual: '手册',
    manualHint: '每个谜题的规则与操作',
  },

  play: {
    help: '玩法',
    picture: (name: string) => `${name} 的棋盘`,
    /** Leads out of the one-paragraph blurb and into the manual proper. */
    fullInstructions: '完整说明',
    close: '关闭',
    undo: '撤销',
    redo: '重做',
    menu: '菜单',
    switcher: '全部谜题',
    keypad: '谜题按键',
    error: '启动这个谜题时出错。',
  },

  keys: {
    clear: '清除',
    possible: '只填可能的铅笔标记',
    single: '填入答案唯一的格子',
    blank: '清空所有铅笔标记',
    hint: '提示',
    jumble: '重新打乱',
    ghost: '幽灵',
    vampire: '吸血鬼',
    zombie: '僵尸',
    left: (digit: string, count: number) => `${digit}，还有 ${count} 个没填`,
    highlight: (n: string) => `高亮含 ${n} 的骨牌`,
  },

  menu: {
    title: '谜题菜单',
    newGame: '新游戏',
    restart: '重新开始',
    solve: '求解',
    preferences: '偏好设置',
    gameId: 'Game ID',
    seed: '随机种子',
  },

  types: {
    title: '类型',
  },

  dialog: {
    cancel: '取消',
    ok: '确定',
  },

  notFound: {
    title: '未找到',
    body: (name: string) => `没有名为“${name}”的谜题。`,
    back: '返回列表',
  },
}
