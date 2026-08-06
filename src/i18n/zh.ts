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
    language: '语言',
    themeLight: '浅色',
    themeDark: '深色',
    manual: '手册',
    manualHint: '每个谜题的规则与操作',
    erase: '清除全部数据',
    eraseHint: '存档、设置，以及隐藏的谜题',
    eraseWhat: '此操作无法撤销',
    eraseConfirm: '确认清除',
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
    arrows: {
      group: '方向键',
      up: '上',
      down: '下',
      left: '左',
      right: '右',
      upLeft: '左上',
      upRight: '右上',
      downLeft: '左下',
      downRight: '右下',
    },
    cursor: {
      rotateLeft: '向左旋转',
      lock: '锁定或解锁',
      pencil: '切换墨水和铅笔',
      black: '黑；再按依次变白、变灰',
      white: '白；再按依次变黑、变灰',
    },
  },

  keys: {
    clear: '清除',
    possible: '只留下仍然可能的铅笔标记',
    single: '填入答案唯一的格子',
    blank: '清空所有铅笔标记',
    /* 上游 M 的说法照搬手册自己的译法:doc-zh/keen.html 写的是「按 M 键将在每个
       尚未填入主数字的方格中填入一整套铅笔标记」。 */
    marks: '填入一整套铅笔标记',
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
    arrows: '显示方向键',
    gameId: 'Game ID',
    seed: '随机种子',
  },

  types: {
    title: '类型',
    standard: '默认',
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
