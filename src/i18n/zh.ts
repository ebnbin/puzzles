/** Every word the app says for itself, in Simplified Chinese. */
import type { Strings } from './en'

export const zh: Strings = {
  /** The collection's name. Not translated — it is what it is called. */
  brand: 'Puzzles',

  launcher: {
    settings: '设置',
    credit: 'Puzzles 由 Simon Tatham 及众多贡献者开发，基于 MIT 许可证发布。',
    source: '源码：',
  },

  settings: {
    title: '设置',
    design: '新版界面',
    designOn: '为手机和桌面重新设计',
    designOff: '原版布局',
    appearance: '外观',
    themeSystem: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    language: '语言',
    manual: '手册',
    manualHint: '每个谜题的规则与操作',
    done: '完成',
  },

  play: {
    back: '全部谜题',
    help: '玩法',
    /** Leads out of the one-paragraph blurb and into the manual proper. */
    fullInstructions: '完整说明',
    close: '关闭',
    undo: '撤销',
    redo: '重做',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    menu: '菜单',
    switcher: '切换谜题',
    toDark: '切换到深色',
    toLight: '切换到浅色',
    keypad: '谜题按键',
    error: '启动这个谜题时出错。',
  },

  menu: {
    title: '谜题菜单',
    newGame: '新游戏',
    restart: '重新开始',
    solve: '求解',
    preferences: '偏好设置',
    share: (what: string) => `分享${what}`,
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
