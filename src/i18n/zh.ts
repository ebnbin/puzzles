/** Every word the app says for itself, in Simplified Chinese. */
import type { Strings } from './en'

export const zh: Strings = {
  /** The collection's name. Not translated — it is what it is called. */
  brand: 'Puzzles',

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
    themeLight: '浅色',
    themeDark: '深色',
    language: '语言',
    manual: '手册',
    manualHint: '每个谜题的规则与操作',
    done: '完成',
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
    toDark: '切换到深色',
    toLight: '切换到浅色',
    keypad: '谜题按键',
    error: '启动这个谜题时出错。',
  },

  keys: {
    clear: '清除',
    marks: '填满所有铅笔标记',
    hint: '提示',
    jumble: '重新打乱',
    ghost: '幽灵',
    vampire: '吸血鬼',
    zombie: '僵尸',
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

  tuning: {
    title: '配色参数',
    open: '调配色参数',
    subtitle:
      '六个数字把每一个亮色换算成它的暗色。拖动看看各自管什么。标出来的那一段是值得停留的范围，出了这段就会有具体的东西坏掉。',
    lightOnly: '这些只作用在暗色棋盘上。切到暗色才看得到效果。',
    reset: '恢复',
    resetAll: '全部恢复',
    band: '建议范围',
    dflt: '默认',
    knobs: {
      FLOOR: {
        name: '最暗点',
        what: '暗棋盘能有多黑。上游最亮的东西都落在这里。',
        low: '棋盘变黑；到 0 时被按住的黑正好是纯 #000000，再没有更深的地方可去。',
        high: '棋盘发灰 —— 到 0.20 已经是中灰，墨的对比度掉掉三分之一。',
      },
      CEILING: {
        name: '最亮点',
        what: '墨能有多亮。上游最暗的东西都落在这里。',
        low: '墨从白变灰。还读得出，只是没那么锐。',
        high: '刺眼。0.94 往上有六十个色位越过「看着难受」这条线，1.00 是纯白。',
      },
      VEIL: {
        name: '彩色压暗',
        what: '有色相的东西被往下压多少。只碰那 200 个有色相的色位 —— 棋盘和墨一个字节都不动。',
        low: '颜色变亮、开始发光：到 0 时青色和黄色是全屏最响的东西。',
        high: '整体发闷。过了 0.55 色相就站不住棋盘了。',
      },
      LIFT_CEILING: {
        name: '深色提亮上限',
        what: '本来为白纸挑的深色墨水能被提多亮。提亮会掉色，所以这是喊停的地方。',
        low: '深蓝、深红沉回棋盘里 —— 那正是提亮存在的理由。',
        high: '洗白。到 0.82 时藏青读起来是薰衣草。',
      },
      ACHROMATIC: {
        name: '灰／彩分界',
        what: '饱和度低于这个数算「结构」，整个翻转；高于它算「意义」，保留原样。',
        low: '到 0 时连纯灰也算有色，整块棋盘不再翻转，暗色模式直接没了。',
        high: '偏灰的颜色开始被当成灰翻转掉。',
      },
      PAPER_BOARD: {
        name: '让位棋盘高度',
        what: '那三个「把保留的黑画在棋盘上」的游戏，棋盘让到哪。只有 Light Up、Singles、Range。',
        low: '写在棋盘上的黑字读不出来了。',
        high: '反过来，画在纸上的亮东西沉进纸里。',
      },
    },
  },

  notFound: {
    title: '未找到',
    body: (name: string) => `没有名为“${name}”的谜题。`,
    back: '返回列表',
  },
}
