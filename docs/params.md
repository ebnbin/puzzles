# 自定义参数的取值范围

Simon Tatham's Portable Puzzle Collection 四十个游戏的自定义参数面板里,全部 91 个 string 控件(上游 C_STRING)的取值范围:每一个的语义、上游 validate_params 的每一条规则(带源码行号)、本仓库最终给它的表、它看哪些别的控件、上限从哪来。choices 和 boolean 控件不在范围内,它们在上游本来就不是输入框。

**来源**:`vendor/sgtpuzzles/`,commit `3c3632259d298ab62aafa8a5858823569ab1af46`(2026-07-19)。全部规则直接读 C 源码得出;每条带 `文件:行号`,升级上游后照着重查。**代码是 SSOT**:范围写在各 `src/games/<game>.ts` 的 `types.params`,词汇在 `src/games/util/params.ts`;这份文档是索引和理由,不是第二份真相;它本身是生成物,手写源在 `scripts/lib/params-doc.mjs`,生成器 `scripts/build-params-doc.mjs`。两者是否一致由 `scripts/check-params.mjs` 对着上游源码验证(第七节)。

## 怎么读

分八节:**一、机制**是四十个游戏共有的那一层——值怎么进出 C、模型长什么样、控件怎么画;**二、总览**一张表横扫全部 91 个参数;**三、逐游戏详表**按上游收录序,每个游戏一节,列全该游戏的全部控件、每个 string 参数的语义与上游规则、本仓库的表、默认参数下模型算出的实际表、预设;**四、与上游的出入**;**五、被 CAP 封顶的参数**(下一阶段的调优清单);**六、已知问题**;**七、验证**;**八、实现**。

表里的「依赖」一栏写的是这个参数看谁:「主」= 不看别的数字参数;「看宽」= 表由宽算出,宽动了它可能被夹。

## 一、机制

### 1.1 参数从哪来、到哪去

类型面板一打开,宿主就向后端要一份 config box,参数列表常驻。C 侧 `game_configure` 给出一组控件,wasm 胶水(`engine/puzzle-lib.js`)只把三样交到 JS:英文 label、类型(string / choices / boolean)、当前值的字符串。没有 kw,也没有任何范围信息(`emcc.c:616-637`)。

提交时 JS 把每个控件的值原样交回(`dlg_return_sval`),C 侧 `custom_params` 用 atoi / atof / sscanf 解析成 `game_params`,再过 `validate_params(params, full)`。**自定义面板这条路 full 恒为 true**(`midend.c:2011`)——文中所有「full:」开头的规则都生效。不通过就把错误串回传显示成 Notice,box 保持打开;通过就开新局并重新要一次 box。

所以范围知识只能放在 JS 侧,而且只能按 label 认控件。

**预设与参数互相跟随**,两个方向都是上游算的:点一条预设时,C 侧只有一个 config box,所以宿主先让位(`dialogCancel`)、换参数(`selectPreset`)、再要一份——新的这份就是那条预设的值。反过来,每次参数落定后 `midend_set_config` 都会跟一次 `select_appropriate_preset`(`emcc.c:705`),它拿 `midend_which_preset` 按编码后的参数串逐个比对(`midend.c`),命中就报那条预设、不命中报 −1,界面照着它点亮「自定义」。所以选中态不是界面自己猜的。

常驻的这份 box 占着 C 侧唯一的那个位置:键区的偏好键要借同一个 box 用,借之前先让位、借完再要回来(`useConfigBox` 的 `borrowPrefs`),否则那一借会被静默丢掉。

### 1.2 范围模型

每个 string 控件在游戏文件里申报一条 `Param`:label、类型、一个函数 `allowed(read)`,输入其它控件的当前值,输出**升序的允许值表**。连续区间、偶数、约数、浮点等距取样、只有一个值(钉死)都是同一种东西:一张表。

**申报顺序即依赖顺序**:一张表只许看排在它前面的数字参数,以及任意 choices / boolean。排在前面的是「主」,后面的跟着让。所以宽高总是可以自由拉动,雷数、区域大小、旋转块边长这类派生量随之被夹。

**settle**:用户每动一个控件,宿主按申报顺序单趟走完所有表,值不在表内就吸到最近的表内值(等距取大),然后提交。表是按「后面的参数一定还有解」写的,所以走完必定是上游放行的组合;这条不变量由第七节的契约测试验证。

当前值来自上游(预设、Game ID、旧存档),可能在表外(比如 Game ID 里输入过 200×200,或 full=false 才放行的 2×2 Range)。面板先照实显示,滑块停在最近的一档;用户第一次动任何控件时才会被 settle 夹进表。

### 1.3 控件

**整数与浮点**:一个滑块,按表的**下标**走(表不连续也每一档都合法),两侧各一个 −/+ 步进按钮做精确微调,旁边显示当前值;表只有一个值时禁用。松手(change)才提交,拖动中只更新读数——和今天 checkbox / select 的「每次 change 即落定」一致。

**区间「a-b」**(只有 Black Box 的球数):同一个 label 下两行滑块,最少 / 最多;两者相等时写回单个数,和上游回显格式一致。

**附注读数**:Mines 的雷数旁边显示占比,顶替下线的「20%」写法。

**兜底**:没申报的 string 控件(比如模态对话框那条路)仍画成文本框;label 对不上上游时申报被忽略,同样回落到文本框。

**上游那条「自定义」不画**:参数列表常驻之后它没有动作可做。参数不落在任何预设上时一条都不选中,那就是自定义。

### 1.4 上限的规矩

上游自身有上限的用上游的。上游没有的:网格维度封顶 100(棋盘最多 100×100 格),其它计数类参数先同用 100,第五节列出全部这样的参数——它们是本阶段的占位,下一阶段逐个调。

几处故意与上游不同(补上游漏查的、或按语义封顶),全部列在第四节;契约测试把它们登记为「预期的收窄」,再多一处就 FAIL。

## 二、总览

| 游戏 | 控件(上游 label) | 类型 | 最终范围 | 依赖 | 上限来源 |
| --- | --- | --- | --- | --- | --- |
| Net | `Width` | 整数 | 1..100;勾了「Walls wrap around」和「Ensure unique solution」时去掉 2 | 看两个开关 | CAP 100 |
| Net | `Height` | 整数 | 1..100;宽是 1 时从 2 起;wrap+unique 时去掉 2 | 看宽和两个开关 | CAP 100 |
| Net | `Barrier probability` | 浮点 | 0.00..1.00,步长 0.01 | — | 上游自身 |
| Cube | `Width / top` | 整数 | 0..100 里「高取到 100 时放得下」的那些;立方体实际是 2..100 | 看「Type of solid」 | CAP 100 |
| Cube | `Height / bottom` | 整数 | 0..100 里与当前宽一起放得下的那些。例:立方体宽 2 时高 ≥ 4,宽 3 时高 ≥ 3;四面体 (0,3)、(1,2) 可以,(1,1) 不行 | 看立体类型和宽 | CAP 100 |
| Fifteen | `Width` | 整数 | 2..100 | — | CAP 100 |
| Fifteen | `Height` | 整数 | 2..100 | — | CAP 100 |
| Sixteen | `Width` | 整数 | 2..100 | — | CAP 100 |
| Sixteen | `Height` | 整数 | 2..100 | — | CAP 100 |
| Sixteen | `Number of shuffling moves` | 整数 | 0..100 | — | CAP 100 |
| Twiddle | `Width` | 整数 | 2..100 | 主 | CAP 100 |
| Twiddle | `Height` | 整数 | 2..100 | 主 | CAP 100 |
| Twiddle | `Rotating block size` | 整数 | 2..min(宽, 高) | 看宽高;宽高缩小时被夹 | 上游自身 |
| Twiddle | `Number of shuffling moves` | 整数 | 0..100 | — | CAP 100 |
| Rectangles | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Rectangles | `Height` | 整数 | 1..100;宽是 1 时从 2 起 | 看宽 | CAP 100 |
| Rectangles | `Expansion factor` | 浮点 | 0.00..5.00,步长 0.05 | — | 按语义补 |
| Netslide | `Width` | 整数 | 2..100 | — | CAP 100 |
| Netslide | `Height` | 整数 | 2..100 | — | CAP 100 |
| Netslide | `Barrier probability` | 浮点 | 0.00..1.00,步长 0.01 | — | 上游自身 |
| Netslide | `Number of shuffling moves` | 整数 | 0..100 | — | CAP 100 |
| Pattern | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Pattern | `Height` | 整数 | 1..100;宽是 1 时从 2 起 | 看宽 | CAP 100 |
| Solo | `Columns of sub-blocks` | 整数 | 勾了 Jigsaw:1..31(Killer 1..9);没勾:2..15(Killer 2..4),给行数 ≥ 2 留位 | 看 Killer、Jigsaw | 上游自身 |
| Solo | `Rows of sub-blocks` | 整数 | 勾了 Jigsaw:⌈2/c⌉..⌊31/c⌋(Killer ⌊9/c⌋);没勾:2..⌊31/c⌋;X 时从 ⌈4/c⌉ 起;二阶(c·r = 2 或 2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像或 Killer 时去掉 | 看列数、X、Killer、Jigsaw、Symmetry;列数变大时被夹 | 上游自身 |
| Mines | `Width` | 整数 | 1..100;勾了「Ensure solubility」时 3..100 | 看开关 | CAP 100 |
| Mines | `Height` | 整数 | 同宽,再要求宽×高 ≥ 10(宽 1 时高 ≥ 10,宽 3 时高 ≥ 4) | 看宽和开关 | CAP 100 |
| Mines | `Mines` | 整数 | 1..宽×高−9 | 看宽高;缩小棋盘时被夹 | 上游自身 |
| Same Game | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Same Game | `Height` | 整数 | 1..100;宽 1 时从 2 起(不保证可解时从 4 起,宽 2 时从 2 起) | 看宽和开关 | CAP 100 |
| Same Game | `No. of colours` | 整数 | 保证可解:3..9;否则 2..min(9, ⌊面积/2⌋) | 看宽高和开关 | 上游自身 |
| Flip | `Width` | 整数 | 1..100 | — | CAP 100 |
| Flip | `Height` | 整数 | 1..100 | — | CAP 100 |
| Guess | `Colours` | 整数 | 2..10 | 主 | 上游自身 |
| Guess | `Pegs per guess` | 整数 | 允许重复:2..100;否则 2..颜色数 | 看颜色数和「Allow duplicates」;颜色数减少时被夹 | CAP 100 |
| Guess | `Guesses` | 整数 | 1..100 | — | CAP 100 |
| Pegs | `Width` | 整数 | Cross:{5, 7, 9};Octagon:{7};Random:4..100 | 看「Board type」 | CAP 100 |
| Pegs | `Height` | 整数 | Cross:{5, 7, 9},宽 5 时 {7, 9};Octagon:{7};Random:4..100 | 看类型和宽 | CAP 100 |
| Dominosa | `Maximum number on dominoes` | 整数 | 1..98 | — | 棋盘 ≤ 100 宽 |
| Untangle | `Number of points` | 整数 | 4..100 | — | CAP 100 |
| Black Box | `Width` | 整数 | 2..100 | 主 | CAP 100 |
| Black Box | `Height` | 整数 | 2..100 | 主 | CAP 100 |
| Black Box | `No. of balls` | 区间「a-b」 | 最少 1..宽×高−1;最多 最少..宽×高−1 | 看宽高;缩小棋盘时被夹 | 按语义补 |
| Slant | `Width` | 整数 | 2..100 | — | CAP 100 |
| Slant | `Height` | 整数 | 2..100 | — | CAP 100 |
| Light Up | `Width` | 整数 | 2..100;「4-way rotational」时 3..100 | 看「Symmetry」 | CAP 100 |
| Light Up | `Height` | 整数 | 2..100;「4-way rotational」时钉在宽;「4-way mirror」且宽 2 时从 3 起 | 看对称和宽;宽动时跟着动 | CAP 100 |
| Light Up | `%age of black squares` | 整数 | 5..100 | — | 上游自身 |
| Map | `Width` | 整数 | 2..100 | 主 | CAP 100 |
| Map | `Height` | 整数 | 2..100;宽 2 时从 3 起 | 看宽 | CAP 100 |
| Map | `Regions` | 整数 | 5..宽×高 | 看宽高;缩小棋盘时被夹 | 上游自身 |
| Loopy | `Width` | 整数 | amin..100;Penrose (kite/dart) 从 4 起,Penrose (rhombs) 从 5 起 | 看「Grid type」 | CAP 100 |
| Loopy | `Height` | 整数 | amin..100;宽 < omin 时从 omin 起;两种 Penrose 同宽的下限 | 看网格类型和宽 | CAP 100 |
| Inertia | `Width` | 整数 | 2..100 | 主 | CAP 100 |
| Inertia | `Height` | 整数 | 2..100;宽 2 时从 3 起 | 看宽 | CAP 100 |
| Tents | `Width` | 整数 | 4..100 | — | CAP 100 |
| Tents | `Height` | 整数 | 4..100 | — | CAP 100 |
| Bridges | `Width` | 整数 | 3..100 | — | CAP 100 |
| Bridges | `Height` | 整数 | 3..100 | — | CAP 100 |
| Unequal | `Size (s*s)` | 整数 | 3..32;Adjacent 且难度 ≥ Tricky 时 5..32 | 看「Mode」「Difficulty」 | 上游自身 |
| Galaxies | `Width` | 整数 | 3..100 | — | CAP 100 |
| Galaxies | `Height` | 整数 | 3..100 | — | CAP 100 |
| Filling | `Width` | 整数 | 1..100 | — | CAP 100 |
| Filling | `Height` | 整数 | 1..100 | — | CAP 100 |
| Keen | `Grid size` | 整数 | 3..9 | — | 上游自身 |
| Towers | `Grid size` | 整数 | 3..9 | — | 上游自身 |
| Singles | `Width` | 整数 | 2..62 | — | 上游自身 |
| Singles | `Height` | 整数 | 2..62 | — | 上游自身 |
| Magnets | `Width` | 整数 | 2..100 | 主 | CAP 100 |
| Magnets | `Height` | 整数 | 2..100;宽不够时从 3(Tricky:5)起 | 看宽和「Difficulty」 | CAP 100 |
| Signpost | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Signpost | `Height` | 整数 | 1..100;宽 1 时从 2 起 | 看宽 | CAP 100 |
| Range | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Range | `Height` | 整数 | 1..min(100, 128−宽);宽 ≤ 2 时去掉 1 和 2 | 看宽;宽变大时被夹(宽 100 时高最多 28) | 上游自身 |
| Pearl | `Width` | 整数 | 5..100 | 主 | CAP 100 |
| Pearl | `Height` | 整数 | 5..100;Tricky 且宽 5 时从 6 起 | 看宽和「Difficulty」 | CAP 100 |
| Undead | `Width` | 整数 | 3..18 | 主 | 上游自身 |
| Undead | `Height` | 整数 | 3..⌊54/宽⌋ | 看宽;宽变大时被夹 | 上游自身 |
| Unruly | `Width` | 整数 | 6, 8, …, 100 | 主 | CAP 100 |
| Unruly | `Height` | 整数 | 6, 8, …, 100;unique 时按表夹:宽 6 → 高 ≤ 14,宽 8 → ≤ 34,宽 10 → ≤ 84,宽 ≥ 12 不限;同时高 6 → 宽 ≤ 14 等 | 看宽和开关 | CAP 100 |
| Flood | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Flood | `Height` | 整数 | 1..100;宽 1 时从 2 起 | 看宽 | CAP 100 |
| Flood | `Colours` | 整数 | 3..10 | — | 上游自身 |
| Flood | `Extra moves permitted` | 整数 | 0..100 | — | CAP 100 |
| Train Tracks | `Width` | 整数 | 4..100 | — | CAP 100 |
| Train Tracks | `Height` | 整数 | 4..100 | — | CAP 100 |
| Palisade | `Width` | 整数 | 1..100 | 主 | CAP 100 |
| Palisade | `Height` | 整数 | 1..100;宽 1 时从 2 起 | 看宽 | CAP 100 |
| Palisade | `Region size` | 整数 | 面积的约数,去掉面积本身;宽高都不是 1 时再去掉 2。例:5×5 → {1, 5};8×6 → {1, 3, 4, 6, 8, 12, 16, 24} | 看宽高;棋盘变了吸到最近的约数 | 上游自身 |
| Mosaic | `Height` | 整数 | 3..100 | — | CAP 100 |
| Mosaic | `Width` | 整数 | 3..100 | — | CAP 100 |

## 三、逐游戏详表

每节先列 config box 的全部控件(下标、类型、初值),再逐个说 string 参数。「默认参数下的表」是模型对着上游默认参数实际算出来的,和上一栏的描述应当一致。

### Net(`net.c`)

默认参数 `5x5`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `5` |
| 1 | string | `Height` | `5` |
| 2 | boolean | `Walls wrap around` | false |
| 3 | string | `Barrier probability` | `0` |
| 4 | boolean | `Ensure unique solution` | true |

#### `Width`(整数)

- **语义**:棋盘宽(格)
- **上游**(`net.c`):
  - 宽高都 > 0(322)
  - 宽高不能同时 ≤ 1(324)
  - full 且 unique 且 wrap 时,宽或高都不能是 2(376)
- **本仓库的表**:1..100;勾了「Walls wrap around」和「Ensure unique solution」时去掉 2
- **依赖**:看两个开关;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高(格)
- **上游**(`net.c`):
  - 同上
- **本仓库的表**:1..100;宽是 1 时从 2 起;wrap+unique 时去掉 2
- **依赖**:看宽和两个开关;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Barrier probability`(浮点)

- **语义**:每条边成为墙的概率
- **上游**(`net.c`):
  - ≥ 0(328)
  - ≤ 1(330)
  - atof 解析(314),%g 回显
- **本仓库的表**:0.00..1.00,步长 0.01
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:0, 0.01, …, 1(步长 0.01,101 个)

预设:5x5 `5x5`;7x7 `7x7`;9x9 `9x9`;11x11 `11x11`;13x11 `13x11`;5x5 wrapping `5x5w`;7x7 wrapping `7x7w`;9x9 wrapping `9x9w`;11x11 wrapping `11x11w`;13x11 wrapping `13x11w`。

### Cube(`cube.c`)

默认参数 `c4x4`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | choices | `Type of solid` | 1(0 Tetrahedron / 1 Cube / 2 Octahedron / 3 Icosahedron) |
| 1 | string | `Width / top` | `4` |
| 2 | string | `Height / bottom` | `4` |

#### `Width / top`(整数)

- **语义**:方格:宽;三角格:六边形的顶边长(d1)
- **上游**(`cube.c`):
  - d1, d2 ≥ 0(549)
  - 立方体(方格):两边都 ≥ 2(553)
  - 其它三种(三角格):两边不能都是 0(558)
  - 按 enum_grid_squares 逐格分类计数,每一类格数 ≥ 面数/类数(583-595):四面体 4 类、八面体 2 类、其余 1 类
  - 总面积 ≥ 面数 + 1(597):方格 d1·d2,三角格 d1²+d2²+4·d1·d2;面数 4 / 6 / 8 / 20
- **本仓库的表**:0..100 里「高取到 100 时放得下」的那些;立方体实际是 2..100
- **依赖**:看「Type of solid」;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height / bottom`(整数)

- **语义**:方格:高;三角格:另三条边长(d2)
- **上游**(`cube.c`):
  - 同上
- **本仓库的表**:0..100 里与当前宽一起放得下的那些。例:立方体宽 2 时高 ≥ 4,宽 3 时高 ≥ 3;四面体 (0,3)、(1,2) 可以,(1,1) 不行
- **依赖**:看立体类型和宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

> 分类计数在 cube.ts 里按上游逐行移植(roomFor),不是闭式公式;oracle 逐值验证过四种立体 0..100 全部组合。

预设:Cube `c4x4`;Tetrahedron `t1x2`;Octahedron `o2x2`;Icosahedron `i3x3`。

### Fifteen(`fifteen.c`)

默认参数 `4x4`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `4` |
| 1 | string | `Height` | `4` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`fifteen.c`):
  - 宽高都 ≥ 2(149)
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`fifteen.c`):
  - 同上
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

预设:4x4 `4x4`。

### Sixteen(`sixteen.c`)

默认参数 `4x4`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `4` |
| 1 | string | `Height` | `4` |
| 2 | string | `Number of shuffling moves` | `0` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`sixteen.c`):
  - 宽高都 ≥ 2(179)
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`sixteen.c`):
  - 同上
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Number of shuffling moves`(整数)

- **语义**:打乱用的随机步数;0 = 完全随机排列
- **上游**(`sixteen.c`):
  - ≥ 0(183)
  - 无上限
- **本仓库的表**:0..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:0..100(101 个)

预设:3x3 `3x3`;4x3 `4x3`;4x4 `4x4`;5x4 `5x4`;5x5 `5x5`。

### Twiddle(`twiddle.c`)

默认参数 `3x3n2`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `3` |
| 1 | string | `Height` | `3` |
| 2 | string | `Rotating block size` | `2` |
| 3 | boolean | `One number per row` | false |
| 4 | boolean | `Orientation matters` | false |
| 5 | string | `Number of shuffling moves` | `0` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`twiddle.c`):
  - 宽 ≥ 旋转块边长 n(216)
  - n ≥ 2(214)
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`twiddle.c`):
  - 高 ≥ n(218)
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Rotating block size`(整数)

- **语义**:一次旋转的方块边长
- **上游**(`twiddle.c`):
  - ≥ 2(214)
  - ≤ 宽且 ≤ 高(216-218)
- **本仓库的表**:2..min(宽, 高)
- **依赖**:看宽高;宽高缩小时被夹;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:2..3(2 个)

#### `Number of shuffling moves`(整数)

- **语义**:打乱步数;0 = 完全随机
- **上游**(`twiddle.c`):
  - ≥ 0(222)
  - 无上限
- **本仓库的表**:0..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:0..100(101 个)

预设:3x3 rows only `3x3n2r`;3x3 normal `3x3n2`;3x3 orientable `3x3n2o`;4x4 normal `4x4n2`;4x4 orientable `4x4n2o`;4x4, rotating 3x3 blocks `4x4n3`;5x5, rotating 3x3 blocks `5x5n3`;6x6, rotating 4x4 blocks `6x6n4`。

### Rectangles(`rect.c`)

默认参数 `7x7`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `7` |
| 1 | string | `Height` | `7` |
| 2 | string | `Expansion factor` | `0` |
| 3 | boolean | `Ensure unique solution` | true |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`rect.c`):
  - 宽高都 > 0(223)
  - 面积 ≥ 2(227)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`rect.c`):
  - 同上
- **本仓库的表**:1..100;宽是 1 时从 2 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Expansion factor`(浮点)

- **语义**:先按 1/(1+e) 缩小生成,再撑回原尺寸;0 = 不缩
- **上游**(`rect.c`):
  - ≥ 0(229)
  - 无上限
  - atof 解析,%g 回显
  - 缩小后的边不足 2 时钉 2(1165-1168),所以再大也不会崩
- **本仓库的表**:0.00..5.00,步长 0.05
- **依赖**:—;**上限来源**:按语义补;**控件**:滑块 + 步进
- **默认参数下的表**:0, 0.05, …, 5(步长 0.05,101 个)

> 手册说 0.5 已经明显更难、再高谜题退化成寥寥几个矩形;5 之后每一边最多缩到原来的 1/6,与再大的值没有区别。要放宽改 rect.ts 里的一个数。

预设:7x7 `7x7`;9x9 `9x9`;11x11 `11x11`;13x13 `13x13`;15x15 `15x15`;17x17 `17x17`;19x19 `19x19`。

### Netslide(`netslide.c`)

默认参数 `3x3b1`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `3` |
| 1 | string | `Height` | `3` |
| 2 | boolean | `Walls wrap around` | false |
| 3 | string | `Barrier probability` | `1` |
| 4 | string | `Number of shuffling moves` | `0` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`netslide.c`):
  - 宽高都 ≥ 2(313)
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`netslide.c`):
  - 同上
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Barrier probability`(浮点)

- **语义**:每条边成为墙的概率(默认 1)
- **上游**(`netslide.c`):
  - 0..1(317-320)
- **本仓库的表**:0.00..1.00,步长 0.01
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:0, 0.01, …, 1(步长 0.01,101 个)

#### `Number of shuffling moves`(整数)

- **语义**:打乱步数;0 = 完全随机
- **上游**(`netslide.c`):
  - ≥ 0(321)
  - 无上限
- **本仓库的表**:0..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:0..100(101 个)

预设:3x3 easy `3x3b1`;3x3 medium `3x3`;3x3 hard `3x3w`;4x4 easy `4x4b1`;4x4 medium `4x4`;4x4 hard `4x4w`;5x5 easy `5x5b1`;5x5 medium `5x5`;5x5 hard `5x5w`。

### Pattern(`pattern.c`)

默认参数 `15x15`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `15` |
| 1 | string | `Height` | `15` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`pattern.c`):
  - 宽高都 > 0(184)
  - 面积 ≥ 2(189)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`pattern.c`):
  - 同上
- **本仓库的表**:1..100;宽是 1 时从 2 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

预设:10x10 `10x10`;15x15 `15x15`;20x20 `20x20`;25x25 `25x25`;30x30 `30x30`。

### Solo(`solo.c`)

默认参数 `3x3`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Columns of sub-blocks` | `3` |
| 1 | string | `Rows of sub-blocks` | `3` |
| 2 | boolean | `"X" (require every number in each main diagonal)` | false |
| 3 | boolean | `Jigsaw (irregularly shaped sub-blocks)` | false |
| 4 | boolean | `Killer (digit sums)` | false |
| 5 | choices | `Symmetry` | 1(0 None / 1 2-way rotation / 2 4-way rotation / 3 2-way mirror / 4 2-way diagonal mirror / 5 4-way mirror / 6 4-way diagonal mirror / 7 8-way mirror) |
| 6 | choices | `Difficulty` | 0(0 Trivial / 1 Basic / 2 Intermediate / 3 Advanced / 4 Extreme / 5 Unreasonable) |

#### `Columns of sub-blocks`(整数)

- **语义**:子块的列数 c;阶数 = c·r
- **上游**(`solo.c`):
  - c ≥ 2(516)
  - c, r ≤ 255(518,ORDER_MAX)
  - c·r ≤ 31(520)
  - Killer 时 c·r ≤ 9(522)
  - X 时 c·r ≥ 4(524)
  - 勾了 Jigsaw:custom_params 先令 c := c·r、r := 1(502),所以「c ≥ 2」落在乘积上
- **本仓库的表**:勾了 Jigsaw:1..31(Killer 1..9);没勾:2..15(Killer 2..4),给行数 ≥ 2 留位
- **依赖**:看 Killer、Jigsaw;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:2..15(14 个)

#### `Rows of sub-blocks`(整数)

- **语义**:子块的行数 r;r = 1 即 Jigsaw 布局(4104)
- **上游**(`solo.c`):
  - 上游没有查 r 的下限(0、负数都放行,生成时才出事)
  - 其余同上
- **本仓库的表**:勾了 Jigsaw:⌈2/c⌉..⌊31/c⌋(Killer ⌊9/c⌋);没勾:2..⌊31/c⌋;X 时从 ⌈4/c⌉ 起;二阶(c·r = 2 或 2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像或 Killer 时去掉
- **依赖**:看列数、X、Killer、Jigsaw、Symmetry;列数变大时被夹;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:2..10(9 个)

> 勾 Jigsaw 提交后,C 侧把两数相乘、行数归 1,再次打开面板看到的是 (c·r, 1)——和上游桌面版一样。Jigsaw 模式下再拉行数会让阶数成倍增长,这里不拦(上游放行)。

> 没勾 Jigsaw 时行数从 2 起,是因为上游把 r = 1 定义成 Jigsaw(solo.c:471):行数滑到 1 棋盘会悄悄变成 jigsaw、勾选框自己亮起;而勾掉 Jigsaw 提交回去的仍是 r = 1,勾不掉。列数相应封到 order/2。见「与上游的出入」。

> 二阶配 4 向旋转、4 向镜像、8 向镜像(2j 与 2×2 都是),以及二阶 Killer(2jk),上游生成不终止:原生 oracle 五个种子全部超时。表里去掉,见「与上游的出入」。

预设:2x2 Trivial `2x2`;2x3 Basic `2x3db`;3x3 Trivial `3x3`;3x3 Basic `3x3db`;3x3 Basic X `3x3xdb`;3x3 Intermediate `3x3di`;3x3 Advanced `3x3da`;3x3 Advanced X `3x3xda`;3x3 Extreme `3x3de`;3x3 Unreasonable `3x3du`;3x3 Killer `3x3ka`;9 Jigsaw Basic `9jdb`;9 Jigsaw Basic X `9jxdb`;9 Jigsaw Advanced `9jda`;3x4 Basic `3x4db`;4x4 Basic `4x4db`。

### Mines(`mines.c`)

默认参数 `9x9n10`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `9` |
| 1 | string | `Height` | `9` |
| 2 | string | `Mines` | `10` |
| 3 | boolean | `Ensure solubility` | true |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`mines.c`):
  - full 且「Ensure solubility」时宽高都 > 2(290)
  - 否则宽高 ≥ 1(292)
  - ≤ SHRT_MAX(294)
  - 面积 ≤ 2²⁸−1(300)
- **本仓库的表**:1..100;勾了「Ensure solubility」时 3..100
- **依赖**:看开关;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`mines.c`):
  - 同上
  - 雷数 ≥ 1 且 ≤ 面积−9 ⇒ 面积 ≥ 10
- **本仓库的表**:同宽,再要求宽×高 ≥ 10(宽 1 时高 ≥ 10,宽 3 时高 ≥ 4)
- **依赖**:看宽和开关;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Mines`(整数)

- **语义**:雷数;文本框时代还接受「20%」写法(266)
- **上游**(`mines.c`):
  - ≥ 1(305-308)
  - ≤ 宽×高 − 9(309)
- **本仓库的表**:1..宽×高−9
- **依赖**:看宽高;缩小棋盘时被夹;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:1..72(72 个)

> 百分比写法随文本框一起下线:滑块只出绝对数,旁边附「占比」读数;同样的雷数都能达到。

预设:9x9, 10 mines `9x9n10`;9x9, 35 mines `9x9n35`;16x16, 40 mines `16x16n40`;16x16, 99 mines `16x16n99`;30x16, 99 mines `30x16n99`;30x16, 170 mines `30x16n170`。

### Same Game(`samegame.c`)

默认参数 `5x5c3s2`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `5` |
| 1 | string | `Height` | `5` |
| 2 | string | `No. of colours` | `3` |
| 3 | choices | `Scoring system` | 1(0 (n-1)^2 / 1 (n-2)^2) |
| 4 | boolean | `Ensure solubility` | true |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`samegame.c`):
  - 宽高都 ≥ 1(291)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`samegame.c`):
  - 「Ensure solubility」时面积 ≥ 2(302)
  - 否则每种颜色至少两格:面积 ≥ 2×颜色数,颜色 ≥ 2 ⇒ 面积 ≥ 4(305-310)
- **本仓库的表**:1..100;宽 1 时从 2 起(不保证可解时从 4 起,宽 2 时从 2 起)
- **依赖**:看宽和开关;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `No. of colours`(整数)

- **语义**:颜色数
- **上游**(`samegame.c`):
  - ≤ 9(296)
  - 保证可解时 ≥ 3(300)
  - 不保证时 ≥ 2 且 2×颜色数 ≤ 面积(305-310)
- **本仓库的表**:保证可解:3..9;否则 2..min(9, ⌊面积/2⌋)
- **依赖**:看宽高和开关;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..9(7 个)

预设:5x5, 3 colours `5x5c3s2`;10x5, 3 colours `10x5c3s2`;15x10, 3 colours `15x10c3s2`;15x10, 4 colours `15x10c4s2`;20x15, 4 colours `20x15c4s2`。

### Flip(`flip.c`)

默认参数 `5x5c`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `5` |
| 1 | string | `Height` | `5` |
| 2 | choices | `Shape type` | 0(0 Crosses / 1 Random) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`flip.c`):
  - 宽高都 > 0(191)
- **本仓库的表**:1..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`flip.c`):
  - 同上
- **本仓库的表**:1..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

预设:3x3 Crosses `3x3c`;4x4 Crosses `4x4c`;5x5 Crosses `5x5c`;3x3 Random `3x3r`;4x4 Random `4x4r`;5x5 Random `5x5r`。

### Guess(`guess.c`)

默认参数 `c6p4g10Bm`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Colours` | `6` |
| 1 | string | `Pegs per guess` | `4` |
| 2 | string | `Guesses` | `10` |
| 3 | boolean | `Allow blanks` | false |
| 4 | boolean | `Allow duplicates` | true |

#### `Colours`(整数)

- **语义**:可选颜色数
- **上游**(`guess.c`):
  - ≥ 2(219)
  - ≤ 10(223)
- **本仓库的表**:2..10
- **依赖**:主;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:2..10(9 个)

#### `Pegs per guess`(整数)

- **语义**:每次猜的钉数
- **上游**(`guess.c`):
  - ≥ 2(219)
  - 不允许重复时 ≤ 颜色数(227)
  - 允许重复时无上限
- **本仓库的表**:允许重复:2..100;否则 2..颜色数
- **依赖**:看颜色数和「Allow duplicates」;颜色数减少时被夹;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Guesses`(整数)

- **语义**:允许猜的次数
- **上游**(`guess.c`):
  - ≥ 1(225)
  - 无上限
- **本仓库的表**:1..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

预设:Standard `c6p4g10Bm`;Super `c8p5g12Bm`。

### Pegs(`pegs.c`)

默认参数 `7x7cross`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `7` |
| 1 | string | `Height` | `7` |
| 2 | choices | `Board type` | 0(0 Cross / 1 Octagon / 2 Random) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`pegs.c`):
  - full 时宽高都 > 3(192)
  - Cross 只允许 5×7、5×9、7×5、7×7、7×9、9×5、9×7、9×9(206-217)
  - Octagon 只允许 7×7(225-228)
  - Random 无额外限制
- **本仓库的表**:Cross:{5, 7, 9};Octagon:{7};Random:4..100
- **依赖**:看「Board type」;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:5, 7, …, 9(步长 2,3 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`pegs.c`):
  - 同上
- **本仓库的表**:Cross:{5, 7, 9},宽 5 时 {7, 9};Octagon:{7};Random:4..100
- **依赖**:看类型和宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:5, 7, …, 9(步长 2,3 个)

> Cross 和 Octagon 的表只有几个值,滑块的每一档都是合法尺寸;Octagon 两格都钉死,控件禁用。

预设:Cross 5x7 `5x7cross`;Cross 7x7 `7x7cross`;Cross 5x9 `5x9cross`;Cross 7x9 `7x9cross`;Cross 9x9 `9x9cross`;Octagon `7x7octagon`;Random 5x5 `5x5random`;Random 7x7 `7x7random`;Random 9x9 `9x9random`。

### Dominosa(`dominosa.c`)

默认参数 `6db`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Maximum number on dominoes` | `6` |
| 1 | choices | `Difficulty` | 1(0 Trivial / 1 Basic / 2 Hard / 3 Extreme / 4 Ambiguous) |

#### `Maximum number on dominoes`(整数)

- **语义**:骨牌上的最大点数 n;棋盘 (n+2)×(n+1) 格
- **上游**(`dominosa.c`):
  - ≥ 1(249)
  - 无上限(仅防溢出,251)
- **本仓库的表**:1..98
- **依赖**:—;**上限来源**:棋盘 ≤ 100 宽;**控件**:滑块 + 步进
- **默认参数下的表**:1..98(98 个)

> 98 = 棋盘宽 n+2 不超过 100。

预设:Order 3, Trivial `3dt`;Order 4, Trivial `4dt`;Order 5, Trivial `5dt`;Order 6, Trivial `6dt`;Order 4, Basic `4db`;Order 5, Basic `5db`;Order 6, Basic `6db`;Order 7, Basic `7db`;Order 8, Basic `8db`;Order 9, Basic `9db`;Order 6, Hard `6dh`;Order 6, Extreme `6de`。

### Untangle(`untangle.c`)

默认参数 `10`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Number of points` | `10` |

#### `Number of points`(整数)

- **语义**:点数
- **上游**(`untangle.c`):
  - ≥ 4(224)
  - 无上限(仅防溢出,230)
- **本仓库的表**:4..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:4..100(97 个)

预设:6 points `6`;10 points `10`;15 points `15`;20 points `20`;25 points `25`。

### Black Box(`blackbox.c`)

默认参数 `w8h8m5M5`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `8` |
| 1 | string | `Height` | `8` |
| 2 | string | `No. of balls` | `5` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`blackbox.c`):
  - 宽高都 ≥ 2(193)
  - ≤ 255(197)
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`blackbox.c`):
  - 同上
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `No. of balls`(区间「a-b」)

- **语义**:球数;写「3」是固定数,写「3-6」是区间,每局在区间里随机取(220-225),玩家只知道区间
- **上游**(`blackbox.c`):
  - sscanf "%d-%d",不成对就当单个数(184-186)
  - 最少 ≥ 1(199-202)
  - 最少 ≤ 最多(203)
  - 最少 < 宽×高(205)
  - 最多上游没查:超过格数时放球会死循环(236)
- **本仓库的表**:最少 1..宽×高−1;最多 最少..宽×高−1
- **依赖**:看宽高;缩小棋盘时被夹;**上限来源**:按语义补;**控件**:一对滑块(最少 / 最多)
- **默认参数下的表**:最少 1..63(63 个);最多(最少取 1 时)1..63(63 个)

> 控件做成一对滑块(最少 / 最多),两者相等就写回单个数,和上游回显一致。「最多」的上限是本仓库按语义补的。

预设:5x5, 3 balls `w5h5m3M3`;8x8, 5 balls `w8h8m5M5`;8x8, 3-6 balls `w8h8m3M6`;10x10, 5 balls `w10h10m5M5`;10x10, 4-10 balls `w10h10m4M10`。

### Slant(`slant.c`)

默认参数 `8x8de`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `8` |
| 1 | string | `Height` | `8` |
| 2 | choices | `Difficulty` | 0(0 Easy / 1 Hard) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`slant.c`):
  - 宽高都 ≥ 2(239)
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`slant.c`):
  - 同上
- **本仓库的表**:2..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

预设:5x5 Easy `5x5de`;5x5 Hard `5x5dh`;8x8 Easy `8x8de`;8x8 Hard `8x8dh`;12x10 Easy `12x10de`;12x10 Hard `12x10dh`。

### Light Up(`lightup.c`)

默认参数 `7x7b20s4d0`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `7` |
| 1 | string | `Height` | `7` |
| 2 | string | `%age of black squares` | `20` |
| 3 | choices | `Symmetry` | 4(0 None / 1 2-way mirror / 2 2-way rotational / 3 4-way mirror / 4 4-way rotational) |
| 4 | choices | `Difficulty` | 0(0 Easy / 1 Tricky / 2 Hard) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`lightup.c`):
  - 宽高都 ≥ 2(357)
  - full:4-way rotational 只能方形(364-366)
  - 4-way mirror / rotational 时宽或高 ≥ 3(368)
- **本仓库的表**:2..100;「4-way rotational」时 3..100
- **依赖**:看「Symmetry」;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`lightup.c`):
  - 同上
- **本仓库的表**:2..100;「4-way rotational」时钉在宽;「4-way mirror」且宽 2 时从 3 起
- **依赖**:看对称和宽;宽动时跟着动;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:7

#### `%age of black squares`(整数)

- **语义**:黑格占比
- **上游**(`lightup.c`):
  - full:5..100(362)
- **本仓库的表**:5..100
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:5..100(96 个)

> 对称下标(lightup.c:96):0 None、1 2-way mirror、2 2-way rotational、3 4-way mirror、4 4-way rotational。

预设:7x7 easy `7x7b20s4d0`;7x7 tricky `7x7b20s4d1`;7x7 hard `7x7b20s4d2`;10x10 easy `10x10b20s2d0`;10x10 tricky `10x10b20s2d1`;10x10 hard `10x10b20s2d2`;14x14 easy `14x14b20s2d0`;14x14 tricky `14x14b20s2d1`;14x14 hard `14x14b20s2d2`。

### Map(`map.c`)

默认参数 `20x15n30dn`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `20` |
| 1 | string | `Height` | `15` |
| 2 | string | `Regions` | `30` |
| 3 | choices | `Difficulty` | 1(0 Easy / 1 Normal / 2 Hard / 3 Unreasonable) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`map.c`):
  - 宽高都 ≥ 2(261)
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`map.c`):
  - 区域数 ≥ 5 且 ≤ 面积 ⇒ 面积 ≥ 5
- **本仓库的表**:2..100;宽 2 时从 3 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Regions`(整数)

- **语义**:区域数
- **上游**(`map.c`):
  - ≥ 5(265)
  - ≤ 宽×高(267)
- **本仓库的表**:5..宽×高
- **依赖**:看宽高;缩小棋盘时被夹;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:5..300(296 个)

预设:20x15, 30 regions, Easy `20x15n30de`;20x15, 30 regions, Normal `20x15n30dn`;20x15, 30 regions, Hard `20x15n30dh`;20x15, 30 regions, Unreasonable `20x15n30du`;30x25, 75 regions, Normal `30x25n75dn`;30x25, 75 regions, Hard `30x25n75dh`。

### Loopy(`loopy.c`)

默认参数 `10x10t0de`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `10` |
| 1 | string | `Height` | `10` |
| 2 | choices | `Grid type` | 0(0 Squares / 1 Triangular / 2 Honeycomb / 3 Snub-Square / 4 Cairo / 5 Great-Hexagonal / 6 Octagonal / 7 Kites / 8 Floret / 9 Dodecagonal / 10 Great-Dodecagonal / 11 Penrose (kite/dart) / 12 Penrose (rhombs) / 13 Great-Great-Dodecagonal / 14 Kagome / 15 Compass-Dodecagonal / 16 Hats / 17 Spectres) |
| 3 | choices | `Difficulty` | 0(0 Easy / 1 Normal / 2 Tricky / 3 Hard) |

#### `Width`(整数)

- **语义**:网格宽(单位随网格类型)
- **上游**(`loopy.c`):
  - 每种网格有两个下限(281-300 的 GRIDLIST):两边都 ≥ amin(704),至少一边 ≥ omin(707)
  - grid.c 里各网格的 grid_validate_params_* 只防溢出,100 以内不起作用
- **本仓库的表**:amin..100;Penrose (kite/dart) 从 4 起,Penrose (rhombs) 从 5 起
- **依赖**:看「Grid type」;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Height`(整数)

- **语义**:网格高
- **上游**(`loopy.c`):
  - 同上
- **本仓库的表**:amin..100;宽 < omin 时从 omin 起;两种 Penrose 同宽的下限
- **依赖**:看网格类型和宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

> amin/omin 表:Squares 3/3、Triangular 3/3、Honeycomb 3/3、Snub-Square 3/3、Cairo 3/4、Great-Hexagonal 3/3、Octagonal 3/3、Kites 3/3、Floret 1/2、Dodecagonal 2/2、Great-Dodecagonal 2/2、Penrose (kite/dart) 3/3、Penrose (rhombs) 3/3、Great-Great-Dodecagonal 2/2、Kagome 3/3、Compass-Dodecagonal 2/2、Hats 6/6、Spectres 6/6。

> 两种 Penrose 在上游放行的最小尺寸附近生成不正常:原生 oracle 五个种子各跑 10 秒,kite/dart 宽 3 全部超时、宽 4..7 配高 3 超时;rhombs 宽 3、4 全部超时,宽 5 配高 3、4 超时,宽 6..9 配高 3 超时(4×9 用 120 秒能出来,是极慢不是死循环);浏览器里探测另撞到过除零和 dsf 断言,引擎当场死掉。所以两边各抬到 4 / 5,见第四节。

预设:7x7 Squares - Easy `7x7t0de`;10x10 Squares - Easy `10x10t0de`;7x7 Squares - Normal `7x7t0dn`;10x10 Squares - Normal `10x10t0dn`;7x7 Squares - Hard `7x7t0dh`;10x10 Squares - Hard `10x10t0dh`;10x12 Triangular - Hard `12x10t1dh`;7x7 Snub-Square - Hard `7x7t3dh`;9x9 Cairo - Hard `9x9t4dh`;5x5 Kites - Hard `5x5t7dh`;10x10 Penrose (kite/dart) - Hard `10x10t11dh`;10x10 Penrose (rhombs) - Hard `10x10t12dh`;10x10 Honeycomb - Hard `10x10t2dh`;4x5 Great-Hexagonal - Hard `5x4t5dh`;4x5 Kagome - Hard `5x4t14dh`;7x7 Octagonal - Hard `7x7t6dh`;5x5 Floret - Hard `5x5t8dh`;4x5 Dodecagonal - Hard `5x4t9dh`;4x5 Great-Dodecagonal - Hard `5x4t10dh`;3x5 Great-Great-Dodecagonal - Hard `5x3t13dh`;4x5 Compass-Dodecagonal - Hard `5x4t15dh`;10x10 Hats - Hard `10x10t16dh`;10x10 Spectres - Hard `10x10t17dh`。

### Inertia(`inertia.c`)

默认参数 `10x8`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `10` |
| 1 | string | `Height` | `8` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`inertia.c`):
  - 宽高都 ≥ 2(208)
  - 面积 ≥ 6(219)
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`inertia.c`):
  - 同上
- **本仓库的表**:2..100;宽 2 时从 3 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

预设:10x8 `10x8`;15x12 `15x12`;20x16 `20x16`。

### Tents(`tents.c`)

默认参数 `8x8de`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `8` |
| 1 | string | `Height` | `8` |
| 2 | choices | `Difficulty` | 0(0 Easy / 1 Tricky) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`tents.c`):
  - 宽高都 ≥ 4(414)
- **本仓库的表**:4..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:4..100(97 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`tents.c`):
  - 同上
- **本仓库的表**:4..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:4..100(97 个)

预设:8x8 Easy `8x8de`;8x8 Tricky `8x8dt`;10x10 Easy `10x10de`;10x10 Tricky `10x10dt`;15x15 Easy `15x15de`;15x15 Tricky `15x15dt`。

### Bridges(`bridges.c`)

默认参数 `7x7i30e10m2d0`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `7` |
| 1 | string | `Height` | `7` |
| 2 | choices | `Difficulty` | 0(0 Easy / 1 Medium / 2 Hard) |
| 3 | boolean | `Allow loops` | true |
| 4 | choices | `Max. bridges per direction` | 1(0 1 / 1 2 / 2 3 / 3 4) |
| 5 | choices | `%age of island squares` | 5(0 5% / 1 10% / 2 15% / 3 20% / 4 25% / 5 30%) |
| 6 | choices | `Expansion factor (%age)` | 1(0 0% / 1 10% / 2 20% / 3 30% / 4 40% / 5 50% / 6 60% / 7 70% / 8 80% / 9 90% / 10 100%) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`bridges.c`):
  - 宽高都 ≥ 3(813)
- **本仓库的表**:3..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`bridges.c`):
  - 同上
- **本仓库的表**:3..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

> 难度、桥数上限、岛屿占比、扩展因子在上游本来就是下拉,不在本次范围内。

预设:7x7 easy `7x7i30e10m2d0`;7x7 medium `7x7i30e10m2d1`;7x7 hard `7x7i30e10m2d2`;10x10 easy `10x10i30e10m2d0`;10x10 medium `10x10i30e10m2d1`;10x10 hard `10x10i30e10m2d2`;15x15 easy `15x15i30e10m2d0`;15x15 medium `15x15i30e10m2d1`;15x15 hard `15x15i30e10m2d2`。

### Unequal(`unequal.c`)

默认参数 `4de`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | choices | `Mode` | 0(0 Unequal / 1 Adjacent) |
| 1 | string | `Size (s*s)` | `4` |
| 2 | choices | `Difficulty` | 1(0 Trivial / 1 Easy / 2 Tricky / 3 Extreme / 4 Recursive) |

#### `Size (s*s)`(整数)

- **语义**:拉丁方阶数
- **上游**(`unequal.c`):
  - 3..32(269)
  - Adjacent 模式且难度 ≥ Tricky(下标 2)时 ≥ 5(273)
- **本仓库的表**:3..32;Adjacent 且难度 ≥ Tricky 时 5..32
- **依赖**:看「Mode」「Difficulty」;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..32(30 个)

预设:Unequal: 4x4 Easy `4de`;Unequal: 5x5 Easy `5de`;Unequal: 5x5 Tricky `5dk`;Adjacent: 5x5 Tricky `5adk`;Unequal: 5x5 Extreme `5dx`;Unequal: 6x6 Easy `6de`;Unequal: 6x6 Tricky `6dk`;Adjacent: 6x6 Tricky `6adk`;Unequal: 6x6 Extreme `6dx`;Unequal: 7x7 Tricky `7dk`;Adjacent: 7x7 Tricky `7adk`;Unequal: 7x7 Extreme `7dx`。

### Galaxies(`galaxies.c`)

默认参数 `7x7dn`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `7` |
| 1 | string | `Height` | `7` |
| 2 | choices | `Difficulty` | 0(0 Normal / 1 Unreasonable) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`galaxies.c`):
  - 宽高都 ≥ 3(330)
- **本仓库的表**:3..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`galaxies.c`):
  - 同上
- **本仓库的表**:3..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

预设:7x7 Normal `7x7dn`;7x7 Unreasonable `7x7du`;10x10 Normal `10x10dn`;10x10 Unreasonable `10x10du`;15x15 Normal `15x15dn`;15x15 Unreasonable `15x15du`。

### Filling(`filling.c`)

默认参数 `13x9`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `13` |
| 1 | string | `Height` | `9` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`filling.c`):
  - ≥ 1(188)
- **本仓库的表**:1..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`filling.c`):
  - ≥ 1(189)
- **本仓库的表**:1..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

预设:9x7 `9x7`;13x9 `13x9`;17x13 `17x13`。

### Keen(`keen.c`)

默认参数 `6dn`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Grid size` | `6` |
| 1 | choices | `Difficulty` | 1(0 Easy / 1 Normal / 2 Hard / 3 Extreme / 4 Unreasonable) |
| 2 | boolean | `Multiplication only` | false |

#### `Grid size`(整数)

- **语义**:拉丁方阶数
- **上游**(`keen.c`):
  - 3..9(227)
- **本仓库的表**:3..9
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..9(7 个)

预设:4x4 Easy `4de`;5x5 Easy `5de`;5x5 Easy, multiplication only `5dem`;6x6 Easy `6de`;6x6 Normal `6dn`;6x6 Normal, multiplication only `6dnm`;6x6 Hard `6dh`;6x6 Extreme `6dx`;6x6 Unreasonable `6du`;9x9 Normal `9dn`。

### Towers(`towers.c`)

默认参数 `5de`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Grid size` | `5` |
| 1 | choices | `Difficulty` | 0(0 Easy / 1 Hard / 2 Extreme / 3 Unreasonable) |

#### `Grid size`(整数)

- **语义**:拉丁方阶数
- **上游**(`towers.c`):
  - 3..9(250)
- **本仓库的表**:3..9
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..9(7 个)

预设:4x4 Easy `4de`;5x5 Easy `5de`;5x5 Hard `5dh`;6x6 Easy `6de`;6x6 Hard `6dh`;6x6 Extreme `6dx`;6x6 Unreasonable `6du`。

### Singles(`singles.c`)

默认参数 `5x5de`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `5` |
| 1 | string | `Height` | `5` |
| 2 | choices | `Difficulty` | 0(0 Easy / 1 Tricky) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`singles.c`):
  - 宽高都 ≥ 2(265)
  - ≤ 62(267:10+26+26 个可用符号)
- **本仓库的表**:2..62
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:2..62(61 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`singles.c`):
  - 同上
- **本仓库的表**:2..62
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:2..62(61 个)

预设:5x5 Easy `5x5de`;5x5 Tricky `5x5dk`;6x6 Easy `6x6de`;6x6 Tricky `6x6dk`;8x8 Easy `8x8de`;8x8 Tricky `8x8dk`;10x10 Easy `10x10de`;10x10 Tricky `10x10dk`;12x12 Easy `12x12de`;12x12 Tricky `12x12dk`。

### Magnets(`magnets.c`)

默认参数 `6x5dtS`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `6` |
| 1 | string | `Height` | `5` |
| 2 | choices | `Difficulty` | 1(0 Easy / 1 Tricky) |
| 3 | boolean | `Strip clues` | true |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`magnets.c`):
  - 宽高都 ≥ 2(238-239)
  - Tricky(下标 1)时宽或高 ≥ 5(242-244)
  - Easy 时宽或高 ≥ 3(246-247)
- **本仓库的表**:2..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`magnets.c`):
  - 同上
- **本仓库的表**:2..100;宽不够时从 3(Tricky:5)起
- **依赖**:看宽和「Difficulty」;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:2..100(99 个)

预设:6x5 Easy `6x5de`;6x5 Tricky `6x5dt`;6x5 Tricky, strip clues `6x5dtS`;8x7 Easy `8x7de`;8x7 Tricky `8x7dt`;8x7 Tricky, strip clues `8x7dtS`;10x9 Tricky `10x9dt`;10x9 Tricky, strip clues `10x9dtS`。

### Signpost(`signpost.c`)

默认参数 `4x4c`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `4` |
| 1 | string | `Height` | `4` |
| 2 | boolean | `Start and end in corners` | true |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`signpost.c`):
  - 宽高都 ≥ 1(432-433)
  - full:不能 1×1(436)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`signpost.c`):
  - 同上
- **本仓库的表**:1..100;宽 1 时从 2 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

预设:4x4 `4x4c`;4x4, free ends `4x4`;5x5 `5x5c`;5x5, free ends `5x5`;6x6 `6x6c`;7x7 `7x7c`。

### Range(`range.c`)

默认参数 `9x6`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `9` |
| 1 | string | `Height` | `6` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`range.c`):
  - 宽高都 ≥ 1(921-922)
  - 宽 + 高 − 1 ≤ 127(923:格数类型是 signed char)
  - full:2×2、1×2、2×1、1×1 生成不了(927-930)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`range.c`):
  - 同上
- **本仓库的表**:1..min(100, 128−宽);宽 ≤ 2 时去掉 1 和 2
- **依赖**:看宽;宽变大时被夹(宽 100 时高最多 28);**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

预设:9 x 6 `9x6`;12 x 8 `12x8`;13 x 9 `13x9`;16 x 11 `16x11`。

### Pearl(`pearl.c`)

默认参数 `8x8dt`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `8` |
| 1 | string | `Height` | `8` |
| 2 | choices | `Difficulty` | 1(0 Easy / 1 Tricky) |
| 3 | boolean | `Allow unsoluble` | false |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`pearl.c`):
  - 宽高都 ≥ 5(288-289)
  - Tricky(下标 1)时宽 + 高 ≥ 11(294)
- **本仓库的表**:5..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:5..100(96 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`pearl.c`):
  - 同上
- **本仓库的表**:5..100;Tricky 且宽 5 时从 6 起
- **依赖**:看宽和「Difficulty」;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:5..100(96 个)

预设:6x6 Easy `6x6de`;6x6 Tricky `6x6dt`;8x8 Easy `8x8de`;8x8 Tricky `8x8dt`;10x10 Easy `10x10de`;10x10 Tricky `10x10dt`;12x8 Easy `12x8de`;12x8 Tricky `12x8dt`。

### Undead(`undead.c`)

默认参数 `4x4dn`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `4` |
| 1 | string | `Height` | `4` |
| 2 | choices | `Difficulty` | 1(0 Easy / 1 Normal / 2 Tricky) |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`undead.c`):
  - 宽高都 ≥ 3(216-217)
  - 宽 ≤ ⌊54/高⌋,即面积 ≤ 54(218)
- **本仓库的表**:3..18
- **依赖**:主;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..18(16 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`undead.c`):
  - 同上
- **本仓库的表**:3..⌊54/宽⌋
- **依赖**:看宽;宽变大时被夹;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..13(11 个)

预设:4x4 Easy `4x4de`;4x4 Normal `4x4dn`;4x4 Tricky `4x4dt`;5x5 Easy `5x5de`;5x5 Normal `5x5dn`;5x5 Tricky `5x5dt`;7x7 Easy `7x7de`;7x7 Normal `7x7dn`。

### Unruly(`unruly.c`)

默认参数 `8x8dt`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `8` |
| 1 | string | `Height` | `8` |
| 2 | boolean | `Unique rows and columns` | false |
| 3 | choices | `Difficulty` | 0(0 Trivial / 1 Easy / 2 Normal) |

#### `Width`(整数)

- **语义**:棋盘宽(必须是偶数)
- **上游**(`unruly.c`):
  - 宽高都是偶数(289)
  - ≥ 6(291)
- **本仓库的表**:6, 8, …, 100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:6, 8, …, 100(步长 2,48 个)

#### `Height`(整数)

- **语义**:棋盘高(偶数)
- **上游**(`unruly.c`):
  - 同上
  - 「Unique rows and columns」时:宽 2n 则高 ≤ A177790[n],反之亦然(295-323);表到 n = 23 为止,更宽不设限
- **本仓库的表**:6, 8, …, 100;unique 时按表夹:宽 6 → 高 ≤ 14,宽 8 → ≤ 34,宽 10 → ≤ 84,宽 ≥ 12 不限;同时高 6 → 宽 ≤ 14 等
- **依赖**:看宽和开关;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:6, 8, …, 100(步长 2,48 个)

预设:8x8 Trivial `8x8dt`;8x8 Easy `8x8de`;8x8 Normal `8x8dn`;10x10 Easy `10x10de`;10x10 Normal `10x10dn`;14x14 Easy `14x14de`;14x14 Normal `14x14dn`。

### Flood(`flood.c`)

默认参数 `12x12c6m5`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `12` |
| 1 | string | `Height` | `12` |
| 2 | string | `Colours` | `6` |
| 3 | string | `Extra moves permitted` | `5` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`flood.c`):
  - 面积 ≥ 2(220)
  - 宽高都 ≥ 1(222)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`flood.c`):
  - 同上
- **本仓库的表**:1..100;宽 1 时从 2 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Colours`(整数)

- **语义**:颜色数
- **上游**(`flood.c`):
  - 3..10(226,MAXCOLOURS)
- **本仓库的表**:3..10
- **依赖**:—;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:3..10(8 个)

#### `Extra moves permitted`(整数)

- **语义**:在最优步数之上额外允许的步数
- **上游**(`flood.c`):
  - ≥ 0(228)
  - 无上限
- **本仓库的表**:0..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:0..100(101 个)

预设:12x12 Easy `12x12c6m5`;12x12 Medium `12x12c6m2`;12x12 Hard `12x12c6m0`;16x16 Medium `16x16c6m2`;16x16 Hard `16x16c6m0`;12x12, 3 colours `12x12c3m0`;12x12, 4 colours `12x12c4m0`。

### Train Tracks(`tracks.c`)

默认参数 `8x8dt`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `8` |
| 1 | string | `Height` | `8` |
| 2 | choices | `Difficulty` | 1(0 Easy / 1 Tricky / 2 Hard) |
| 3 | boolean | `Disallow consecutive 1 clues` | true |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`tracks.c`):
  - 宽高都 ≥ 4(202)
- **本仓库的表**:4..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:4..100(97 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`tracks.c`):
  - 同上
- **本仓库的表**:4..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:4..100(97 个)

预设:8x8 Easy `8x8de`;8x8 Tricky `8x8dt`;10x8 Easy `10x8de`;10x8 Tricky `10x8dt`;10x10 Easy `10x10de`;10x10 Tricky `10x10dt`;10x10 Hard `10x10dh`;15x10 Easy `15x10de`;15x10 Tricky `15x10dt`;15x15 Easy `15x15de`;15x15 Tricky `15x15dt`;15x15 Hard `15x15dh`。

### Palisade(`palisade.c`)

默认参数 `5x5n5`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Width` | `5` |
| 1 | string | `Height` | `5` |
| 2 | string | `Region size` | `5` |

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`palisade.c`):
  - 宽高都 ≥ 1(169-170)
- **本仓库的表**:1..100
- **依赖**:主;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Height`(整数)

- **语义**:棋盘高
- **上游**(`palisade.c`):
  - 区域大小 < 面积 ⇒ 面积 ≥ 2
- **本仓库的表**:1..100;宽 1 时从 2 起
- **依赖**:看宽;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:1..100(100 个)

#### `Region size`(整数)

- **语义**:每个区域的格数 k
- **上游**(`palisade.c`):
  - ≥ 1(168)
  - 整除面积(174)
  - full:≠ 面积(178)
  - full:k = 2 只在宽或高为 1 时可以(181)
- **本仓库的表**:面积的约数,去掉面积本身;宽高都不是 1 时再去掉 2。例:5×5 → {1, 5};8×6 → {1, 3, 4, 6, 8, 12, 16, 24}
- **依赖**:看宽高;棋盘变了吸到最近的约数;**上限来源**:上游自身;**控件**:滑块 + 步进
- **默认参数下的表**:1, 5, …, 5(步长 4,2 个)

> 表不连续,滑块按表的下标走,每一档都是合法约数。

预设:5 x 5, regions of size 5 `5x5n5`;8 x 6, regions of size 6 `8x6n6`;10 x 8, regions of size 8 `10x8n8`;15 x 12, regions of size 10 `15x12n10`。

### Mosaic(`mosaic.c`)

默认参数 `10x10`。控件:

| # | 类型 | label | 初值 |
| --- | --- | --- | --- |
| 0 | string | `Height` | `10` |
| 1 | string | `Width` | `10` |
| 2 | boolean | `Aggressive generation (longer)` | true |

#### `Height`(整数)

- **语义**:棋盘高(上游把高排在宽前面)
- **上游**(`mosaic.c`):
  - 宽高都 ≥ 3(242)
  - 面积 ≤ 10000(245,MAX_TILES)
- **本仓库的表**:3..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

#### `Width`(整数)

- **语义**:棋盘宽
- **上游**(`mosaic.c`):
  - 同上
- **本仓库的表**:3..100
- **依赖**:—;**上限来源**:CAP 100;**控件**:滑块 + 步进
- **默认参数下的表**:3..100(98 个)

> 100×100 = 10000 恰好等于上游的 MAX_TILES,两个封顶重合。

预设:Size: 3x3 `3x3`;Size: 5x5 `5x5`;Size: 10x10 `10x10`;Size: 15x15 `15x15`;Size: 25x25 `25x25`;Size: 50x50 `50x50h0`。

## 四、与上游的出入

本仓库故意比上游窄、或替上游补上漏查的地方。`scripts/check-params.mjs` 的 `EXPECTED_NARROWER` 逐条对应,除此之外的收窄都算 FAIL。

| 游戏 | 出入 | 理由 |
| --- | --- | --- |
| dominosa | 最大点数封顶 98 | 棋盘宽 n+2 ≤ 100;上游只防溢出。 |
| solo | 行数从 1 起 | 上游 validate_params 没查 r 的下限,0 和负数放行,new_game_desc 才出事;r = 1 是 Jigsaw 布局的定义值。 |
| solo | 没勾 Jigsaw 时行数从 2 起,列数封到 order/2 | 上游 r = 1 即 Jigsaw(solo.c:471)。每个控件各自提交之后,勾掉 Jigsaw 送回去的仍是 r = 1,勾选框会自己弹回来,普通棋盘就到不了了;行数从 2 起,settle 在勾掉时把 1 抬成 2。 |
| solo | 二阶(2j、2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像,及二阶 Killer,去掉 | 上游放行但生成不终止:原生 oracle 五个种子各 10 秒全部超时(其它对称、三阶起全部正常)。 |
| loopy | Penrose (kite/dart) 宽高从 4 起,Penrose (rhombs) 从 5 起 | 上游 amin 3。最小尺寸附近生成极慢(五个种子 10 秒全超时,4×9 要 120 秒)且浏览器里撞到过除零 / dsf 断言,引擎当场死掉;取一个把超时格全盖住的矩形。 |
| blackbox | 「最多球数」≤ 宽×高−1 | 上游只查最少 < 格数;最多超过格数时放球循环永不结束。 |
| rect | 扩展因子封顶 5.00、步长 0.05 | 上游只要求非负;缩小后的边不足 2 会钉 2,所以 5 以上和更大的值没有区别(100×100 时 49 以上才完全一样)。 |
| (浮点) | 障碍概率步长 0.01、扩展因子步长 0.05 | 滑块只能取有限个值;上游接受任意小数。Game ID 载进来的表外小数,第一次落定时吸到最近一档。 |
| mines | 不再接受「20%」写法 | 滑块只出绝对雷数,占比作为读数显示;可达的雷数集合不变。 |

## 五、被 CAP 封顶的参数

上游没有上限、本仓库先用 100 封顶的参数。网格维度按「棋盘最多 100×100 格」定,其余计数类是占位,下一阶段逐个定夺;每一个都是游戏文件里的一处 `CAP`,改起来一行。

| 游戏 | 控件 | 语义 | 现在的表 |
| --- | --- | --- | --- |
| Net | `Width` | 棋盘宽(格) | 1..100;勾了「Walls wrap around」和「Ensure unique solution」时去掉 2 |
| Net | `Height` | 棋盘高(格) | 1..100;宽是 1 时从 2 起;wrap+unique 时去掉 2 |
| Cube | `Width / top` | 方格:宽;三角格:六边形的顶边长(d1) | 0..100 里「高取到 100 时放得下」的那些;立方体实际是 2..100 |
| Cube | `Height / bottom` | 方格:高;三角格:另三条边长(d2) | 0..100 里与当前宽一起放得下的那些。例:立方体宽 2 时高 ≥ 4,宽 3 时高 ≥ 3;四面体 (0,3)、(1,2) 可以,(1,1) 不行 |
| Fifteen | `Width` | 棋盘宽 | 2..100 |
| Fifteen | `Height` | 棋盘高 | 2..100 |
| Sixteen | `Width` | 棋盘宽 | 2..100 |
| Sixteen | `Height` | 棋盘高 | 2..100 |
| Sixteen | `Number of shuffling moves` | 打乱用的随机步数;0 = 完全随机排列 | 0..100 |
| Twiddle | `Width` | 棋盘宽 | 2..100 |
| Twiddle | `Height` | 棋盘高 | 2..100 |
| Twiddle | `Number of shuffling moves` | 打乱步数;0 = 完全随机 | 0..100 |
| Rectangles | `Width` | 棋盘宽 | 1..100 |
| Rectangles | `Height` | 棋盘高 | 1..100;宽是 1 时从 2 起 |
| Netslide | `Width` | 棋盘宽 | 2..100 |
| Netslide | `Height` | 棋盘高 | 2..100 |
| Netslide | `Number of shuffling moves` | 打乱步数;0 = 完全随机 | 0..100 |
| Pattern | `Width` | 棋盘宽 | 1..100 |
| Pattern | `Height` | 棋盘高 | 1..100;宽是 1 时从 2 起 |
| Mines | `Width` | 棋盘宽 | 1..100;勾了「Ensure solubility」时 3..100 |
| Mines | `Height` | 棋盘高 | 同宽,再要求宽×高 ≥ 10(宽 1 时高 ≥ 10,宽 3 时高 ≥ 4) |
| Same Game | `Width` | 棋盘宽 | 1..100 |
| Same Game | `Height` | 棋盘高 | 1..100;宽 1 时从 2 起(不保证可解时从 4 起,宽 2 时从 2 起) |
| Flip | `Width` | 棋盘宽 | 1..100 |
| Flip | `Height` | 棋盘高 | 1..100 |
| Guess | `Pegs per guess` | 每次猜的钉数 | 允许重复:2..100;否则 2..颜色数 |
| Guess | `Guesses` | 允许猜的次数 | 1..100 |
| Pegs | `Width` | 棋盘宽 | Cross:{5, 7, 9};Octagon:{7};Random:4..100 |
| Pegs | `Height` | 棋盘高 | Cross:{5, 7, 9},宽 5 时 {7, 9};Octagon:{7};Random:4..100 |
| Dominosa | `Maximum number on dominoes` | 骨牌上的最大点数 n;棋盘 (n+2)×(n+1) 格 | 1..98 |
| Untangle | `Number of points` | 点数 | 4..100 |
| Black Box | `Width` | 棋盘宽 | 2..100 |
| Black Box | `Height` | 棋盘高 | 2..100 |
| Slant | `Width` | 棋盘宽 | 2..100 |
| Slant | `Height` | 棋盘高 | 2..100 |
| Light Up | `Width` | 棋盘宽 | 2..100;「4-way rotational」时 3..100 |
| Light Up | `Height` | 棋盘高 | 2..100;「4-way rotational」时钉在宽;「4-way mirror」且宽 2 时从 3 起 |
| Map | `Width` | 棋盘宽 | 2..100 |
| Map | `Height` | 棋盘高 | 2..100;宽 2 时从 3 起 |
| Loopy | `Width` | 网格宽(单位随网格类型) | amin..100;Penrose (kite/dart) 从 4 起,Penrose (rhombs) 从 5 起 |
| Loopy | `Height` | 网格高 | amin..100;宽 < omin 时从 omin 起;两种 Penrose 同宽的下限 |
| Inertia | `Width` | 棋盘宽 | 2..100 |
| Inertia | `Height` | 棋盘高 | 2..100;宽 2 时从 3 起 |
| Tents | `Width` | 棋盘宽 | 4..100 |
| Tents | `Height` | 棋盘高 | 4..100 |
| Bridges | `Width` | 棋盘宽 | 3..100 |
| Bridges | `Height` | 棋盘高 | 3..100 |
| Galaxies | `Width` | 棋盘宽 | 3..100 |
| Galaxies | `Height` | 棋盘高 | 3..100 |
| Filling | `Width` | 棋盘宽 | 1..100 |
| Filling | `Height` | 棋盘高 | 1..100 |
| Magnets | `Width` | 棋盘宽 | 2..100 |
| Magnets | `Height` | 棋盘高 | 2..100;宽不够时从 3(Tricky:5)起 |
| Signpost | `Width` | 棋盘宽 | 1..100 |
| Signpost | `Height` | 棋盘高 | 1..100;宽 1 时从 2 起 |
| Range | `Width` | 棋盘宽 | 1..100 |
| Pearl | `Width` | 棋盘宽 | 5..100 |
| Pearl | `Height` | 棋盘高 | 5..100;Tricky 且宽 5 时从 6 起 |
| Unruly | `Width` | 棋盘宽(必须是偶数) | 6, 8, …, 100 |
| Unruly | `Height` | 棋盘高(偶数) | 6, 8, …, 100;unique 时按表夹:宽 6 → 高 ≤ 14,宽 8 → ≤ 34,宽 10 → ≤ 84,宽 ≥ 12 不限;同时高 6 → 宽 ≤ 14 等 |
| Flood | `Width` | 棋盘宽 | 1..100 |
| Flood | `Height` | 棋盘高 | 1..100;宽 1 时从 2 起 |
| Flood | `Extra moves permitted` | 在最优步数之上额外允许的步数 | 0..100 |
| Train Tracks | `Width` | 棋盘宽 | 4..100 |
| Train Tracks | `Height` | 棋盘高 | 4..100 |
| Palisade | `Width` | 棋盘宽 | 1..100 |
| Palisade | `Height` | 棋盘高 | 1..100;宽 1 时从 2 起 |
| Mosaic | `Height` | 棋盘高(上游把高排在宽前面) | 3..100 |
| Mosaic | `Width` | 棋盘宽 | 3..100 |

不是网格维度的计数(下一阶段最该先看的):Sixteen / Twiddle / Netslide 的打乱步数、Guess 的钉数(允许重复时)与猜测次数、Untangle 的点数、Flood 的额外步数。

## 六、已知问题

- 生成是同步跑在主线程上的:参数越大,`midend_new_game` 卡住页面的时间越长,滑块一滑到底就能撞上。本阶段只记录,不为耗时调低上限(下一阶段的事)。已知的重灾区:Loopy(尤其 Penrose / Hats / Spectres 网格)、Pattern、Solo 高阶(31 阶 Unreasonable 几乎不会结束)、Mines 大盘 + 多雷、Untangle 100 点、Map 大盘多区域、Bridges / Tracks / Galaxies 100×100。
- 页面卡在生成里时,存档不会写坏:重开页面恢复的是上一局(存档按序列化的局面存,不重新生成)。但「新局」会再生成一次,同样卡。
- 每次松手都开一局:在滑块上用方向键连按,每按一下都生成一局。
- 另一类不是「大」而是「小到无解」的不终止:浏览器探测到 Light Up 3×3、黑格 5%、4 向旋转、难度 Tricky / Hard,Galaxies 3×3 Unreasonable,Solo 2×2 Killer + X,上游生成器死循环重试(lightup.c:1558、galaxies.c:1456)。这几处上游放行、表也放行,本阶段只记录;二阶 Solo 配对称 / Killer 与 Penrose 最小尺寸那几处因为一碰就死,已按第四节收窄。
- Solo 勾了 Jigsaw 之后,行数滑块每拉一档阶数就翻倍(上游语义,C 侧把两数相乘)。表允许,因为上游允许;要不要在界面上钉住行数,留给下一阶段。

## 七、验证

`scripts/check-params.mjs`(何时跑见文件头)把 `vendor/` 的 C 源码和 `scripts/lib/params-oracle.c` 用 gcc 编成 40 个 oracle,不动 vendor 一行,也不生成棋盘,直接调 `custom_params` + `validate_params(full=true)`。对每个游戏做三件事:

1. **覆盖**:每个 string 控件都有申报,每条申报都能按 label 认到控件。
2. **健全**:choices × boolean 的全部组合(超过 96 种抽 96 种)下,按申报顺序把每张表走一遍(大表抽两头、等距、随机共 14 个),走出来的每个组合上游都放行;路上没有空表;settle 对表内组合是 no-op;另从随机乱值出发 settle 之后上游也放行。
3. **紧**:表外一格(下界减一、上界加一、表中间的洞)按界面做法钉住、后面的参数照 settle 落定,上游若放行就是「比上游窄」——只有第四节登记过的算预期。

最近一次全量结果(耗时 20 秒):

| 游戏 | 结果 | 固定组合 | 走过的组合 | 表外探针 | 预期的收窄 |
| --- | --- | --- | --- | --- | --- |
| net | ok | 4 | 10470 | 827 | 0 |
| cube | ok | 4 | 819 | 22 | 0 |
| fifteen | ok | 1 | 202 | 14 | 0 |
| sixteen | ok | 1 | 2473 | 14 | 0 |
| twiddle | ok | 4 | 89105 | 1512 | 0 |
| rect | ok | 2 | 5130 | 398 | 369 |
| netslide | ok | 2 | 70432 | 401 | 0 |
| pattern | ok | 1 | 203 | 14 | 0 |
| solo | ok | 96 | 5586 | 2027 | 512 |
| mines | ok | 2 | 5028 | 449 | 0 |
| samegame | ok | 4 | 5541 | 1511 | 0 |
| flip | ok | 2 | 402 | 28 | 0 |
| guess | ok | 4 | 4711 | 395 | 0 |
| pegs | ok | 3 | 257 | 33 | 0 |
| dominosa | ok | 5 | 187 | 10 | 5 |
| untangle | ok | 1 | 37 | 1 | 0 |
| blackbox | ok | 1 | 26778 | 551 | 179 |
| slant | ok | 2 | 400 | 28 | 0 |
| lightup | ok | 15 | 31768 | 2543 | 0 |
| map | ok | 4 | 9979 | 877 | 0 |
| loopy | ok | 72 | 15246 | 1055 | 119 |
| inertia | ok | 1 | 202 | 14 | 0 |
| tents | ok | 2 | 401 | 28 | 0 |
| bridges | ok | 96 | 20361 | 1409 | 0 |
| unequal | ok | 10 | 370 | 20 | 0 |
| galaxies | ok | 2 | 403 | 28 | 0 |
| filling | ok | 1 | 203 | 14 | 0 |
| keen | ok | 10 | 310 | 20 | 0 |
| towers | ok | 4 | 124 | 8 | 0 |
| singles | ok | 2 | 399 | 56 | 0 |
| magnets | ok | 4 | 819 | 57 | 0 |
| signpost | ok | 2 | 402 | 28 | 0 |
| range | ok | 1 | 198 | 22 | 0 |
| pearl | ok | 4 | 820 | 57 | 0 |
| undead | ok | 3 | 216 | 69 | 0 |
| unruly | ok | 6 | 1173 | 1185 | 0 |
| flood | ok | 1 | 19735 | 372 | 0 |
| tracks | ok | 6 | 1241 | 86 | 0 |
| palisade | ok | 1 | 1405 | 2400 | 0 |
| mosaic | ok | 2 | 403 | 28 | 0 |

界面层的链路(滑块写回字符串 → dialogOk → 新局)由 `scripts/check-custom.mjs` 用 playwright 走一遍,见第八节。

## 八、实现

范围模型落地为控件,动到的文件:

- `src/pages/puzzle/ParamField.tsx`:范围模型驱动的数字行。滑块按表的下标走,两侧 −/+ 单步,读数在行尾;区间型两行(最少 / 最多)。拖动只改读数,原生 change 才落定,方向键每按一下落定一次。
- `src/pages/puzzle/ConfigFields.tsx`:拿到范围模型后,有申报且表非空的 string 控件交给 ParamField;每次落定(滑块、步进、checkbox、select、回落的文本框)先 `settle` 再提交。没给模型的调用方(偏好面板、模态对话框)行为不变。
- `src/pages/puzzle/PuzzleTypes.tsx` / `PuzzleHost.tsx`:把当前游戏的 `types.params` 传进面板;参数列表常驻,选中态只认引擎报的那条预设(不命中就一条都不选),点预设走「让位、换参数、再要一份」三步。
- `src/ui/Dock.tsx` / `useMedia.ts`:够宽的桌面上类型面板停靠成右侧栏(360px),棋盘让出宽度而不是被盖住;非模态,面板开着照样能走子。
- `src/index.css`:`.sheet-custom .dialog-param*`,颜色全部走 tokens,两种主题同一套规则。
- `src/i18n/en.json` / `zh.json`:`types.min` / `max` / `decrease` / `increase` 四个键(区间小标与步进按钮的读法)。
- `scripts/check-custom.mjs`:playwright 走真实链路——四十个游戏的自定义面板没有文本框、动一档即开新局、Mines 缩到最小雷数被夹、Twiddle 宽降到 2 旋转块跟着降、Black Box 最少拉过最多时最多跟上、Mines 翻 Ensure solubility 时宽从 1 回到 3、步进按钮加一,全程不出错误 Notice。
- `scripts/build-params-doc.mjs`:本文档的生成器,手写源在 `scripts/lib/params-doc.mjs`;第七节的结果表每次生成时当场跑 check-params 得到。
