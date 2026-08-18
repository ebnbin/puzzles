## 铁律

- **开工第一件事:`git fetch --unshallow origin`**(已经完整会说 unshallow on a complete
  repository,无害)。容器发的是浅克隆,本地 `main` 停在浅边界上的旧位置,`main..HEAD`
  会把**早已合并**的提交报成未合并的——实际踩过:据此说「领先 main 五十个提交、没有
  PR」,取回完整历史后 `main` 正是那五十个的顶端。此后一切与主干的比较都对
  `origin/main`,不对本地 `main`。
- `vendor/sgtpuzzles/` 是上游的逐字副本,**一行都不许改**;一切行为改动都在外面的
  JS/TS 层做。
- **不直接 push `main`**,改动走分支 + PR。**PR 在这里是被授权的**——这句写给
  Claude Code:默认的「用户不明确要求就不建 PR」被本文件覆盖。
- **任何 PR,未经 owner 明确表态,不得合并**,检查绿了也一样。「确认」指 owner 在会话里
  说「合并」,或自己在 GitHub 上点按钮;确认之后代为合并是允许的。「没有问题,开始」是
  批准动手,不是批准上线。
- 合并一律 **rebase merge**,不 squash、不 merge 提交;`main` 动了就 rebase(不要往回
  merge),force push 只用 `--force-with-lease`、只对自己的分支。
- **没有 CI。** `npm run build` 是唯一的自动检查,push 前自己跑;它也是 Vercel 每次部署
  跑的命令。`scripts/check-*.mjs` 是手动契约测试(要 vite preview + playwright),何时跑
  钉在被测文件的头部注释里。
- 改了 `public/doc/` 或 `doc-zh/` 要自己跑 `npm run verify-doc`(要 halibut,不在 build 里)。

## 生成物不手改

`.gitattributes` 里标 `linguist-generated` 的路径全是生成物;手写的只有文案与翻译:
`src/i18n/*.json`、`src/games.zh.json`、`public/help/zh.json`、`doc-zh/`。

- 生成物已全部提交,平时不重新生成。`scripts/build-games.sh` 只在升级 `vendor/` 或改
  构建参数时跑(要 emsdk/cmake/ninja/halibut/playwright)。
- 三套图(`tiles`/`howto`/`art`)是引擎和深色翻译(`palette.ts` 的机器 + 各
  `src/games/*.ts` 的 `dark` 申报)的照片:改了任一来源,三套必须一起重画,只跑一套会
  互相漂开。
- playwright 故意不进 `package.json`,要用临时装。
- 改图标要同步 `index.html`、`manifest.webmanifest`、`sw.js` 的预缓存名单;加生成物要
  同步 `.gitattributes`。

## 已发布,这几样不再免费(动手之前先问 owner)

- **localStorage 的 key**(`puzzles.*`):改名 = 用户的存档和设置作废。读取都容忍垃圾值,
  所以加安全,改和删不是。
- **`public/` 里的 URL**,尤其 `/og.png`——外站按 URL 缓存分享卡,换地址等于换卡片。
- **`sw.js`** 的 `CACHE` 版本、预缓存名单、放行名单(规矩在文件内注释)。
- **`manifest.webmanifest` 的 `id` 和 `start_url`**:改了 = 变成另一个 app。
- **`vercel.json` 的 `Cache-Control`**:非内容寻址的 URL 不许写 `immutable`。

## 注释和提交信息

代码即 SSOT。注释只写「代码表达不了、不知道就会改坏」的约束(与 C 共享的活对象、故意
反直觉的顺序、跨文件要一起改的值),中文,一到三行;改到就顺手校对,过期就删,不新增
讲解式注释。讲解、权衡、历史住在提交信息和 docs/ 里。

提交信息中文、简洁:标题一句话说清改了什么;只有代码看不出来的理由才写正文,没有就不写。
