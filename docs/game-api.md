# 统一游戏接口

四十个游戏,一套接口。这份文档回答两个问题:**能不能做**,和**大概怎么做**。
它是设计,不是现状——现状在 `docs/keys.md`(按键)和 `docs/inputs.md`(上游输入)。
落地之前这份文档说的都还没有发生。

---

## 一、结论:能,但先把「没有写死的代码」切成三块

三块的答案不一样,合在一起谈会得出错的结论。

| | 能不能 | 说明 |
| --- | --- | --- |
| **① 宿主里一个游戏名都不出现**(`PuzzleHost` / `PuzzleKeypad` / `renderer` / `usePuzzlePointer`) | **能** | 这是主要收益,也是最难的那一半 |
| **② 一个游戏的全部事实收进一条记录** | **能** | 现在散在 **20 张表 + 10 处函数内的名字比较 + 5 处宿主分支** |
| **③ 项目里没有任何逐游戏的代码** | **不能,也不该要** | cube 的几何、map 的存档门、`marks/` 的候选求解、palisade 的读画面是**算法**,不是数据 |

第三条要说清楚,因为它是这个设计里唯一的取舍:**接口能做的不是消灭这些代码,是给它们一个
声明过的插槽**,让宿主之外没有任何地方说得出「cube」这个词。代码还在,但它在 cube 自己的
记录里,由宿主按插槽名调用。

还要先说的一句:**总代码量不会变少**(估计 ±10%)。这是**位置**的重构,不是**规模**的重构。
真正的收益有两条,都不是行数:

1. **一个游戏 = 一个地方。** 现在改 map 要碰 10 个文件位置,改 pearl 要碰 7 个,改 palisade
   要碰 8 个(下面有清单)。升级上游或加第 41 个游戏时,这个数字就是成本。
2. **跨游戏的不变量第一次可以被机器检查。** `docs/keys.md`「会安静地坏掉的」第 2 条——`BOTH`
   是手写的,漏一条不报错,只让某个按钮承诺它做不到的事——之所以只能靠人记,是因为
   `BOTH` 和 `faces` 分在两张表里,没有任何一处同时看得见两者。收进一条记录之后,
   「每个用 `faces` 的游戏,它 `current_key_label` 会报的词都在 `words` 里、两键可能同时报的
   都在 `both` 里」变成一句可执行的断言。`scripts/verify-palette.mjs` 已经是这个模式的先例。

---

## 二、现状盘点:一个游戏现在散在几处

### 2.1 按游戏名索引的表(20 张)

| 文件 | 表 | 管什么 | 条目数 |
| --- | --- | --- | --- |
| `keys.ts:98` | `RULES` | 第 2 类键(独立键盘排) | 15 |
| `keys.ts:567` | `CURSOR_KEYS` | 第 1 类键(光标伴生) | 35 |
| `keys.ts:411` | `WORDS` | 这个游戏的 `current_key_label` 词汇表 | 21 |
| `keys.ts:443` | `SECOND` | 哪些词表示第二层菜单开着 | 4 |
| `keys.ts:526` | `BOTH` | 两键可能同时报出的词(抹空还原) | 3 |
| `keys.ts:465` | `SILENT` | 后端一个标签都不报,豁免置灰 | 2 |
| `keys.ts:361` | `CURSOR_LIFE` | 哪些键把光标副本叫醒 | 6 |
| `keys.ts:547` | `WAITING` | rect 的「开了没动」伪词 | 1 |
| `keys.ts:203` | `READS_PREFS` | 键盘长相要问偏好设置 | 3 |
| `keys.ts:205` | `NO_ARROWS` | 不给方向键块 | 1 |
| `keys.ts:207` | `PAD_ONLY` | 键盘排取代整个方向键块 | 1 |
| `keys.ts:213` | `KEYS_WITH_ARROWS` | 键盘排跟方向键开关一起来去 | 1 |
| `keys.ts:226` | `EIGHT_WAY` | 八向方向键 | 1 |
| `keys.ts:947` | `HOLD_BUTTON` | 长按发哪个鼠标键 | 1 |
| `palette.ts:11` | `SEMANTIC` | 深色下不许翻面的语义槽 | 9 |
| `palette.ts:23` | `RIM` | 同色填充时借哪个槽当描边 | 1 |
| `palette.ts:27` | `FIGURE` | 背景槽兼第二职的游戏 | 1 |
| `palette.ts:34` | `BOARD_IS_PAPER` | 棋盘就是画纸,要给语义槽让位 | 3 |
| `palette.ts:37` | `BEVEL` | 亮面/暗面成对,翻面后要交换 | 10 |
| `marks/index.ts:16` | `READERS` | 拉丁方家族的存档读取器 | 5 |

### 2.2 函数体内的名字比较(10 处,全在 `keys.ts`)

`heads`(guess)、`shovesTiles`(sixteen)、`opener`(signpost / rect)、`opens`(rect /
signpost)、`dragWalked`(pearl)、`mine`(pearl / signpost)、`cursorKeys`(palisade)。

这些比表更麻烦:表是数据,加一行就行;这些是**状态机的分支**,每加一个游戏都要改函数本体,
而且改错了 build 照样绿。

### 2.3 宿主里的分支(5 处)

`PuzzleHost.tsx:166`(map 的 `mapSize`)、`:169`(tents 的 `tentsGrid`)、`:254`(cube 的
`rolls`)、`:259`(tents 的 `squareAt`)、`:695`(palisade 的 `renderer.watch`)。
外加 `:422` 的 `HOLD_BUTTON[name]`。

### 2.4 后果:改一个游戏要碰几处

| 游戏 | 处数 | 分别在哪 |
| --- | --- | --- |
| **map** | 10 | `RULES` · `CURSOR_KEYS` · `CURSOR_LIFE` · `KEYS_WITH_ARROWS` · `asMaybes` · `engine/map.ts` · 宿主 `grid` · 宿主 `paint` · 宿主 `clues`/`onClue` effect · i18n |
| **palisade** | 8 | `CURSOR_KEYS` · `SILENT` · `READS_PREFS` · `cursorKeys` 的 `CURSOR_MODE` 分支 · `engine/palisade.ts` · 宿主 `watch` · `laid`/`buries` · `KeyLabels.stand` 字段 |
| **pearl** | 7 | `RULES` · `CURSOR_KEYS` · `WORDS` · `SECOND` · `dragWalked` · `mine` 的 `UNTRODDEN` · `palette.RIM` |
| **guess** | 7 | `RULES` · `PAD_ONLY` · `heads` · `CURSOR_LIFE` · 宿主 `typed` · `palette.SEMANTIC` · i18n |

**注意 `KeyLabels` 那个字段。** `keys.ts:353` 的 `KeyLabels` 类型里有 `opened`、`walked`、
`stand` 三个字段,分别只为 rect/signpost、pearl、palisade 存在——**一个游戏的私有状态长进了
所有游戏共用的类型**。这是现在这套结构最清楚的一个信号:它已经装不下第 41 个游戏了。

---

## 三、接口设计

### 3.1 一句话形状

一个游戏是**一条记录**,记录里是**一组扁平的插槽**。宿主只认插槽,不认游戏。

```ts
export interface GameSpec {
  name: string
  // …以下每个槽都可省;省了就用默认实现
}

export const SPECS: Record<string, Partial<GameSpec>> = { … }
export const specOf = (name: string): GameSpec => ({ ...DEFAULTS, ...SPECS[name], name })
```

**默认值是真的默认值,不是「空」。** 二十几个游戏是「两个光标键,脸从标签解出来」这一种,
它们的记录只有 `cursorKeys` 一个槽有内容,其余全走默认。宿主渲染时不知道自己在渲染谁。

### 3.2 数据槽 / 行为槽的分界

这是整个设计的骨头。**一个槽要么是值,要么是函数,不许中间态。**

- **值**(可以被 `scripts/` 里的检查器读、比、算不变量)——能是值的一律是值。
- **函数**(检查器只能调用,不能推理)——只在「这件事本质上是算法」时才用。

现在的 `keysFollowArrows(name)` 这种「函数包着一张表」的写法两头不靠:它长得像行为,
其实是数据,于是既不能被检查也不能被组合。设计里全部还原成值。

### 3.3 插槽清单(29 个,分 11 组)

#### A. 身份(1)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `name` | `string` | —— | —— |

`displayName` / `objective` / `description` 留在 `games.json`(生成物,上游的话),
不进这条记录。

#### B. 键盘排——第 2 类键(3)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `keypad` | `(p: Params) => KeyLabel[] \| null` | `() => []` | `RULES` |
| `keypadFollowsArrows` | `boolean` | `false` | `KEYS_WITH_ARROWS` |
| `keypadReplacesArrows` | `boolean` | `false` | `PAD_ONLY` |

`Params` = `{ gameId, params, prefs }`,即现在 `RULES` 的两个入参加上未解析的原串。
`keypad` 是函数,因为它要按棋盘尺寸生成 N 个数字键——这是真算法,不是表。

#### C. 方向键块(3)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `arrowWays` | `0 \| 4 \| 8` | `4` | `NO_ARROWS`(0) · `EIGHT_WAY`(8) |
| `arrowLive` | `(v: View, dir: Dir) => boolean` | `() => true` | cube 的 `rolling` 置灰 |
| `arrowFace` | `(v: View, dir: Dir) => IconName` | 方向箭头 | sixteen 的推块 · pattern 的刷 |

#### D. 光标伴生键——第 1 类(2)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `cursorKeys` | `(p: Params) => CursorKey[]` | `() => []` | `CURSOR_KEYS` + palisade 的 `CURSOR_MODE` 分支 |
| `keyLive` | `(v: View, k: Key) => boolean` | 见下 | 宿主的 `dead()` |

`CursorKey` 现有的字段(`faces` / `does` / `instead` / `twice` / `switches` / `primes` /
`brush` / `sweeps` / `lit` / `holds` / `replaces` / `level` / `offCursor`)**原样保留**。
它们已经是一套接口了,而且是被四十个游戏逐个验证过的一套——这次重构不动它们,只是给它们
换个住处。`keys.md`「机制」一节就是它们的规格说明书。

#### E. 标签通道(4)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `words` | `readonly string[]` | `[]` | `WORDS` |
| `both` | `readonly string[]` | `[]` | `BOTH` |
| `second` | `readonly string[]` | `[]` | `SECOND` |
| `wordAt` | `(v: View, k: CursorKey) => string` | 读标签 + `both` 还原 | `mine` · `WAITING` · `SILENT` |

`wordAt` 是唯一必须是函数的一个:rect 的 `PENDING`、signpost 的 `IDLING`、pearl 的
`UNTRODDEN` 是「标签之外再叠一位自留状态」算出来的伪词。默认实现覆盖三十几个游戏,
三个游戏各写四行。

`SILENT`(untangle / palisade 的标签是 `NULL`)在设计里**不再是名单**,而是
`words: []` 的自然后果——没有词汇表就没有「这个词我不认识」这回事。这条顺手拆掉了一处
特判。

#### F. 自留状态(memo)——5 个事件钩子

**这是让宿主变成游戏无关的关键一步,也是设计里最实的一块。**

现在宿主有 33 个 `useState` 和 19 个 `useRef`,其中 **15 个是逐游戏的**:`awake` `opened` `walked` `stand`
`spot` `typed` `maybe` `sweeping` `brush` `clues` `onClue` `held` `primed` `left` `rolling`。
每一个都带着自己的更新时机,散在 `onKeyDown`、`sendKey`、`pressKey`、`onPointerDownCapture`、
`onPermalinks`、`onUndoRedo` 里。

把它们收成**一个不透明的 `memo`,由游戏自己声明的 reducer 更新**。事件只有五种,数出来的:

| 槽 | 何时调用 | 现在对应 |
| --- | --- | --- |
| `memo0` | 挂载 / 新局 | `useState` 的初值 |
| `onKey(m, key, mods, v)` | 每次按键(键盘 + 我们的按钮) | `wakesCursor` · `opens` · `dragWalked` · `stepCursor` · `heads` 的加减 |
| `onPoint(m, v)` | 棋盘上按下指针 | `setAwake(false)` · `setTyped(0)` |
| `onLabels(m, labels)` | `onKeyLabels` 到达 | `opener` |
| `onDeal(m)` | `onPermalinks`(新局/换预设/读档) | `setAwake(false)` · `spot` 归零 · `setTyped(0)` |

宿主只做一件事:`memo = spec.onKey(memo, …)`。它不知道 memo 里装的是「醒着没有」还是
「这一行打了几枚」。

**顺带解决 `KeyLabels` 被污染的问题**:`opened` / `walked` / `stand` 从公共类型里搬进各自
游戏的 memo,`KeyLabels` 回到 `{enter, space}` 两个字段。

#### G. 传感器——从存档/画面读事实(1 个槽,3 种时机)

```ts
sensors?: { at: 'deal' | 'move' | 'frame'; read(io: Io, m: Memo): unknown }[]
```

三种时机是数出来的,不是留余量:

| `at` | 挂在哪 | 谁在用 |
| --- | --- | --- |
| `deal` | `onPermalinks` | map 的线索表(`readClues`)· map/tents 的网格尺寸 |
| `move` | `onUndoRedo` + `onReady` | 数字键角标(`remaining`)· cube 的可滚方向(`rolls`)· tents 的脚下值(`squareAt`) |
| `frame` | `renderer.watch` | palisade 的光标框(`readStand`) |

`Io` = `{ api, renderer }`。传感器**只读**:`marks/` 和 `engine/tents` 的读取都不重建
`game_ui`,光标不丢(见 `keys.md`「存档门的只读半边」)。这条约束要写进 `Io` 的类型注释,
因为违反它不会报错,只会让光标在玩家眼皮底下跳回原点。

#### H. 执行器——走存档门写走子(1)

```ts
actions?: Record<string, (io: Io, m: Memo, arg?: unknown) => void>
```

取代宿主的 `ACTIONS` 表(`PuzzleHost.tsx:81`)和 `paint()`。键上的 `action: 'possible'`
和 `paints: {colour}` 统一成 `runs: { action: string; arg?: unknown }`,查的是**这个游戏
自己的** `actions`。宿主不再 import `fillMarks` / `paintRegion`。

#### I. 偏好设置(2)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `readsPrefs` | `boolean` | `false` | `READS_PREFS` |
| `prefKeys` | `readonly PrefMatch[]` | `[]` | `MONSTERS` · `LABELLED` · `CURSOR_MODE` 三个散落的常量 |

`PrefMatch` 保留现在 `preference()` 的「按答案列表逐项匹配、不按名字」的判据
(`keys.ts:50` 的注释),只是把三个游戏各自的答案表搬进各自的记录。

#### J. 指针(1)

| 槽 | 类型 | 默认 | 取代 |
| --- | --- | --- | --- |
| `holdButton` | `number` | `2`(右键) | `HOLD_BUTTON` |

`keys.md` 有一句必须跟着搬过来:**往名单里写和默认值相同的记录,名单就开始说谎。**
在新结构里这变成一条可检查的断言(见 §5.2)。

#### K. 调色板(5)

| 槽 | 类型 | 取代 |
| --- | --- | --- |
| `semantic` | `readonly number[]` | `SEMANTIC` |
| `rim` | `Record<number, number>` | `RIM` |
| `figure` | `readonly number[]` | `FIGURE` |
| `boardIsPaper` | `boolean` | `BOARD_IS_PAPER` |
| `bevel` | `readonly (readonly [number, number])[]` | `BEVEL` |

`CanvasRenderer` 的构造从 `(canvas, name)` 改成 `(canvas, palette)` —— 引擎层的最后一处
按名字查表就此消失。`verify-palette.mjs` 改成从记录里读同样的五个槽,断言一条不改。

**合计 29 个槽。** 其中值 15 个、函数 14 个。

### 3.4 宿主变成什么样

```ts
const spec = specOf(name)          // 唯一一次提到 name
const [memo, dispatch] = useReducer(memoOf(spec), spec.memo0)
const view = { labels, prefs, params, memo, sensors }

// 渲染:一排按钮,每个按钮问四个问题
keys.map((k) => ({
  icon:     spec.faceOf(view, k).icon,
  label:    t.play.cursor[spec.faceOf(view, k).says],
  disabled: !spec.keyLive(view, k),
  onClick:  () => spec.press(view, k),
}))
```

`PuzzleHost` 现在 1114 行,估计能落到 400 行上下,而且剩下的全是**和游戏无关**的东西:
wasm 生命周期、对话框借用、存档、主题、菜单、错误提示。这些本来就是它该做的事。

---

## 四、可行性:拿最难的八个过一遍

不逐个走一遍,「设计能覆盖」就只是一句话。挑的是八个各自破坏一条常规的游戏。

| 游戏 | 它破坏了什么 | 用哪些槽 |
| --- | --- | --- |
| **guess** | 整块方向键不画;要记「这一行打了几枚」;颜色键先把光标夹边走位再发数字 | `keypadReplacesArrows` + `memo0/onKey/onPoint/onDeal`(`typed`)+ `keypad`(现有 `aims`/`advances`/`restarts` 字段原样)+ `prefKeys`(`LABELLED`) |
| **map** | 四个颜色键是我们发明的;走存档门写走子;要记一份光标坐标;线索格上置灰 | `keypad` + `keypadFollowsArrows` + `actions.paint` + memo(`spot`/`maybe`)+ `sensors[at:'deal']`(线索表)+ `keyLive` |
| **sixteen** | 一个键四张脸;锁上时**方向键**换图标 | `cursorKeys.faces`(现成)+ `arrowFace` |
| **rect** | 「开了没动」这个状态标签说不出,要自己记是哪个键开的 | `onLabels`(即现在的 `opener`)+ `wordAt` 造 `PENDING` |
| **pearl** | 起笔后走没走过格,标签说不出、存档不带;两层菜单;一次性上膛键 | `onKey`(`walked`)+ `wordAt` 造 `UNTRODDEN` + `second` + `CursorKey.primes`(现成) |
| **palisade** | 后端一个标签都不报;键的死活从**每一帧画面**里读;Full-grid 下一个键都不给 | `words: []` + `sensors[at:'frame']` + `cursorKeys` 读 `prefKeys`(`CURSOR_MODE`)+ `readsPrefs` |
| **pattern** | 粘滞笔刷模式;模式改的是**别的键**;三个颜色键幂等不熄灭 | memo(`sweeping`/`brush`)+ `arrowFace` + `CursorKey.brush`/`lit`(现成) |
| **cube** | 没有光标;某些方向滚不过去要置灰,而判据是一套重写的几何 | `arrowWays: 4` + `arrowLive` + `sensors[at:'move']`(`rolls`)+ `cursorKeys: []` |

**八个全部落在槽里,没有一个需要新机制。** 这不奇怪——这些机制本来就存在,现在只是散着。
设计做的事是给它们**同一个形状**,不是发明新东西。

真正的新东西只有两样:**memo reducer**(把 15 个 state 收成一个)和 **sensor 的三种时机**
(把三处 effect 收成一张表)。两样都只是把已有的写法归位。

### 反向检查:哪些是这套接口**装不下**的

诚实地列出来,比声称覆盖一切有用。

1. **`Icon.tsx` 的字形表和 i18n 的 `CursorWord` 联合类型**。加第 41 个游戏,如果它要一个
   新图标,还是要改 `Icon.tsx` 和两份 i18n。**这是对的,不该改**——图标集是共享词汇,
   不是逐游戏的写死。但要说清楚,免得把它算进「消灭写死」的账里。
2. **`public/engine/<name>.js`** 每个游戏一个 wasm,这是编译产物,按定义逐游戏。
3. **上游行为本身**。这套接口描述的是**呈现**:哪个按钮存在、戴什么脸、灰不灰、按下去发
   什么键。「按下去会发生什么」在 C 里,永远不在这边。
4. **`engine/{map,cube,tents,palisade,marks}` 的算法本体**。搬进插槽,但没有变小,也不会
   合并——它们互相之间没有共同结构,强行抽象只会造出一个假的基类。

---

## 五、实施路线

### 5.1 先做等价性检查,再动一行代码

**这是整条路线里唯一不能调顺序的一步。** 理由在 `docs/keys.md` 里已经写死了:这一块没有
提交进仓库的自动检查,`npm run build` 绿不代表对,而错误的表现(该亮的按钮灰了)读者报不上来。

好消息是:重构后的 `faceOf` / `wouldSend` / `inMenu` / `keysFor` 仍然是**纯函数**,输入是
`(name, labels, prefs, memo, params)`。所以可以不起引擎、不用 playwright,直接穷举:

```
对每个游戏:
  对 labels.enter × labels.space ∈ (WORDS[name] ∪ {''})²:
    对 awake ∈ {true,false}、opened/walked/stand 的每种取值、每套 prefs:
      比较 旧实现 与 新实现 的 (icon, says, on, disabled, 发什么键)
```

四十个游戏,每个游戏的词汇表最多 7 个词,状态空间小到可以整个跑完。**任何一格不一致就是
回归**。这个脚本(`scripts/check-spec.mjs`)在重构开始前写,对着**当前**代码跑一遍存成基线,
之后每一步都对基线跑。它比整个重构本身更重要:没有它,这个重构不该做。

同样要保持绿的:现有四个 `check-*.mjs`(cube / map / clues / palisade)和 `verify-palette`。

### 5.2 顺便把不变量变成断言

有了记录,`verify-palette.mjs` 的模式可以扩到按键这一侧。至少这几条,每条都对应
`keys.md` 里一处「会安静地坏掉的」:

- 每个 `faces` 里出现的词都在 `words` 里(漏了 = 那张脸永远戴不上)。
- 每个游戏,两个光标键的 `faces` 若有交集,交集必须被 `both` 覆盖(`keys.md` §四.2)。
- `second` 里的词对**两个键**都只属于第二层(flood 的 `Advance` 踩过这个坑)。
- `holdButton` 不等于默认值——写默认值进表 = 名单开始说谎(`keys.md`「`HOLD_BUTTON`」)。
- 每个 `says` 在两份 i18n 里都有;每个 `icon` 在 `Icon.tsx` 里都有。
- `keypad` 的返回长度守卫(`MAX_SYMBOLS + MAX_EXTRAS`)对每个游戏的每个合法参数都成立。
- `semantic` / `rim` / `figure` / `bevel` 的现有断言原样搬过来。
- 记录里的每个 `name` 都在 `games.json` 里(这条 `verify-palette` 已经有了)。

`npm run build` 里加一行,和 `verify-palette` 并列。

### 5.3 分步,每步 build 绿 + 基线不动

| 步 | 做什么 | 风险 |
| --- | --- | --- |
| 0 | 写 `check-spec.mjs`,存基线 | 无(只读) |
| 1 | 建 `spec.ts`,把 **20 张表**原样转置进 `SPECS`;老的导出改成从 `SPECS` 派生 | 低,纯搬运,基线守着 |
| 2 | 调色板五个槽接进 `CanvasRenderer`;`verify-palette` 改读 `SPECS` | 低 |
| 3 | 十处函数内的名字比较改成 `wordAt` / `onLabels` 等槽 | **中**,状态机语义,基线是唯一保障 |
| 4 | 15 个逐游戏 state 收成 memo reducer;`KeyLabels` 瘦回两个字段 | **高**,时序敏感(`labelsRef` 那条「读 ref 不读 state」的约束要跟着走) |
| 5 | 五处宿主分支收成 sensors | 中 |
| 6 | `ACTIONS` / `paint` 收成 `actions` | 低 |
| 7 | 删掉过渡期的兼容导出;`keys.md` 的「机制」一节改写成对着槽讲 | 低 |

第 4 步是整条路线的重心。它也是唯一一处适合**先单独提一个 PR**、单独人肉验一遍四十个
游戏的地方——建议真跑一遍,不要只信基线:基线守的是纯函数,而 memo 的错误恰好在时序上,
纯函数看不见。

### 5.4 顺手能还的债

`keys.md`「还没做」里挂着一条机制债,正好在这次的路上:

> `wouldSend` 的返回类型:null 有四个来源(`gated && !awake`、`does` 无人提供、`faces`
> 无脸、`doesNothing`),一个 bit 盖不住,已让 pattern 的 `lit` 出过一次「没光标也全亮」的 bug。

新接口里 `wouldSend` 变成槽,签名本来就要重写。**这时候把返回类型改成带原因的联合类型是
免费的**,过后再改就要动四十个游戏的基线。写进第 3 步。

---

## 六、代价、风险、明确不做的

### 代价

- **行数不减。** `spec.ts` 大概 1200–1600 行(现在 `keys.ts` 971 + 五张调色板表 + 宿主里
  那些分支,量级相当),宿主减 700。净值大约持平。**说它是重构收益的人在骗自己。**
- **多一层间接。** 现在读 `CURSOR_KEYS.pearl` 就看见 pearl 的键;之后要先知道有 `wordAt`
  这个槽,才看得懂 `UNTRODDEN` 从哪来。**列视角会变差**:现在把 `WORDS` 二十二行并排看
  一眼就知道词汇表长什么样,转置之后要写选择器才看得到。缓解办法是留几个派生视图
  (`wordsOf(spec)` 之类)给检查器和人用,别指望「一条记录」能同时是两种视角。
- **一次大改,没有 CI。** 只有 `npm run build`,加上第 0 步自己搭的基线。

### 风险

1. **memo 的时序**(第 4 步)。现在 `onKeyLabels` 是同步的,`api.key()` 一返回标签就已更新
   但 React 还没渲染,所以宿主到处读 `labelsRef` 不读 `labels`(`PuzzleHost.tsx:146`、
   `keys.md`「标签通道」)。reducer 化之后这条约束还在,但藏得更深了。**这是最可能安静
   坏掉的一处。**
2. **传感器的时机**。`readClues` 和 `paintRegion` 必须在**一次同步调用内**做完,中间不能插
   `await` 或分帧(`engine/map.ts:89` 的注释)。sensor 接口不能是 `async`,而且这条要写在
   类型上,不是写在文档里。
3. **过度抽象的诱惑。** 二十九个槽里有十四个函数槽,很容易顺手再抽一层「基类」把 map 和
   palisade 的读取合并。**不要。** 它们唯一的共同点是都读存档,读法完全不同,合并只会造出
   一个每次加游戏都要改的假共性——那正是现在这套结构的病。

### 明确不做

- 不动 `vendor/`(铁律)。
- 不动 `CursorKey` 现有字段的语义。它们被四十个游戏验证过,这次只搬家。
- 不合并 `engine/{map,cube,tents,palisade,marks}` 的算法。
- 不把 `Icon.tsx` / i18n 的联合类型「数据化」。共享词汇就该是共享词汇。
- 不碰 localStorage 的 key、`public/` 的 URL、`sw.js`、`manifest`、`vercel.json`
  (`CLAUDE.md`「已发布,这几样不再免费」)。这次重构完全在 JS/TS 内部,不该碰到任何一条;
  **碰到了就说明走偏了。**

---

## 七、一句话回答

**能实现,而且大半已经在了**——`keys.ts` 的 `RULES` 和 `CURSOR_KEYS` 本来就是「一个游戏一条
记录」的雏形。要做的是**转置**:把二十张按机制分、按游戏索引的表,翻成四十条按游戏分、
把所有机制写全的记录,再把宿主里那十五个逐游戏的 state 收进一个由游戏自己声明的 reducer。

代价是行数持平、列视角变差;收益是宿主里一个游戏名都没有、一个游戏一个地方、跨游戏的
不变量第一次能被机器检查。

**开工的前提只有一条:先写 `scripts/check-spec.mjs` 并存下基线。** 这一块没有 CI,
错误的表现读者报不上来——没有基线,这个重构的期望收益是负的。
