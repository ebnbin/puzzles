# 项目结构

全项目逐文件清单:每个手写文件一句话说清它是干什么的。**手写文档,没有脚本会替你
更新**——增删、移动文件时同步改这里。生成物按目录整组列(逐个列没有信息量),哪些
是生成物、哪些是上游副本,以 `.gitattributes` 为准,那份名单是 SSOT。

三个词贯穿全文:**game** 是四十个后端的自述(`src/games/`),**puzzle** 是玩它的
页面(`src/pages/puzzle/`),**engine** 是 C 与界面之间的机器(`src/engine/` 与
wasm 产物)。

## 根目录

| 文件 | 作用 |
| --- | --- |
| `index.html` | vite 入口页:meta、图标、manifest 链接,内联「首帧定主题」脚本(与 `useTheme.ts`、`build-doc.mjs` 里的同一段联动改) |
| `package.json` | 依赖与五个命令:`dev` / `build`(tsc + vite,唯一的自动检查)/ `preview` / `doc` / `verify-doc` |
| `package-lock.json` | 依赖锁。playwright 故意不在里面,用时临时装 |
| `tsconfig.json` | TypeScript 配置 |
| `vite.config.ts` | 构建配置 + 构建期数据对账:注册表↔games.json(`games/util/verify.ts`)、两份文案键集与占位符(`i18n/verify.ts`),不过就不出包 |
| `vercel.json` | 部署:SPA 重写、逐路径 Cache-Control(非内容寻址的 URL 不写 immutable,铁律) |
| `.gitattributes` | 生成物与上游副本的名单(linguist-generated / vendored):哪些文件不许手改,以这里为准 |
| `.gitignore` | `dist/`、`node_modules/` 等不入库 |
| `CLAUDE.md` | 项目铁律:vendor 不改、分支与 PR 规矩、已发布契约清单、注释与提交信息纪律 |
| `README.md` | 项目自述与路径表 |
| `LICENCE` | MIT(随上游) |

`dist/`(构建输出)与 `node_modules/` 不入库,不在清单里。

## engine/ —— wasm 胶水的替身

构建 wasm 时接进 emcc 的两份手写 JS,替掉上游依赖 DOM 的那两份;产物落在
`public/engine/`。

| 文件 | 作用 |
| --- | --- |
| `puzzle-lib.js` | 上游 `emcclib.js` 的替身(`--js-library`):C 调出来的函数名字签名不变,只转发给宿主,不碰 DOM |
| `puzzle-pre.js` | 上游 `emccpre.js` 的替身(`--pre-js`):把请求转发给宿主对象;MODULARIZE 下只能往 Module 上并东西,不能整体赋值 |

## vendor/sgtpuzzles/ —— 上游

Simon Tatham's Portable Puzzle Collection 的逐字副本(commit 见
`docs/inputs.md`),**一行不改**;一切行为改动在外面的 JS/TS 层做。它是全项目唯一的
ground truth。

## src/

### 根 —— 跨页基座

| 文件 | 作用 |
| --- | --- |
| `main.tsx` | 挂载 React、注册 service worker、按 `puzzles.playing` 恢复「正在玩」直达 |
| `App.tsx` | 三行路由:gallery / puzzle 互相替换,manual 常驻覆盖层 |
| `view.ts` | 两块屏幕的切换器(无 router、无 hash,语义如此)+ 画廊滚动位置 |
| `transition.ts` | view transition 三样集中地:feature test、reduced-motion、flushSync |
| `store.ts` | localStorage 可订阅状态工厂 `makeStore` / `makeFlag` |
| `useTheme.ts` | 主题解析(只认 dark,垃圾值当 light 并规范化写回);与 index.html 内联脚本、build-doc.mjs 联动 |
| `games.json` | 生成物(`extract-games.mjs`):40 个游戏的 name / displayName / description / objective |
| `games.zh.json` | 手写:游戏文案的中文翻译 |
| `index.css` | 全局样式:画廊、谜题页、键区、sheet、dialog……类名词汇与页面词汇一致 |
| `tokens.css` | 设计令牌:色彩、圆角、字号、间距 |
| `segmented.css` | 分段控件样式,app 与手册静态页共用(进 build-doc 拼装) |
| `doc.css` | 手册页样式,Manual 内嵌显示与静态页共用(拼进 `public/doc/doc.css`,类名钉死) |
| `doc-page.css` | 手册静态页的 reset 与排版(同样拼进 `public/doc/doc.css`) |

### src/engine/ —— C 与界面之间的契约

| 文件 | 作用 |
| --- | --- |
| `createPuzzle.ts` | 起一个游戏:装载 `/engine/<name>.js` 工厂、接回调、建渲染器、做深色翻译 |
| `renderer.ts` | canvas 渲染器:上游画图原语 → 2D canvas;录像旁路(record / stop / watch)与调色板查询 |
| `palette.ts` | 深色翻译引擎 + `Dark` 申报类型:按各游戏的 `dark` 申报把浅色表逐槽翻译 |
| `saves.ts` | localStorage 全部读写:存档、最近、正在玩、隐藏、完成、滚动。键名已发布,只加不改 |
| `solved.ts` | 从存档判「用过求解器」(完成记录的闸门之一) |
| `types.ts` | `PuzzleApi`、回调、`DialogSpec`、`Preset` 等接口类型,`window.__puzzle` 声明 |

### src/games/ —— 统一游戏接口:一个游戏一个文件

| 文件 | 作用 |
| --- | --- |
| `game.ts` | 契约:`Game<F>` 十个必填成员(upstream / touch / dark / pages / types / prefs / keypad / arrows / observe)与 View / Board / Gate / Saw 类型;类型里不出现任何游戏名 |
| `index.ts` | 注册表——全项目唯一的「游戏名 → 行为」映射 |
| `net.ts` … `mosaic.ts` × 40 | 每个游戏的完整自述:上游事实、触摸映射、深色申报、键区、方向键块、观察器 |

`src/games/util/` 只放看不见游戏的机器(判据:参数与实现里没有游戏名):

| 文件 | 作用 |
| --- | --- |
| `declare.ts` | `verbatim` / `samePages` 申报速记 |
| `keys.ts` | 上方键区构造器:数字键(阶数解析、`charButton` 字符换算)、清除键、上游的 `h`/`J`/`M`、偏好匹配、偏好键(`preferKeys`:布尔按 label、多选一按答案表,一律按上游序排) |
| `mirror.ts` | 光标位置镜像的几何:夹边、不绕回,同上游 `move_cursor` 语义 |
| `pad.ts` | 方向键块机器:标签推导(`wouldSend` 判决)、act / arm / latch / layer、`padButtons` 拼装 |
| `save.ts` | 上游存档文件语法:字段读写、存档门内的改写与补闪 |
| `verify.ts` | 构建期不变量:注册表与 games.json 双向对账、深色申报检查 |

### src/pages/ —— 三个页面,一页一包

`pages/gallery/`(画廊):

| 文件 | 作用 |
| --- | --- |
| `Gallery.tsx` | 画廊页:磁贴网格、最近在玩、隐藏收纳 |
| `GallerySettings.tsx` | 设置面板:语言、主题、方向键、辅助键、手册入口、清数据 |
| `useHidden.ts` | 隐藏名单(`puzzles.hidden`,makeStore) |

`pages/puzzle/`(谜题——对局页):

| 文件 | 作用 |
| --- | --- |
| `Puzzle.tsx` | 页面入口:查文案,按 name 给 PuzzleHost 挂 key(换游戏必然重挂载) |
| `PuzzleHost.tsx` | 装配处:把四个域接起来再画出来 |
| `useEngine.ts` | 引擎生命周期:起 wasm、绑回调、存档持久化、把引擎事件泵进旁边三个域 |
| `useBoard.ts` | 棋盘通道:五项每游戏状态(标签/事实/光标镜像/粘滞键/上膛)与观察器;存档门重入计数私有在这里 |
| `useConfigBox.ts` | 后端单对话框协议三条路:borrowed(借用截答案)/ inline(嵌在 sheet 里)/ modal(兜底);偏好的读与写都从 borrowed 那条走 |
| `useOutcome.ts` | 完成判定:status 只认沿、收尾浮层、记完成(求解器解出的不记) |
| `PuzzleKeypad.tsx` | 上方键区渲染:键面、色钉、`prefer` 的亮态 |
| `PuzzleActions.tsx` | 下方区域:固定键(撤销/重做/类型/菜单)+ 方向键块 |
| `PuzzleMenu.tsx` | 菜单 sheet:新局、重开、求解、偏好、game ID、seed |
| `PuzzleTypes.tsx` | 类型 sheet:预设列表 + 自定义参数 |
| `PuzzleDialog.tsx` | 后端模态对话框的兜底渲染 |
| `ConfigFields.tsx` | config box 控件渲染(值原地写回 C 的活对象,text 只在落定时提交) |
| `usePuzzleFit.ts` | 棋盘尺寸适配:量可用空间、限缩放 |
| `usePuzzleKeys.ts` | 物理键盘唯一通路:判据是「这一按该不该归谜题」,不认焦点 |
| `usePuzzlePointer.ts` | 指针 → 上游鼠标语义(长按 = 右键或中键,由游戏申报) |
| `useHelp.ts` | 玩法速览文案装载(`public/help/`) |
| `useArrows.ts` | 方向键总开关(`puzzles.arrows`) |
| `useAssist.ts` | assist 键总开关(键名 `puzzles.aid` 已发布,只改了代码名) |
| `usePrefer.ts` | prefer 键总开关(`puzzles.prefer`) |

`pages/manual/`(手册):

| 文件 | 作用 |
| --- | --- |
| `Manual.tsx` | 手册阅读器:取 `public/doc/` 静态页内嵌显示;`openManual` 是全 app 的入口 |

### src/i18n/

| 文件 | 作用 |
| --- | --- |
| `en.json` | 英文文案,键结构的 SSOT(`Strings = typeof en.json`) |
| `zh.json` | 中文文案;键集与占位符同 en 全等,构建期校验 |
| `fill.ts` | `{name}` 模板填充。独立成文件是硬约束:构建期 node 链不能碰 `document` |
| `index.ts` | 语言状态、`<html lang>` 应用、`manualHref`;有意不译的约定写在头注 |
| `games.ts` | 游戏文案合并:games.json + games.zh.json 按语言取用 |
| `verify.ts` | 两份文案的键集全等、逐键占位符集合全等(vite.config 构建期跑) |

### src/ui/ —— 语义通用的界面部件

包内不含谜题领域:不许 import `engine/` / `games/`,名字与 props 里不出现领域词。

| 文件 | 作用 |
| --- | --- |
| `Dialog.tsx` | 模态对话框壳:标题、关闭、滚动锁 |
| `Sheet.tsx` | 底部弹层壳:scrim、把手、拖拽关闭 |
| `Notice.tsx` | 通知条:error / info 两种,可浮动可关闭 |
| `Swatch.tsx` | 色块钉(键面上的颜色圆点) |
| `Icon.tsx` | 全部图标字形与三张怪物图片的名字表 |
| `ThemeToggle.tsx` | 主题切换按钮 |
| `HoldTip.tsx` | 长按提示:`useHoldTip` 发 handlers,组件负责画 |
| `useScrollLock.ts` | 弹层期间锁背景滚动 |

## public/ —— 静态资源与生成物

URL 都是已发布契约(外站与缓存按址引用),改名之前先问。

| 路径 | 作用 |
| --- | --- |
| `engine/` | 生成物:40 ×(js + wasm)引擎(`build-games.sh`) |
| `doc/` | 生成物:手册静态页 `en/` `zh/` 各 45 页 + 拼装的 `doc.css`(`build-doc.mjs`;中文源在 `doc-zh/`) |
| `help/` | 玩法速览:`en.json` 生成(`extract-games.mjs`),`zh.json` 手写翻译 |
| `tiles/` | 生成物:画廊磁贴 40 × 2 主题(`build-tiles.mjs`) |
| `howto/` | 生成物:玩法图 40 × 2 主题 + `how.json`(逐游戏记录拍的是什么局面)(`build-howto.mjs`) |
| `art/` | 生成物:undead 三个怪物 × 2 主题(`build-art.mjs`) |
| `sw.js` | service worker:CACHE 版本、预缓存与放行名单(规矩在文件内注释;已发布契约) |
| `manifest.webmanifest` | PWA 清单:`id` 与 `start_url` 已发布,改了 = 变成另一个 app |
| `og.png` | 分享卡(`build-shot.mjs`;外站按 URL 缓存,换地址等于换卡片) |
| `icon-512.png` `icon-192.png` `apple-touch-icon.png` `favicon-32.png` | 图标(`build-appicon.mjs`) |
| `robots.txt` `sitemap.txt` | 抓取许可与站点地图(sitemap 是生成物) |

## scripts/ —— 生成与契约测试

两类:`build-*` 重画生成物,平时不跑(生成物已全部提交);`check-*` 是手动契约测试
(要 vite preview + 临时装 playwright),**何时跑钉在被测文件的头部注释里**。

| 文件 | 作用 |
| --- | --- |
| `build-games.sh` | 编译 vendor 40 个游戏为 wasm(要 emsdk/cmake/ninja),接 `engine/` 两份替身,产出 `public/engine/` |
| `extract-games.mjs` | 从上游抽 `src/games.json` 与 `public/help/en.json` |
| `build-doc.mjs` | halibut 出手册静态页,拼 `public/doc/doc.css` |
| `verify-doc.mjs` | 校验 `doc-zh/` 翻译与上游手册结构一致(要 halibut,不在 build 里) |
| `build-tiles.mjs` | 画廊磁贴。三套图是引擎 + 深色翻译的照片:改任一来源,tiles/howto/art 三套一起重画 |
| `build-howto.mjs` | 玩法图(含 how.json 局面记录) |
| `build-art.mjs` | undead 怪物图 |
| `build-shot.mjs` | README 首图 `docs/gallery.png` 与分享卡 `og.png` |
| `build-appicon.mjs` | 四个应用图标(maskable 留白规矩在注释里) |
| `check-keys.mjs` | 六游戏键面与上游 `midend_request_keys` 对账,五个自造键盘断言上游为空 |
| `check-cube.mjs` | cube 滚动置灰模型对引擎逐格验证(升级上游后必跑) |
| `check-map.mjs` | map 调色板走存档门涂色:涂的区域 = 光标站的区域 |
| `check-clues.mjs` | map 线索格判定与引擎逐格对账 |
| `check-palisade.mjs` | palisade 从画面读键死活,与引擎走子逐按对账 |
| `check-solved.mjs` | 完成判定四态:求解器不记、自己解记、沿重武装、不重复记 |
| `check-focus.mjs` | 键盘不认焦点:一圈会抢焦点的操作走完,物理键盘每步都还到得了引擎 |
| `check-prefer.mjs` | prefer 键:十个游戏的偏好逐个还认得出、组序 prefer 收尾、按一下真写进偏好存档、多选一走得完一圈 |
| `lib/boot.mjs` | 契约测试共用开机礼:起浏览器、走首页进游戏、等引擎活 |
| `lib/pictures.mjs` | 出图脚本共用:路径、主题、上游裁剪参数读取 |

## docs/ 与 doc-zh/ —— 文档

| 路径 | 作用 |
| --- | --- |
| `docs/keys.md` | 按键适配:判据、六类按钮、全表、遗留问题、机制、坑(手写,同步维护) |
| `docs/inputs.md` | 上游 40 游戏的全部输入参考,带源码行号,钉着上游 commit |
| `docs/structure.md` | 本清单 |
| `docs/gallery.png` | README 首图(`build-shot.mjs` 生成) |
| `doc-zh/` | 手册中文翻译源(手写,40 个游戏页与公共章节共 45 页);`build-doc.mjs` 出 `public/doc/zh/`,改动后跑 `npm run verify-doc` |
