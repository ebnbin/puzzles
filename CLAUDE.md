## 这是什么

Simon Tatham's Portable Puzzle Collection 的 Web 前端:40 个谜题的 C 源码
(`vendor/sgtpuzzles/`,上游逐字副本)编译成 WebAssembly,外面是自己写的 React + TypeScript
界面。**上游的 C 一行都不动**,换掉的只是它的 JavaScript 外壳。部署在 Vercel,纯静态,
没有后端,线上地址 <https://puzzles.ebnbin.dev/>。

## Git

- **不直接 push `main`。** 一个改动一个分支一个 PR,按「一件事」切(一个 PR 五到十个提交
  正常)。session 启动时注入的 `claude/xxx` 分支直接用,不必另开。
- **PR 在这里是被授权的**——这句写给 Claude Code:它的默认规则是「用户不明确要求就不建
  PR」,这份文件就是那个明确要求。
- **没有 CI。** `npm run build` 是唯一的自动检查,push 前自己跑;它也是 Vercel 每次部署
  跑的命令。
- 合并用 **rebase merge**,不 squash、不 merge 提交,历史保持线性。`main` 动了就
  `git rebase origin/main` 再 `git push --force-with-lease`——只对自己的分支,**任何情况
  都不对 `main` force push**。
- **合并等确认:任何 PR,未经 owner 明确表态,Claude 不得合并**,检查绿了也一样。「确认」
  指 owner 在会话里说「合并」,或自己在 GitHub 上点按钮;确认之后代为 rebase merge 是允许
  的。「没有问题,开始」是批准动手,不是批准上线。改到「不再免费」那节列的任何一条,要在
  **动手之前**就问。
- 远程分支删不掉(本环境的 git 代理对删除返回 403),留着无害。

## 命令

```bash
npm run dev             # Vite 开发服务器
npm run build           # verify-palette + tsc --noEmit + vite build
npm run verify-doc      # 手册未被手改 + 中英结构一致(要 halibut,不在 build 里)
npm run doc             # 重新生成 public/doc/(要 halibut)
```

- 改了 `public/doc/` 或 `doc-zh/` 要自己跑 `verify-doc`,build 不含它,没人会替你跑。
- **生成物脚本平时不需要跑,产物已提交进仓库。** `scripts/build-games.sh` 只在升级
  `vendor/sgtpuzzles`(见 `vendor/UPSTREAM`)或改构建参数时用,要 emsdk/cmake/ninja/
  halibut/playwright。三套图(`tiles`/`howto`/`art`)是引擎和 `palette.ts` 的照片,改了
  任一来源要三套一起重画,只跑一套会互相漂开。playwright 不在 `package.json` 里,用时自装。
- **四个 `scripts/check-*.mjs` 是这个仓库的测试**(要先起 vite preview,加 playwright,
  不在 build 里)。升级上游后必须跑 `check-cube`——几何模型漂了会把能按的键错灰,而错灰
  的按钮和该灰的长得一模一样,读者报不上来。改 `engine/map`、`engine/palisade`、renderer
  的录制后跑对应的另外三个。各自守什么、何时跑,钉在脚本和被测文件的头部注释里。

## 架构

- **`src/engine/types.ts` 是 C 和 React 之间的全部边界**,以数据形式,不碰 DOM。
  `engine/puzzle-pre.js`、`puzzle-lib.js` 替换上游的 wrapper,只转发给宿主;换 wrapper
  绝不能影响 `.wasm`(`build-games.sh` 用 `cmp` 校验两次构建逐字节一致)。
- **存档门**:`midend_deserialise` 把存档里的 `MOVE` 直接交给 `execute_move`,不经过
  `interpret_move`——这是唯一不伪造手势就能喂给后端一步棋的口。走它的有
  `src/engine/marks/`(五个铅笔游戏的三个标记键)、`map.ts`(调色板,整趟),`tents.ts`
  只用读的那一半。**这个模块没有提交进仓库的自动检查**:正确性是「模型和引擎对不对得上」,
  要起 preview 用 playwright 真跑引擎验证,别只信 build 绿。行为约束钉在 `marks/` 各文件
  的注释里。
- **深色主题 = 这一侧把后端报的颜色表整表翻译一遍**(`src/engine/palette.ts`),wasm 全程
  不知情;浅色棋盘必须逐像素等于上游。表格不变量由 `scripts/verify-palette.mjs` 强制。
- **按键这一块的判据、全表和机制在 `docs/keys.md`**,改到就同步改它——没有脚本会替你更新。

## 生成物不要手改

| 文件 | 由谁生成 |
| --- | --- |
| `public/engine/**`、`public/doc/**` | `scripts/build-games.sh` |
| `src/games.json`、`public/help/en.json` | `scripts/extract-games.mjs` |
| `public/sitemap.txt` | `scripts/build-doc.mjs`(app 是纯 JS 单页,爬虫在 `/` 上找不到链接,这个文件是手册唯一的入口) |
| `public/og.png`、`docs/gallery.png` | `scripts/build-shot.mjs`(gallery.png 放 `docs/`,不跟着 app 部署) |
| `public/tiles/`、`public/howto/`、`public/art/` | 对应的 `build-*.mjs`,每张亮暗各一份 |
| `public/icon-512/192.png`、`apple-touch-icon.png`、`favicon-32.png` | `scripts/build-appicon.mjs`;**改了图标要同步 `index.html`、`manifest.webmanifest` 和 `sw.js` 的预缓存名单** |
| `public/doc/doc.css` | `scripts/build-doc.mjs` 拼 `src/tokens.css` + `segmented.css` + `doc.css` |

手写的对应物只有翻译:`src/games.zh.json`、`public/help/zh.json`、`doc-zh/`
(`extract-games` 在脱节时告警,`verify-doc` 逐页比对结构)。

这张表在 `.gitattributes` 里有第二份(`linguist-generated`),**加一个生成物要同时改两处**。

双语文件命名:`public/` 里(有 URL 的)一律 `<东西>/<语言>`,谁都不是默认;`src/` 里
(打进 bundle 的)用 `.zh.` 后缀。

## 已经发布了,这几样改起来不再免费

一旦有人用过就带着历史包袱,动之前先问(见 Git 一节):

- **localStorage 的 key**:`puzzles.save.<name>`、`puzzles.recent`、`puzzles.playing`、
  `puzzles.scroll`、`puzzles.introduced`、`puzzles.theme`、`puzzles.lang`、
  `puzzles.hidden`、`puzzles.arrows`、`puzzles.prefs.<name>`。改名 = 用户的存档和设置
  全部作废。所有 key 读取时都容忍垃圾值,所以**加**安全、**改**和**删**不是;值的语义可以
  换,老值会自然落进默认(theme 的 `system`、arrows 的旧数组都这么退役的)。
- **`public/` 里的 URL**。三处特别的:`/og.png` 被 Slack/Discord 按 URL 缓存,换地址等于
  换卡片;`sw.js` 里 `install` 预缓存名单走 `addAll`,少一条整个 reject、worker 永不激活;
  `sw.js` 放行的 `/(tiles|howto|art)/` 和 `vercel.json` 给它们发缓存头的那条是一对,两处
  一起改。
- **`sw.js` 的 `CACHE` 常量**:改缓存规则或 `public/` 里有改名,必须升版本,否则老条目
  一直被端出来。
- **`manifest.webmanifest` 的 `id`**(和 `start_url`):装到主屏幕的 app 的身份,改了 =
  变成另一个 app。
- **`vercel.json` 的 `Cache-Control`:任何非内容寻址的 URL 都不许写 `immutable`**
  (`/engine/net.wasm` 的内容会变);`/doc/doc.css` 可以,它带内容摘要 query。

反过来,`src/`、`docs/`、构建脚本随便改。

## 注释和提交信息

**代码即 SSOT,注释近乎为零。** 讲解、权衡、历史、测量依据一律不写进代码——那些住在提交
信息、CLAUDE.md 和 docs/ 里。唯一允许的注释是**代码自己表达不了、而不知道就会把代码改坏
的约束**:与 C 共享的活对象、故意反直觉的顺序或常量、跨文件要一起改的值、「看起来该修恰恰
不能修」的地方。中文,一到三行,常用英文术语不硬翻。现存的每一条都是按这个标准留下的:
改到它守着的代码时顺手校对,过期就删;不要新增讲解式注释。

提交信息用中文,保持简洁:标题一句话说清改了什么;只有代码看不出来的理由才值得写正文,
能一行就一行,没有就不写。
