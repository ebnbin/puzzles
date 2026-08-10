# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git:分支 + PR

一个改动一个分支,一个分支一个 PR,合进 `main` 才上线。**不直接 push `main`。**

以前不是这样,而且以前那样是对的:发布之前只有作者自己在用,一个坏提交的代价是自己刷新
一下,所以一切都在 `main` 上直接推。现在 app 在 <https://puzzles.ebnbin.dev/> 上,Vercel
一分钟内就把 `main` 交给真实读者,而站在中间的只有 `npm run build`——它跑不跑全看有没有
人记得。改动先在别处待着,是为了让那道检查跑完、让预览看一眼。

### 一次改动

```bash
git checkout -b <说清楚这次改的是什么>
# 改,提交
npm run build              # 唯一的自动检查。没有 CI,这条要自己跑
git push -u origin <分支名>
# 开 PR
```

分支名说这次改动是什么,不用编号。session 启动时若注入了一个分支名(`claude/xxx`),直接
用它,不必另开——新规矩和它不冲突,这正是它不再需要被覆盖的原因。

**PR 在这里是被授权的。** 这句是写给 Claude Code 看的:它的默认规则是「除非用户明确要求,
否则不要建 PR」,而这份文件就是那个明确要求。

改动落在哪个 PR 里,按「一件事」切,不按提交数——一个 PR 装五到十个提交是正常的。

### 合并

用 **rebase merge**。不要 squash,更不要 merge 提交。这个仓库的提交信息是资产:正文写的
是理由和证据,`git log` 里看得到,squash 会把一串这样的信息压成一条。历史保持线性。

`main` 在底下动了,就 rebase 上去再推:

```bash
git fetch origin main
git rebase origin/main
# 有冲突就解决,然后 git rebase --continue
git push --force-with-lease
```

`--force-with-lease` 而不是 `--force`,而且只对自己的分支。**任何情况下都不要对 `main`
做 force push。**

### 自己合,还是停下来问

检查绿了就自己合,不用等谁批准——单人仓库里自己 approve 自己是仪式,不是检查。真正的检查
是 `npm run build` 和预览页面上的那一眼。

但改到「已经发布了,这几样改起来不再免费」那节列的任何一条,先问:localStorage 的 key、
`public/` 里的 URL、`sw.js` 的 `CACHE`、`manifest.webmanifest` 的 `id`、`vercel.json` 里的
`Cache-Control`。那些是不可逆的,而不可逆正是要有人拍板的理由。

### 预览

PR 的预览地址由 Vercel 给,前提是项目的 Git 集成开着。没开、或者想看没提交的改动,就自己出
一个:`npx vercel`(不带 `--prod`)从当前工作目录构建一个预览,`main` 和线上域名都不受影响。

预览站是另一个 origin,所以 localStorage 和 service worker 缓存都是独立的一份:看到的是新
读者的视角,不是自己的存档。

### 分支不用清理

留着无害,而且本环境的 git 代理对删除远程分支返回 403,删不掉。

## 这是什么

Simon Tatham's Portable Puzzle Collection 的一个 Web 前端:40 个谜题的 C 源码
(`vendor/sgtpuzzles/`,上游工作树的逐字副本)编译成 WebAssembly,外面套一层自己写的
React + TypeScript 界面。上游的 C 一行没动;换掉的只是它的 JavaScript 外壳。

部署在 Vercel(`vercel.json`),纯静态,没有后端。

## 常用命令

```bash
npm run dev             # Vite 开发服务器
npm run build           # verify-palette + tsc --noEmit + vite build,输出 dist/
npm run preview         # 预览 dist/
npm run verify-palette  # palette.ts 的表格不变量(build 的第一步)
npm run verify-doc      # 手册未被改动 + 中英结构一致(需要 halibut)
npm run doc             # 重新生成 public/doc/(需要 halibut)
```

没有测试框架,也没有 linter:`npm run build` 里的 `tsc --noEmit` 和两个 verify 脚本
就是全部的自动检查。但 build 只跑其中一个:`verify-palette` 在里面,`verify-doc` 不在——它要
halibut,而 build 正是 Vercel 每次部署都要跑的那条命令(`vercel.json` 的 `buildCommand`)。
改了 `public/doc/` 得自己跑一次,没人会替你跑。

`node_modules` 不在仓库里,新克隆的第一件事是 `npm install`。跳过它 build 停在
`Cannot find type definition file for 'vite/client'`:那句话在说依赖没装,不是 tsconfig 坏了。

重量级的构建脚本平时**不需要跑**,产物已经提交进仓库:

```bash
./scripts/build-games.sh          # 全套:wasm + 手册 + games.json + 三套图
node scripts/build-tiles.mjs      # 画廊缩略图,需要先起 vite preview,需要 playwright
node scripts/build-howto.mjs      # 玩法弹窗里的完成图,同上;可只跑几个:… net solo mines
node scripts/build-art.mjs        # Undead 键盘上的三个怪物 PNG
node scripts/build-appicon.mjs    # app icon,四个尺寸;不需要起 preview
node scripts/build-shot.mjs       # README 首页截图 + public/og.png,需要先起 vite preview
```

`build-games.sh` 是全套:编两遍 wasm、跑 `build-doc.mjs` 和 `extract-games.mjs`,然后自己
起一个 vite preview 把 tiles/howto/art 重画一遍——三套图是引擎和 `palette.ts` 的照片,升级
上游或改调色板会同时让它们过期,只跑其中一个就是让它们互相漂开。所以它要的不只是
emsdk/cmake/ninja/halibut,还有 playwright。上面单列那几行是改一套图时单独跑用的,不必把
wasm 一起编。

playwright 不在 `package.json` 里,这几个脚本要用时自行安装。`build-appicon.mjs` 只拼两张
已经生成好的缩略图,所以不需要 vite preview,但同样要 playwright;它和 `build-shot.mjs` 都
不在 `build-games.sh` 里,net/cube 的缩略图或画廊的样子变了要自己补跑。只有升级
`vendor/sgtpuzzles`(见 `vendor/UPSTREAM`)或改构建参数时才需要 `build-games.sh`。

还有一个不生成任何东西、只做检查的:

```bash
node scripts/check-cube.mjs       # src/engine/cube.ts 和引擎对不对得上,同样要 preview + playwright
node scripts/check-map.mjs        # map 的调色板落色落在光标那一格,同上
node scripts/check-clues.mjs      # map 的调色板只在能填的格子上亮,同上
```

`src/engine/cube.ts` 把上游的网格几何在这一侧重写了一遍(为了给 cube 滚不过去的那个方向置灰,
理由见 `docs/keys.md`),所以**升级 `vendor/sgtpuzzles` 之后要跑它**。模型漂了会把能按的键灰掉,
而那是唯一一种读者报不上来的故障:错灰的按钮和该灰的按钮长得一模一样。

`check-map.mjs` 检查的是另一种东西。`src/engine/map.ts` **没有**重写上游几何——它试过,而且错
了(见 `docs/keys.md`),现在改成让引擎自己说出光标下是哪个区域。所以那个脚本不比对模型,它按
真按钮再从外面问一遍光标站在哪,两个读数对不上就报。改 `engine/map`、改 `PuzzleHost` 那份光标
副本、或者升级上游之后跑它。

`check-clues.mjs` 是 `check-map.mjs` 的另一半:那个问「按下去有没有落对区域」,这个问「按钮该不该
亮」。`src/engine/map.ts` 判「这一格能不能填」的办法是**录一次发牌局面的重画**——发牌那一刻
「有颜色」和「是线索」是同一件事(map.c:1896-1897),所以棋盘自己画出来的就是那张表。脚本用引擎
对照:先把每个区域都上色,再在每一格按两下选择键(上游自己的「清空这个区域」),能清空的就不是线索。
改 `engine/map` 的线索读取、改 `CanvasRenderer` 的录制、或者升级上游之后跑它。

## 架构

### 一条契约把 C 和 React 隔开

`src/engine/types.ts` 是全部边界:`PuzzleApi` 是界面能对游戏做的事,`PuzzleCallbacks`
是游戏想让界面显示的东西——**以数据形式,不碰 DOM**。

上游的 `emccpre.js` / `emcclib.js` 自己找 DOM、自己建菜单和对话框;这里用
`engine/puzzle-pre.js` 和 `engine/puzzle-lib.js` 替换它们,只把请求转发给宿主对象。
`build-games.sh` 用一份临时副本做这个替换,`vendor/` 保持干净,并且用 `cmp` 校验两次
构建的 `.wasm` 完全一致——换 wrapper 绝不能影响二进制。

`src/engine/createPuzzle.ts` 动态 import `/engine/<name>.js`(MODULARIZE 的 ES module,
每次调用是独立实例),`src/PuzzleHost.tsx` 每次挂载启动恰好一个后端。

几个反复出现的坑,改 `PuzzleHost` 前先读它的注释:后端只有**一个** config box(游戏 ID、
参数、偏好设置共用),所以打开一个就必须有人回答它;StrictMode 下 effect 会跑两遍而 wasm
没有 teardown;`rescale()` 而不是 `resize()`;**后端第一次报的 `onPresetSelected` 是默认
预设**——emcc.c 建菜单时调一次 `select_appropriate_preset()`,那之后才轮到读存档和玩家选,
所以「第一个赢」就拿到了 `default_params()`,类型弹窗上那个「默认」标记全靠它。四十个游戏
里有二十个的默认不是列表第一项(Keen 是十一个里的第五个),所以这个值不能猜。

### 还有一扇门:存档文件(`src/engine/marks/`)

上面那条契约是全部的**接口**,但不是全部的**入口**。`midend_deserialise` 把存档里的每条
`MOVE` 直接交给 `execute_move`,`interpret_move` 完全不在这条路径上(midend.c)。这是唯一
一个能给后端一步棋、而不必先伪造出一个手势的地方——`saveGame()` 拿出来,改,`loadGame()`
放回去。

`src/engine/marks/` 就是走这扇门的。五个有铅笔标记的谜题(Solo、Keen、Towers、Unequal、
Undead)因此多了三个键:

- **`fillMarks`** 读格子里已填的值,写候选:每个空格只留棋盘还没排除的。棋上有任何一个
  候选时它**只做减法**;只有整块棋盘一个候选都没有,它才填。
- **`placeSingles`** 反过来,读候选,写值。两种情况都填:某格候选只剩一个(显式),或者
  某个值在一个组——行、列、宫、对角线——里只剩一个格子的候选还含它(隐式)。
- **`clearMarks`** 全部擦掉,这是让第一个键重新变回「填」的唯一办法。

**前两个必须指向相反方向**,这是设计而不是巧合:谁都喂不到自己,所以连按两次第二次一定
什么都不做;交替按才互相喂。在 `placeSingles` 里重新按规则算一遍候选看起来很自然,恰恰
不能做——那会让它自己就能一直跑下去,也就是这个形状要避免的循环。它只读棋盘上写着的候选。

**线在哪,以及它被挪过一次。** `fillMarks` 那条线没动:它写的候选仍然只是「这一格能是
什么」,从不问「这个数字能去哪」——所以它写的东西不用检查就能信。`placeSingles` 越过了那
条线,是有意的:隐式单候选正是上游最低那档(Solo 的 `DIFF_BLOCK`,叫 Trivial)。两个键
可以给出不同答案,因为它们被信任的程度不同——写错的候选可以擦掉,写错的数字就是写错了。

隐式单候选要成立,三件事缺一不可,少任何一件都会写出**能被规则证明是错的**数字:组里已经
填过的值不再算候选(引擎只清被填格自己的候选,别处的是过期的);组里只要有「空着但一个
候选都没有」的格子就整组跳过(那种格子读起来像什么都不能填,会凭空造出唯一解);一次按
键内部要跑到没有新格子可填为止(否则不幂等)。`scripts` 之外的 guards 检查对这三条各有
一个能复现的用例。

**代价:隐式单候选是非局部的。** 显式单候选只会错在「候选被改坏的那一格」;隐式的读整个
组、写其中一格,所以这里的一个坏候选可能让**另一格**被填错。

走多远(每个预设五局,交替按到停):265 局里解开 **35 → 119**。Solo 的 Trivial 和 Basic
从零变成全解开——这正是手册承诺的那两档;Intermediate 往上仍然停住,因为那要的是关于
「一组格子」的判断,是再下一条线,没有越。Undead 不变,而且不是碰巧:它的 `groups` 是空的。

**还有第四个导出,它不写棋盘。** `remaining` 数「每个值还剩几个没放」,就是数字键角上那个
小数字。它走同一个 reader,但一步棋都不加:读者本来就会自己数,棋快满时尤其会数,这只是
把那份数数接过来。它要 `Board.each`——一个填满的棋盘给每个值几格——四个格子游戏是拉丁方,
所以是 `values.length`;Undead 没有(三种怪物数目各不相同,而且它自己就印在棋盘上方),
于是它的键不带角标。代价是每走一步 serialise + replay 一遍。数到零和负数都不显示:多放了
的那个数字棋盘自己已经画红,角上再来个减号只是一团脏点。铅笔标记不算数——那正是另外三个
键全部建立在其上的区分。

**读不懂就整个拒绝。** 参数不认识、描述解析不了、遇到一条没见过的走子——一律返回 null,
界面什么都不做。猜错比不做坏得多:它会擦掉玩家自己写的候选,还会说某个数字不可能。和
`keys.ts` 认不出 game id 时不显示键盘是同一笔交易。

但**拒绝是会传染的**,这一点在「重新开始」上踩过一次。`RESTART` 是一个留在历史里的状态,
不是一个开关:拒绝它就等于拒绝那之后的每一次按键,那一局的键从此全废。现在它被照常重放
(回到发牌那一刻,`midend_restart_game` 用 DESC 重建,模型也用 DESC)。仍然关着的只有 `S`
——求解器的答案,五个游戏五种写法——所以「先求解、再擦掉一格、再按键」那条路上键仍然是
死的。要在这里再加拒绝之前,先想清楚它会不会像 `RESTART` 那样一直粘着。

**这里没有提交进仓库的自动检查。** `tsc` 只管类型,而这个模块的正确性是「模型和引擎对不
对得上」,验证要真跑引擎:起 vite preview、用 playwright 把存档喂进去、拿一套独立于被测代码
的走子模型对照,并且要求引擎把每份存档逐字节原样吐回来。跟三套图的脚本一样在
`package.json` 之外。改这里就得自己搭一次,别只信 build 绿了。

一条容易踩的:填值时清不清该格候选,**每个游戏的答案不一样**。四个格子游戏的 `R` 会顺手
清掉,Undead 的 `G`/`V`/`Z` 不会(只有 `E` 清),而且屏幕上看不出来——放了怪物的格子根本
不画标记。所以 `Step` 的 set 自带 `clears`,各游戏各自声明。

另一条:**从这扇门进去的走子不会闪。** flash 只在 `midend_finish_move()` 里算,而只有
`midend_process_key` 那条路(手势、undo、redo)会走到它;`midend_deserialise` 不会。所以
最后一格由按钮填上时,棋盘会静悄悄地完成。修法是把最后一步留在 redo 列表里
(`pending()`),`loadGame` 之后按一下 `redo()`——`midend_redo` 落进同一条尾巴。实测 redo
之后后端写出的存档和「全部走子都已应用」那份逐字节相同,契约检查对每份存档都验这一条。

**这扇门还有第二个用户:`src/engine/map.ts`。** 它走整趟(读、改、`loadGame` 放回去),代价也整趟
付:`midend_deserialise` 会重建 `game_ui`,所以光标每次都得走回去,而且不会闪。

tents 一度是第三个,而且只用了**只读**那一半——按完键之后翻一遍存档,只为回答「刚才那一格里是
什么」(标签分不出帐篷和草,两种都报 `Clear`)。那一半是免费的:不动 `game_ui`,光标不丢,闪也照
旧。它随着 tents 改回三个固定键一起删了,记在这里是因为**只读那一半仍然是这扇门最便宜的用法**,
下次要往存档里写之前先问一句是不是读就够。

### 两块屏幕,没有路由

`src/view.ts`:一个模块级变量决定显示画廊还是某个谜题,地址永远是 `/`,全app只有一次
`history.replaceState`。不要引入 router,也不要往 hash 里塞状态——注释里写了为什么这
是设计而不是欠账。

进度和位置存在 localStorage(`src/engine/saves.ts`):`puzzles.save.<name>` 是 midend
自己的存档格式,每步棋后写;`puzzles.recent` 是「最近玩的是哪个」(画廊拿它画圈),
`puzzles.playing` 是「离开时在不在游戏里」的一个 bit(有值即真,回画廊就删掉,没有
「false」这个写法),`puzzles.scroll` 是「画廊滚到哪」,`puzzles.introduced` 是「哪些谜题
已经自报过家门」的一个集合(`Introduction` 那句话,读者按了关才算数,光是显示过不算)
——五件不同的事,别合并。发布前改 key 名字很便宜,发布后就不便宜了,所以改之前先想清楚。

### 深色棋盘 = 重写调色板

后端启动时报一次颜色、之后只按编号引用,所以深色主题是**我们这边把颜色表翻译一遍**,
wasm 全程不知情。规则全在 `src/engine/palette.ts`(compress / veil / flip 三条,加
BEVEL 修正),426 个色位没有一个是手挑的,常量都附了测量依据。

`CanvasRenderer.defaultColour()` 故意在两种主题下都返回 null,这是浅色棋盘仍然逐像素
等于上游的原因,也是深色必须由 palette.ts 生成的原因。

`SEMANTIC`/`BEVEL`/`FIGURE`/`RIM` 这几张表是「哪个游戏的哪个色位属于哪类」的知识,算不
出来。它们在注释里声明的规则由 `scripts/verify-palette.mjs` 强制;改表就跑它。

### 生成物不要手改

| 文件 | 由谁生成 |
| --- | --- |
| `public/engine/**`、`public/doc/**`(手册,每种语言一个目录:`doc/en/`、`doc/zh/`) | `scripts/build-games.sh` |
| `src/games.json`、`public/help/en.json` | `scripts/extract-games.mjs`(读上游 CMakeLists.txt 和 html/) |
| `public/sitemap.txt` | `scripts/build-doc.mjs`(`/` 加两棵手册树;app 是纯 JS 渲染的单页,爬虫在 `/` 上找不到任何链接,这个文件是手册唯一的入口) |
| `public/og.png` | `scripts/build-shot.mjs`(1200×630,分享卡片;和 README 那张同一个脚本) |
| `public/tiles/`、`public/howto/`、`public/art/` | 对应的 build-*.mjs(浏览器里跑真引擎截图);共用 `scripts/lib/pictures.mjs`,每张图亮暗各一份,文件名 `<name>-light.png` / `<name>-dark.png` |
| `public/icon-512.png`、`public/icon-192.png`、`public/apple-touch-icon.png`、`public/favicon-32.png` | `scripts/build-appicon.mjs`(拿 `public/tiles/` 里的 net 和 cube 亮色图拼的,不跑引擎);改了图标要同步 `index.html`、`manifest.webmanifest` 和 `sw.js` 的预缓存名单 |
| `public/doc/doc.css` | `scripts/build-doc.mjs` 把 `src/tokens.css` + `src/doc.css` 拼起来 |
| `docs/gallery.png` | `scripts/build-shot.mjs`(README 用的首页截图,亮暗并排);放 `docs/` 不放 `public/`,它不该跟着 app 部署出去 |

手写的对应物只有翻译:`src/games.zh.json`、`public/help/zh.json`、`doc-zh/`。
`extract-games.mjs` 会在它们与英文版脱节时告警,`verify-doc.mjs` 逐页比对标签序列、
锚点和链接。

这张表在 `.gitattributes` 里有第二份:同样这些路径标了 `linguist-generated`——既不算进语言
统计,也在 diff 里折起来,免得一次手册重建读成九十个被改过的文件(`vendor/` 是同一件事的
另一种写法:`linguist-vendored` 加 `-diff`)。加一个生成物要同时改两处,`.gitattributes` 的
注释就是指着这张表写的。

双语文件的命名有一条规则,两种形状各有理由:**`public/` 里(也就是有 URL 的)一律
`<东西>/<语言>`**——`doc/en/`、`doc/zh/`、`help/en.json`、`help/zh.json`,谁都不是默认;
**`src/` 里(打进 bundle,没有 URL)保留 `.zh.` 后缀**——`games.json` / `games.zh.json`,
后缀本身就说明了「英文是从上游抽的、中文是我们写的」。URL 改起来贵,源码文件不要钱。

### 前端约定

- **模块级 store + `useSyncExternalStore`**,不用 Context:主题(`useTheme`)、语言
  (`i18n/index.ts`)、隐藏的游戏(`useHidden`)、要不要方向键(`useArrows`)、当前屏幕
  (`view.ts`)都是这个形状。中间两个还共用一个更小的形状:一组游戏名存在一个 key 下,
  presence 即真——四十个只会被一起问到的布尔值是一件事,不是四十件。两份同形的 store 现在是
  两个文件,各自的注释才是它们的内容;要合成一个工厂也说得过去。
- 主题和语言在 `index.html` 的内联脚本里先解析一次,避免首帧闪白/闪英文;改了那段就要
  同步改 `useTheme` / `i18n`(以及 `build-doc.mjs` 里给手册用的同一段)。
- 设计 token 全在 `src/tokens.css`,`data-theme` 属性切换,样式表里没有 media query。
- **dialog 和 sheet 不是一回事**。`Dialog.tsx` 是三个真 dialog(设置、玩法、后端的 config
  box)共用的壳:scrim、卡片、那三个 aria 属性、Escape——它存在的理由就是这四样以前各写了
  一遍,于是 aria 标签有三种拼法而只有两个认 Escape。从底部拉上来的 sheet 不是 dialog:它
  能被拖走(`useSheetDrag`),而且几层叠着时 Escape 该关哪一层是 `PuzzleHost` 自己排的。
- 换屏幕(`view.ts`)和画廊里收起一张卡都走 `transition.ts`——feature test、reduced-motion、
  把 React 的渲染塞进被捕获那一帧的 `flushSync`。这三样写第二遍就会开始漂。
- `src/i18n/en.ts` 是文案的源,`zh.ts` 按它的类型写,所以漏一条翻译是编译错误而不是界面上
  的空白。后端说的话(preset 名、状态栏、参数对话框的标签)不在这里也翻不了——它们是编进
  wasm 的字符串,而这个 build 的全部意义就是不动那份 C。
- `src/engine/keys.ts` 重新实现了上游 `request_keys()` 的结果(emcc.c 不调用它),按
  game id 里的参数推。认不出来的 id 一律不显示键盘,而不是显示错的。Undead 是唯一一个
  光看 id 不够的:键面画怪物还是写字母得问偏好设置,所以它列在 `READS_PREFS` 里——
  `PuzzleHost` 见到这个名字,才会在偏好可能动过之后回去重读一遍。
- **把「键盘上能做、触摸屏上做不到」的事补成按钮,是一件正在一个一个游戏做下去的事。**
  每个游戏读哪些键、哪些已经有落点、还差什么,记在 **`docs/keys.md`**,判据和踩过的坑也在
  那里。改到这一块就同步改它——那份文档没有脚本会替你更新。
- **键盘上有三种键,画法不同**,分法是 `KeyLabel.aid`:不带这个字段的是往一个格子里放
  东西的普通键(数字、怪物、Clear);`'upstream'` 是后端自己就读、但从来没给过按钮的字母
  ——`M`、`H`、`J`,加上 Dominosa 那排高亮数字;`'ours'` 是后端根本不认识、由这一侧回答的
  三个,也就是上面那扇门。三档按「按一下够到多远」爬:一格 → 整块棋盘 → 整块棋盘且是我们
  的,**键盘上的排列顺序就是这个顺序**——游戏本来就有的排在前面,我们加上去的排在最后。
  填色那一档给了我们的键而不是上游的,理由写在 `index.css` 里,和「谁更具破坏性」无关
  ——Dominosa 的上游键什么都不伤,那条分法立不住。上游键的文案和顺序以上游手册为准,和我们
  的键撞了就改我们的(`possible` 因此从 "Fill in the possible pencil marks" 改成了
  "Leave only the pencil marks still possible")。
- TS 是 strict + `noUnusedLocals`/`noUnusedParameters`/`verbatimModuleSyntax`,类型
  导入要写 `import type`。

### 已经发布了,这几样改起来不再免费

app 已经上线(<https://puzzles.ebnbin.dev/>),下面这些东西一旦有人用过就带着历史包袱,
改之前先想清楚代价:

- **localStorage 的 key**(`src/engine/saves.ts` 列全了,外加 `puzzles.theme`、
  `puzzles.lang`、`puzzles.hidden`、`puzzles.arrows`、
  `puzzles.prefs.<name>`)。改名字 =
  用户的存档、设置、隐藏列表全部作废。每个 key 现在读的时候都容忍垃圾值(存档校验
  `SAVEFILE` 开头、主题只认 `dark`、其余一律当 light 并写回 `light`、集合类过滤非字符串),
  所以**加**东西是安全的,**改**和**删**不是。

  「其余一律当 light」这条是**值**的语义改过一次而 key 没改的例子:主题曾经有第三档
  「跟随系统」,老用户存着 `system`。因为读的时候本来就容忍垃圾值,去掉那一档不需要动
  key——`system` 自然落进 light。手册读同一个 key,所以 `useTheme` 会把它规范化写回
  `light`,否则两边会对同一个从没选过的读者给出不同答案。
- **`public/` 里的 URL**:`/engine/**`、`/doc/**`、`/help/**`、`/tiles|howto|art/**`、
  `/og.png`、`/manifest.webmanifest`、`/sw.js`。多数情况下改路径不会让谁崩掉(service worker
  按整条 URL 存,老条目只是变成垃圾),但有三处不是。`/og.png`:Slack、Discord 这些按 URL
  缓存分享卡片,换地址等于换一张卡片,老链接还是老图。`sw.js` 里 `install` 预缓存的那三条
  (`/`、`/icon-192.png`、`/manifest.webmanifest`)走的是 `addAll`,少一条就整个 reject、
  worker 永不 activate,离线支持跟着一起没——`/icon.svg` 换成 PNG 之后,就在那张名单上留过
  一阵。最后一处是两份名单要对上:`sw.js` 跳过不拦的 `/(tiles|howto|art)/`,和 vercel.json
  给这三个目录发缓存头的那一条——一处授权浏览器自己缓存,另一处让开别去挡它。它们曾经叫
  `solved`/`monsters`,改名时只改了一边,于是玩法图和键盘上的怪物又回到 worker 手里,
  悄悄地,没有任何东西会因此报错。
- **`sw.js` 的 `CACHE` 常量**:改了缓存规则、或者 `public/` 里有东西改名,就必须把版本号
  往上加一,否则老条目会一直被端出来。缓存条目比任何一次没点名它的部署活得都久。
- **`manifest.webmanifest` 的 `id`**:装到主屏幕的那个 app 的身份。改了它 = 变成另一个 app,
  用户桌面上会多出一个图标。`start_url` 同理(没有 `id` 时身份就是 `start_url`,所以才要写
  死一个 `id`)。
- **`vercel.json` 里 `/engine/` 的 `Cache-Control`**:曾经是 `immutable` + 一年,而
  `/engine/net.wasm` 这种地址的内容是会变的(重新编译上游),等于把旧引擎钉死一年。现在是
  一天。**任何非内容寻址的 URL 都不许写 `immutable`**;`/doc/doc.css` 可以,因为它带内容
  摘要的 query。

反过来,下面这些随便改:`src/` 里的一切、`docs/`、构建脚本、注释。

### 注释和提交信息的调子

这个仓库的注释写的是**为什么**——权衡、量过的数字、被否决的方案。提交信息是完整的句子,
正文解释理由和证据(`git log` 里看得到)。新代码照这个写,不要退回「做了什么」式的注释。
