// docs/params.md 的手写源:逐游戏逐 string 参数的语义、上游规则(带行号)、本仓库的表与理由。
// build-params-doc.mjs 把它和 oracle 的控件表、模型算出的默认表、check-params 的结果拼成文档。
// 字段:u 上游规则(带行号),f 最终范围,d 依赖(谁看谁),c 上限来源
// (up=上游自身 / cap=CAP 100 / grid=棋盘≤100×100 推出 / sem=语义补的),w 控件。

export const GAMES = [
  {
    id: 'net', title: 'Net', file: 'net.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽(格)',
        u: ['宽高都 > 0(322)', '宽高不能同时 ≤ 1(324)', 'full 且 unique 且 wrap 时,宽或高都不能是 2(376)'],
        f: '1..100;勾了「Walls wrap around」和「Ensure unique solution」时去掉 2', d: '看两个开关', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高(格)',
        u: ['同上'],
        f: '1..100;宽是 1 时从 2 起;wrap+unique 时去掉 2', d: '看宽和两个开关', c: 'cap' },
      { label: 'Barrier probability', kind: 'float', sem: '每条边成为墙的概率',
        u: ['≥ 0(328)', '≤ 1(330)', 'atof 解析(314),%g 回显'],
        f: '0.00..1.00,步长 0.01', d: '—', c: 'up' },
    ],
  },
  {
    id: 'cube', title: 'Cube', file: 'cube.c',
    params: [
      { label: 'Width / top', kind: 'int', sem: '方格:宽;三角格:六边形的顶边长(d1)',
        u: ['d1, d2 ≥ 0(549)', '立方体(方格):两边都 ≥ 2(553)', '其它三种(三角格):两边不能都是 0(558)',
            '按 enum_grid_squares 逐格分类计数,每一类格数 ≥ 面数/类数(583-595):四面体 4 类、八面体 2 类、其余 1 类',
            '总面积 ≥ 面数 + 1(597):方格 d1·d2,三角格 d1²+d2²+4·d1·d2;面数 4 / 6 / 8 / 20'],
        f: '0..100 里「高取到 100 时放得下」的那些;立方体实际是 2..100', d: '看「Type of solid」', c: 'cap' },
      { label: 'Height / bottom', kind: 'int', sem: '方格:高;三角格:另三条边长(d2)',
        u: ['同上'],
        f: '0..100 里与当前宽一起放得下的那些。例:立方体宽 2 时高 ≥ 4,宽 3 时高 ≥ 3;四面体 (0,3)、(1,2) 可以,(1,1) 不行', d: '看立体类型和宽', c: 'cap' },
    ],
    notes: ['分类计数在 cube.ts 里按上游逐行移植(roomFor),不是闭式公式;oracle 逐值验证过四种立体 0..100 全部组合。'],
  },
  {
    id: 'fifteen', title: 'Fifteen', file: 'fifteen.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(149)'], f: '2..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'sixteen', title: 'Sixteen', file: 'sixteen.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(179)'], f: '2..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..100', d: '—', c: 'cap' },
      { label: 'Number of shuffling moves', kind: 'int', sem: '打乱用的随机步数;0 = 完全随机排列',
        u: ['≥ 0(183)', '无上限'], f: '0..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'twiddle', title: 'Twiddle', file: 'twiddle.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽 ≥ 旋转块边长 n(216)', 'n ≥ 2(214)'], f: '2..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['高 ≥ n(218)'], f: '2..100', d: '主', c: 'cap' },
      { label: 'Rotating block size', kind: 'int', sem: '一次旋转的方块边长',
        u: ['≥ 2(214)', '≤ 宽且 ≤ 高(216-218)'], f: '2..min(宽, 高)', d: '看宽高;宽高缩小时被夹', c: 'up' },
      { label: 'Number of shuffling moves', kind: 'int', sem: '打乱步数;0 = 完全随机', u: ['≥ 0(222)', '无上限'], f: '0..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'rect', title: 'Rectangles', file: 'rect.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 > 0(223)', '面积 ≥ 2(227)'], f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '1..100;宽是 1 时从 2 起', d: '看宽', c: 'cap' },
      { label: 'Expansion factor', kind: 'float', sem: '先按 1/(1+e) 缩小生成,再撑回原尺寸;0 = 不缩',
        u: ['≥ 0(229)', '无上限', 'atof 解析,%g 回显', '缩小后的边不足 2 时钉 2(1165-1168),所以再大也不会崩'],
        f: '0.00..5.00,步长 0.05', d: '—', c: 'sem' },
    ],
    notes: ['手册说 0.5 已经明显更难、再高谜题退化成寥寥几个矩形;5 之后每一边最多缩到原来的 1/6,与再大的值没有区别。要放宽改 rect.ts 里的一个数。'],
  },
  {
    id: 'netslide', title: 'Netslide', file: 'netslide.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(313)'], f: '2..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..100', d: '—', c: 'cap' },
      { label: 'Barrier probability', kind: 'float', sem: '每条边成为墙的概率(默认 1)', u: ['0..1(317-320)'], f: '0.00..1.00,步长 0.01', d: '—', c: 'up' },
      { label: 'Number of shuffling moves', kind: 'int', sem: '打乱步数;0 = 完全随机', u: ['≥ 0(321)', '无上限'], f: '0..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'pattern', title: 'Pattern', file: 'pattern.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 > 0(184)', '面积 ≥ 2(189)'], f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '1..100;宽是 1 时从 2 起', d: '看宽', c: 'cap' },
    ],
  },
  {
    id: 'solo', title: 'Solo', file: 'solo.c',
    params: [
      { label: 'Columns of sub-blocks', kind: 'int', sem: '子块的列数 c;阶数 = c·r',
        u: ['c ≥ 2(516)', 'c, r ≤ 255(518,ORDER_MAX)', 'c·r ≤ 31(520)', 'Killer 时 c·r ≤ 9(522)', 'X 时 c·r ≥ 4(524)',
            '勾了 Jigsaw:custom_params 先令 c := c·r、r := 1(502),所以「c ≥ 2」落在乘积上'],
        f: '勾了 Jigsaw:1..31(Killer 1..9);没勾:2..15(Killer 2..4),给行数 ≥ 2 留位', d: '看 Killer、Jigsaw', c: 'up' },
      { label: 'Rows of sub-blocks', kind: 'int', sem: '子块的行数 r;r = 1 即 Jigsaw 布局(4104)',
        u: ['上游没有查 r 的下限(0、负数都放行,生成时才出事)', '其余同上'],
        f: '勾了 Jigsaw:⌈2/c⌉..⌊31/c⌋(Killer ⌊9/c⌋);没勾:2..⌊31/c⌋;X 时从 ⌈4/c⌉ 起;二阶(c·r = 2 或 2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像或 Killer 时去掉', d: '看列数、X、Killer、Jigsaw、Symmetry;列数变大时被夹', c: 'up' },
    ],
    notes: [
      '勾 Jigsaw 提交后,C 侧把两数相乘、行数归 1,再次打开面板看到的是 (c·r, 1)——和上游桌面版一样。Jigsaw 模式下再拉行数会让阶数成倍增长,这里不拦(上游放行)。',
      '没勾 Jigsaw 时行数从 2 起,是因为上游把 r = 1 定义成 Jigsaw(solo.c:471):行数滑到 1 棋盘会悄悄变成 jigsaw、勾选框自己亮起;而勾掉 Jigsaw 提交回去的仍是 r = 1,勾不掉。列数相应封到 order/2。见「与上游的出入」。',
      '二阶配 4 向旋转、4 向镜像、8 向镜像(2j 与 2×2 都是),以及二阶 Killer(2jk),上游生成不终止:原生 oracle 五个种子全部超时。表里去掉,见「与上游的出入」。',
    ],
  },
  {
    id: 'mines', title: 'Mines', file: 'mines.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽',
        u: ['full 且「Ensure solubility」时宽高都 > 2(290)', '否则宽高 ≥ 1(292)', '≤ SHRT_MAX(294)', '面积 ≤ 2²⁸−1(300)'],
        f: '1..100;勾了「Ensure solubility」时 3..100', d: '看开关', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上', '雷数 ≥ 1 且 ≤ 面积−9 ⇒ 面积 ≥ 10'],
        f: '同宽,再要求宽×高 ≥ 10(宽 1 时高 ≥ 10,宽 3 时高 ≥ 4)', d: '看宽和开关', c: 'cap' },
      { label: 'Mines', kind: 'int', sem: '雷数;文本框时代还接受「20%」写法(266)',
        u: ['≥ 1(305-308)', '≤ 宽×高 − 9(309)'], f: '1..宽×高−9', d: '看宽高;缩小棋盘时被夹', c: 'up' },
    ],
    notes: ['百分比写法随文本框一起下线:滑块只出绝对数,旁边附「占比」读数;同样的雷数都能达到。'],
  },
  {
    id: 'samegame', title: 'Same Game', file: 'samegame.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 1(291)'], f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高',
        u: ['「Ensure solubility」时面积 ≥ 2(302)', '否则每种颜色至少两格:面积 ≥ 2×颜色数,颜色 ≥ 2 ⇒ 面积 ≥ 4(305-310)'],
        f: '1..100;宽 1 时从 2 起(不保证可解时从 4 起,宽 2 时从 2 起)', d: '看宽和开关', c: 'cap' },
      { label: 'No. of colours', kind: 'int', sem: '颜色数',
        u: ['≤ 9(296)', '保证可解时 ≥ 3(300)', '不保证时 ≥ 2 且 2×颜色数 ≤ 面积(305-310)'],
        f: '保证可解:3..9;否则 2..min(9, ⌊面积/2⌋)', d: '看宽高和开关', c: 'up' },
    ],
  },
  {
    id: 'flip', title: 'Flip', file: 'flip.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 > 0(191)'], f: '1..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '1..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'guess', title: 'Guess', file: 'guess.c',
    params: [
      { label: 'Colours', kind: 'int', sem: '可选颜色数', u: ['≥ 2(219)', '≤ 10(223)'], f: '2..10', d: '主', c: 'up' },
      { label: 'Pegs per guess', kind: 'int', sem: '每次猜的钉数',
        u: ['≥ 2(219)', '不允许重复时 ≤ 颜色数(227)', '允许重复时无上限'],
        f: '允许重复:2..100;否则 2..颜色数', d: '看颜色数和「Allow duplicates」;颜色数减少时被夹', c: 'cap' },
      { label: 'Guesses', kind: 'int', sem: '允许猜的次数', u: ['≥ 1(225)', '无上限'], f: '1..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'pegs', title: 'Pegs', file: 'pegs.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽',
        u: ['full 时宽高都 > 3(192)', 'Cross 只允许 5×7、5×9、7×5、7×7、7×9、9×5、9×7、9×9(206-217)', 'Octagon 只允许 7×7(225-228)', 'Random 无额外限制'],
        f: 'Cross:{5, 7, 9};Octagon:{7};Random:4..100', d: '看「Board type」', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'],
        f: 'Cross:{5, 7, 9},宽 5 时 {7, 9};Octagon:{7};Random:4..100', d: '看类型和宽', c: 'cap' },
    ],
    notes: ['Cross 和 Octagon 的表只有几个值,滑块的每一档都是合法尺寸;Octagon 两格都钉死,控件禁用。'],
  },
  {
    id: 'dominosa', title: 'Dominosa', file: 'dominosa.c',
    params: [
      { label: 'Maximum number on dominoes', kind: 'int', sem: '骨牌上的最大点数 n;棋盘 (n+2)×(n+1) 格',
        u: ['≥ 1(249)', '无上限(仅防溢出,251)'], f: '1..98', d: '—', c: 'grid' },
    ],
    notes: ['98 = 棋盘宽 n+2 不超过 100。'],
  },
  {
    id: 'untangle', title: 'Untangle', file: 'untangle.c',
    params: [
      { label: 'Number of points', kind: 'int', sem: '点数', u: ['≥ 4(224)', '无上限(仅防溢出,230)'], f: '4..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'blackbox', title: 'Black Box', file: 'blackbox.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(193)', '≤ 255(197)'], f: '2..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..100', d: '主', c: 'cap' },
      { label: 'No. of balls', kind: 'span', sem: '球数;写「3」是固定数,写「3-6」是区间,每局在区间里随机取(220-225),玩家只知道区间',
        u: ['sscanf "%d-%d",不成对就当单个数(184-186)', '最少 ≥ 1(199-202)', '最少 ≤ 最多(203)', '最少 < 宽×高(205)', '最多上游没查:超过格数时放球会死循环(236)'],
        f: '最少 1..宽×高−1;最多 最少..宽×高−1', d: '看宽高;缩小棋盘时被夹', c: 'sem' },
    ],
    notes: ['控件做成一对滑块(最少 / 最多),两者相等就写回单个数,和上游回显一致。「最多」的上限是本仓库按语义补的。'],
  },
  {
    id: 'slant', title: 'Slant', file: 'slant.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(239)'], f: '2..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'lightup', title: 'Light Up', file: 'lightup.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽',
        u: ['宽高都 ≥ 2(357)', 'full:4-way rotational 只能方形(364-366)', '4-way mirror / rotational 时宽或高 ≥ 3(368)'],
        f: '2..100;「4-way rotational」时 3..100', d: '看「Symmetry」', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'],
        f: '2..100;「4-way rotational」时钉在宽;「4-way mirror」且宽 2 时从 3 起', d: '看对称和宽;宽动时跟着动', c: 'cap' },
      { label: '%age of black squares', kind: 'int', sem: '黑格占比', u: ['full:5..100(362)'], f: '5..100', d: '—', c: 'up' },
    ],
    notes: ['对称下标(lightup.c:96):0 None、1 2-way mirror、2 2-way rotational、3 4-way mirror、4 4-way rotational。'],
  },
  {
    id: 'map', title: 'Map', file: 'map.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(261)'], f: '2..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['区域数 ≥ 5 且 ≤ 面积 ⇒ 面积 ≥ 5'], f: '2..100;宽 2 时从 3 起', d: '看宽', c: 'cap' },
      { label: 'Regions', kind: 'int', sem: '区域数', u: ['≥ 5(265)', '≤ 宽×高(267)'], f: '5..宽×高', d: '看宽高;缩小棋盘时被夹', c: 'up' },
    ],
  },
  {
    id: 'loopy', title: 'Loopy', file: 'loopy.c',
    params: [
      { label: 'Width', kind: 'int', sem: '网格宽(单位随网格类型)',
        u: ['每种网格有两个下限(281-300 的 GRIDLIST):两边都 ≥ amin(704),至少一边 ≥ omin(707)',
            'grid.c 里各网格的 grid_validate_params_* 只防溢出,100 以内不起作用'],
        f: 'amin..100;Penrose (kite/dart) 从 4 起,Penrose (rhombs) 从 5 起', d: '看「Grid type」', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '网格高', u: ['同上'], f: 'amin..100;宽 < omin 时从 omin 起;两种 Penrose 同宽的下限', d: '看网格类型和宽', c: 'cap' },
    ],
    notes: [
      'amin/omin 表:Squares 3/3、Triangular 3/3、Honeycomb 3/3、Snub-Square 3/3、Cairo 3/4、Great-Hexagonal 3/3、Octagonal 3/3、Kites 3/3、Floret 1/2、Dodecagonal 2/2、Great-Dodecagonal 2/2、Penrose (kite/dart) 3/3、Penrose (rhombs) 3/3、Great-Great-Dodecagonal 2/2、Kagome 3/3、Compass-Dodecagonal 2/2、Hats 6/6、Spectres 6/6。',
      '两种 Penrose 在上游放行的最小尺寸附近生成不正常:原生 oracle 五个种子各跑 10 秒,kite/dart 宽 3 全部超时、宽 4..7 配高 3 超时;rhombs 宽 3、4 全部超时,宽 5 配高 3、4 超时,宽 6..9 配高 3 超时(4×9 用 120 秒能出来,是极慢不是死循环);浏览器里探测另撞到过除零和 dsf 断言,引擎当场死掉。所以两边各抬到 4 / 5,见第四节。',
    ],
  },
  {
    id: 'inertia', title: 'Inertia', file: 'inertia.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(208)', '面积 ≥ 6(219)'], f: '2..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..100;宽 2 时从 3 起', d: '看宽', c: 'cap' },
    ],
  },
  {
    id: 'tents', title: 'Tents', file: 'tents.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 4(414)'], f: '4..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '4..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'bridges', title: 'Bridges', file: 'bridges.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 3(813)'], f: '3..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '3..100', d: '—', c: 'cap' },
    ],
    notes: ['难度、桥数上限、岛屿占比、扩展因子在上游本来就是下拉,不在本次范围内。'],
  },
  {
    id: 'unequal', title: 'Unequal', file: 'unequal.c',
    params: [
      { label: 'Size (s*s)', kind: 'int', sem: '拉丁方阶数',
        u: ['3..32(269)', 'Adjacent 模式且难度 ≥ Tricky(下标 2)时 ≥ 5(273)'],
        f: '3..32;Adjacent 且难度 ≥ Tricky 时 5..32', d: '看「Mode」「Difficulty」', c: 'up' },
    ],
  },
  {
    id: 'galaxies', title: 'Galaxies', file: 'galaxies.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 3(330)'], f: '3..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '3..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'filling', title: 'Filling', file: 'filling.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['≥ 1(188)'], f: '1..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['≥ 1(189)'], f: '1..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'keen', title: 'Keen', file: 'keen.c',
    params: [
      { label: 'Grid size', kind: 'int', sem: '拉丁方阶数', u: ['3..9(227)'], f: '3..9', d: '—', c: 'up' },
    ],
  },
  {
    id: 'towers', title: 'Towers', file: 'towers.c',
    params: [
      { label: 'Grid size', kind: 'int', sem: '拉丁方阶数', u: ['3..9(250)'], f: '3..9', d: '—', c: 'up' },
    ],
  },
  {
    id: 'singles', title: 'Singles', file: 'singles.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 2(265)', '≤ 62(267:10+26+26 个可用符号)'], f: '2..62', d: '—', c: 'up' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '2..62', d: '—', c: 'up' },
    ],
  },
  {
    id: 'magnets', title: 'Magnets', file: 'magnets.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽',
        u: ['宽高都 ≥ 2(238-239)', 'Tricky(下标 1)时宽或高 ≥ 5(242-244)', 'Easy 时宽或高 ≥ 3(246-247)'],
        f: '2..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'],
        f: '2..100;宽不够时从 3(Tricky:5)起', d: '看宽和「Difficulty」', c: 'cap' },
    ],
  },
  {
    id: 'signpost', title: 'Signpost', file: 'signpost.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 1(432-433)', 'full:不能 1×1(436)'], f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '1..100;宽 1 时从 2 起', d: '看宽', c: 'cap' },
    ],
  },
  {
    id: 'range', title: 'Range', file: 'range.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 1(921-922)', '宽 + 高 − 1 ≤ 127(923:格数类型是 signed char)', 'full:2×2、1×2、2×1、1×1 生成不了(927-930)'],
        f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'],
        f: '1..min(100, 128−宽);宽 ≤ 2 时去掉 1 和 2', d: '看宽;宽变大时被夹(宽 100 时高最多 28)', c: 'up' },
    ],
  },
  {
    id: 'pearl', title: 'Pearl', file: 'pearl.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 5(288-289)', 'Tricky(下标 1)时宽 + 高 ≥ 11(294)'], f: '5..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '5..100;Tricky 且宽 5 时从 6 起', d: '看宽和「Difficulty」', c: 'cap' },
    ],
  },
  {
    id: 'undead', title: 'Undead', file: 'undead.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 3(216-217)', '宽 ≤ ⌊54/高⌋,即面积 ≤ 54(218)'], f: '3..18', d: '主', c: 'up' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '3..⌊54/宽⌋', d: '看宽;宽变大时被夹', c: 'up' },
    ],
  },
  {
    id: 'unruly', title: 'Unruly', file: 'unruly.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽(必须是偶数)', u: ['宽高都是偶数(289)', '≥ 6(291)'], f: '6, 8, …, 100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高(偶数)',
        u: ['同上', '「Unique rows and columns」时:宽 2n 则高 ≤ A177790[n],反之亦然(295-323);表到 n = 23 为止,更宽不设限'],
        f: '6, 8, …, 100;unique 时按表夹:宽 6 → 高 ≤ 14,宽 8 → ≤ 34,宽 10 → ≤ 84,宽 ≥ 12 不限;同时高 6 → 宽 ≤ 14 等', d: '看宽和开关', c: 'cap' },
    ],
  },
  {
    id: 'flood', title: 'Flood', file: 'flood.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['面积 ≥ 2(220)', '宽高都 ≥ 1(222)'], f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '1..100;宽 1 时从 2 起', d: '看宽', c: 'cap' },
      { label: 'Colours', kind: 'int', sem: '颜色数', u: ['3..10(226,MAXCOLOURS)'], f: '3..10', d: '—', c: 'up' },
      { label: 'Extra moves permitted', kind: 'int', sem: '在最优步数之上额外允许的步数', u: ['≥ 0(228)', '无上限'], f: '0..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'tracks', title: 'Train Tracks', file: 'tracks.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 4(202)'], f: '4..100', d: '—', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['同上'], f: '4..100', d: '—', c: 'cap' },
    ],
  },
  {
    id: 'palisade', title: 'Palisade', file: 'palisade.c',
    params: [
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['宽高都 ≥ 1(169-170)'], f: '1..100', d: '主', c: 'cap' },
      { label: 'Height', kind: 'int', sem: '棋盘高', u: ['区域大小 < 面积 ⇒ 面积 ≥ 2'], f: '1..100;宽 1 时从 2 起', d: '看宽', c: 'cap' },
      { label: 'Region size', kind: 'int', sem: '每个区域的格数 k',
        u: ['≥ 1(168)', '整除面积(174)', 'full:≠ 面积(178)', 'full:k = 2 只在宽或高为 1 时可以(181)'],
        f: '面积的约数,去掉面积本身;宽高都不是 1 时再去掉 2。例:5×5 → {1, 5};8×6 → {1, 3, 4, 6, 8, 12, 16, 24}', d: '看宽高;棋盘变了吸到最近的约数', c: 'up' },
    ],
    notes: ['表不连续,滑块按表的下标走,每一档都是合法约数。'],
  },
  {
    id: 'mosaic', title: 'Mosaic', file: 'mosaic.c',
    params: [
      { label: 'Height', kind: 'int', sem: '棋盘高(上游把高排在宽前面)', u: ['宽高都 ≥ 3(242)', '面积 ≤ 10000(245,MAX_TILES)'], f: '3..100', d: '—', c: 'cap' },
      { label: 'Width', kind: 'int', sem: '棋盘宽', u: ['同上'], f: '3..100', d: '—', c: 'cap' },
    ],
    notes: ['100×100 = 10000 恰好等于上游的 MAX_TILES,两个封顶重合。'],
  },
]

// 与上游的出入:本仓库故意比上游窄(或补了上游漏掉的)的地方。
export const DEVIATIONS = [
  { game: 'dominosa', what: '最大点数封顶 98', why: '棋盘宽 n+2 ≤ 100;上游只防溢出。' },
  { game: 'solo', what: '行数从 1 起', why: '上游 validate_params 没查 r 的下限,0 和负数放行,new_game_desc 才出事;r = 1 是 Jigsaw 布局的定义值。' },
  { game: 'solo', what: '没勾 Jigsaw 时行数从 2 起,列数封到 order/2', why: '上游 r = 1 即 Jigsaw(solo.c:471)。每个控件各自提交之后,勾掉 Jigsaw 送回去的仍是 r = 1,勾选框会自己弹回来,普通棋盘就到不了了;行数从 2 起,settle 在勾掉时把 1 抬成 2。' },
  { game: 'solo', what: '二阶(2j、2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像,及二阶 Killer,去掉', why: '上游放行但生成不终止:原生 oracle 五个种子各 10 秒全部超时(其它对称、三阶起全部正常)。' },
  { game: 'loopy', what: 'Penrose (kite/dart) 宽高从 4 起,Penrose (rhombs) 从 5 起', why: '上游 amin 3。最小尺寸附近生成极慢(五个种子 10 秒全超时,4×9 要 120 秒)且浏览器里撞到过除零 / dsf 断言,引擎当场死掉;取一个把超时格全盖住的矩形。' },
  { game: 'blackbox', what: '「最多球数」≤ 宽×高−1', why: '上游只查最少 < 格数;最多超过格数时放球循环永不结束。' },
  { game: 'rect', what: '扩展因子封顶 5.00、步长 0.05', why: '上游只要求非负;缩小后的边不足 2 会钉 2,所以 5 以上和更大的值没有区别(100×100 时 49 以上才完全一样)。' },
  { game: '(浮点)', what: '障碍概率步长 0.01、扩展因子步长 0.05', why: '滑块只能取有限个值;上游接受任意小数。Game ID 载进来的表外小数,第一次落定时吸到最近一档。' },
  { game: 'mines', what: '不再接受「20%」写法', why: '滑块只出绝对雷数,占比作为读数显示;可达的雷数集合不变。' },
]
