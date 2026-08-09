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
      shove: {
        up: '向上推',
        down: '向下推',
        left: '向左推',
        right: '向右推',
      },
    },
    cursor: {
      rotateLeft: '向左旋转',
      lock: '锁定或解锁',
      pencil: '切换墨水和铅笔',
      black: '黑',
      white: '白',
      grey: '灰',
      carryTile: '方向键带着这个方块一起走',
      holdPlace: '方向键让方块从这一格穿过',
      /* 手册自己的译法:doc-zh/twiddle.html 写的就是「逆时针或顺时针旋转」。 */
      turnLeft: '逆时针旋转',
      turnRight: '顺时针旋转',
      /* 手册的说法（doc-zh/sixteen.html，netslide 那章指过去）：「用回车键让该行/列沿所
         指示的方向移动」。方向由棋盘上高亮的那个箭头指示，所以这里只说动哪一条。 */
      slide: '推动这一行或这一列',
      pushLine: '顺着箭头把这一行推一格',
      pullLine: '把这一行往回拉一格',
      /* 手册自己的译法（doc-zh/mines.html）：「在覆盖着的方格上按回车键会揭开它，在已揭开
         的方格上按回车键则会清除其周围」。 */
      /* 手册自己的译法（doc-zh/samegame.html）：「选中」「移除」，「区域」也是它自己的词
         ——「由不止一个同色方格构成的相邻区域」。 */
      /* 手册自己的译法（doc-zh/flip.html）：「翻转该方格及其关联的方格」。 */
      /* 手册自己的译法（doc-zh/guess.html）：「把所选颜色的棋子放置到选定的位置上」
         「添加保留标记」；「保留」是它自己的词。 */
      /* 手册自己的译法（doc-zh/pegs.html）：「当指示器位于某枚棋子上时按回车键，再按一个
         方向键，就会让该棋子朝那个方向跳跃」——「跳跃」是它自己的词。 */
      jump: '方向键让这枚棋子跳过去',
      unjump: '取消这次跳跃',
      /* 手册自己的译法（doc-zh/dominosa.html）：「放置一张覆盖它们的骨牌」「在它们之间画一
         条线，你可以用它来提醒自己：你已经知道这两个数字不会被同一张骨牌覆盖」。 */
      /* 手册自己的译法（doc-zh/untangle.html）：「按 Enter 键会切换是否拖动当前高亮的点。
         按 Tab 键或空格键会在所有点之间循环切换。」 */
      drag: '拿起或放下这个点',
      cycle: '循环到下一个点',
      /* 手册自己的译法（doc-zh/blackbox.html）：「按 Enter 键会发射一束激光或添加一个新的球
         位置猜测，按空格键则会锁定一个格子、一行或一列」「会出现一个黑色圆点来标记该猜测；
         再次单击可移除所猜的球」「点击它就会检查你的猜测」。 */
      fire: '从这里发射一束激光',
      ball: '在这里猜一个球',
      unball: '移除所猜的球',
      check: '检查你的猜测',
      lockCell: '锁定这个格子、这一行或这一列',
      unlockCell: '解除这个格子、这一行或这一列的锁定',
      /* 九个「往格子里放东西」的游戏，各取自己那一章的译法（doc-zh/）：slant 的两个符号是
         手册自己写的字符；tents 的「绿色」是那一章的说法，不是「没有帐篷」的委婉语；
         singles 的圆圈和 range 的点是两个游戏里两种不同的标记，不合并。 */
      backslash: '在这里放一个 \\',
      slash: '在这里放一个 /',
      noLine: '让这一格空着',
      light: '在这里放一盏灯',
      unlight: '拿走这盏灯',
      cannot: '标记这一格不能放灯',
      uncannot: '取消这个标记',
      tent: '在这里搭一个帐篷',
      grass: '把这一格涂绿：这里没有帐篷',
      clearSquare: '清空这一格',
      blackSquare: '把这一格涂黑',
      restore: '恢复显示数字',
      circle: '画个圈：这一格肯定不是黑的',
      uncircle: '去掉这个圈',
      whiteSquare: '把这一格涂白',
      emptySquare: '把这一格清空',
      fillSquare: '把这一格涂黑',
      dotSquare: '打个点：这一格肯定不是黑的',
      /* magnets 的两个标记按上游画出来的样子命名（空白骨牌、两个问号），含义写在句子里。 */
      plus: '在这里放一个 +',
      minus: '在这里放一个 −',
      blankDomino: '把这张骨牌标成空白',
      notBlankDomino: '把这张骨牌标成「不是空白」',
      track: '在这里铺一段轨道',
      noTrack: '打叉：这里不可能有轨道',
      /* filling 这两个管的是选区，真正填数字的是键盘那一排。 */
      multiselect: '用方向键选中一片格子',
      stopSelect: '结束选择',
      selectSquare: '把这一格加进选区',
      deselectSquare: '把这一格移出选区',
      floodFill: '用这个颜色淹没左上角',
      advance: '重放求解器的下一步',
      /* palisade 的两个按开关命名，理由和 untangle 一样：后端不报，没有词可跟。 */
      edge: '画上或擦掉这道墙',
      noEdge: '标记或取消「这里没有墙」',
      /* 最后五个「开一个动作再收尾」的游戏，各取自己那一章的译法：bridges 的「完成」是那一章
         对「这座岛我摆好了」的说法，map 的「点画」是它自己的动词，galaxies 的「箭头」是它
         丢进格子里、用来记住这格属于哪个点的记号。 */
      startBridge: '从这座岛开始架桥',
      endBridge: '把桥搭到这里',
      islandDone: '把这座岛标记为已完成',
      linkFrom: '把这一格连到下一格',
      linkTo: '把这一格连到上一格',
      cancelLink: '放弃这次连接',
      startLoop: '从这里开始画环',
      endLoop: '在这里停笔',
      cancelLoop: '放弃正在画的这一段',
      newArrow: '从这个点上拿起一个箭头',
      moveArrow: '拿起这个箭头',
      dropArrow: '把箭头放在这里',
      removeArrow: '扔掉这个箭头',
      cancelArrow: '把箭头放回去',
      drawEdge: '在这里画一条边',
      clearEdge: '擦掉这条边',
      pickColour: '拿起光标下的颜色',
      fillRegion: '用它填充这个区域',
      stippleRegion: '给这个区域点画：它可能是这个颜色',
      clearRegion: '清空这个区域',
      cancelFill: '放下手里的颜色',
      domino: '放一张骨牌盖住这两格',
      undomino: '拿掉这张骨牌',
      line: '画一条线：这两格不属于同一张骨牌',
      unline: '擦掉这条线',
      place: '放置所选颜色的棋子',
      submit: '提交这次猜测',
      hold: '保留这枚棋子到下一次猜测',
      flip: '翻转这一格及其关联的方格',
      select: '选中这个区域',
      remove: '移除选中的区域',
      unselect: '取消选择',
      uncover: '揭开这一格',
      chord: '清除这一格周围',
      flag: '插旗，标记为地雷',
      unflag: '取下旗子',
      mark: '画一个矩形',
      erase: '清除矩形内部，保留边线',
      done: '在这里结束',
      cancel: '取消',
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
    /* guess 的两个。「提交」是上游自己的词（guess.c:547）；「保留」写成一句指令
       而不是一个状态，因为它就是指令——先按它再按数字，说的是接下来这一枚怎么处理。 */
    done: '提交这次猜测',
    lock: '把这一格保留到下次猜测',
    highlight: (n: string) => `高亮含 ${n} 的骨牌`,
    /* 手册（doc-zh/guess.html）把它们叫「颜色」，编号是 guess.c 自己的 COL_1..COL_10。 */
    peg: (n: number) => `颜色 ${n}`,
    /* map 的调色板。编号从 1 起：数按钮的人从 1 数起，而这个号码不会出现在读者
       看得到的任何地方。「可能是」是上游对点画的说法（手册里右键拖拽那一段）。 */
    fillRegion: (n: number) => `把这个区域填成颜色 ${n}`,
    maybeRegion: (n: number) => `标记这个区域可能是颜色 ${n}`,
    clearRegion: '清空这个区域',
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
