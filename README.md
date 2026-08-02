# Puzzles

Simon Tatham's Portable Puzzle Collection 的一个 Web 前端。四十个谜题，可以装到主屏幕，离线玩。

> Think between vibes.

## 这是什么

上游的 C 源码（`vendor/sgtpuzzles/`，是上游工作树的逐字副本）编译成 WebAssembly，外面套一层自己写的 React + TypeScript 界面。**上游的 C 一行没动**——被替换掉的只是它自带的那层 JavaScript 外壳。

- 四十个谜题，进度每走一步就存一次，关掉再打开接着玩
- 深色棋盘：上游只有浅色，深色是这边把它的颜色表整个翻译一遍算出来的，426 个色位没有一个是手挑的
- 中英双语，连四十五页的手册也翻了
- 可离线，可安装
- 纯静态，没有后端，没有账号；你的进度只待在自己的浏览器里

## 本地跑起来

```bash
npm install
npm run dev
```

打包：

```bash
npm run build      # 类型检查 + 调色板校验，产物在 dist/
npm run preview    # 预览 dist/
```

没有测试框架，也没有 linter。`npm run build` 里的 `tsc --noEmit` 和 `verify-palette` 就是全部的自动检查；动过手册再跑一次 `npm run verify-doc`（需要 halibut）。

## 目录

| 路径 | 是什么 |
| --- | --- |
| `src/` | 界面 |
| `src/engine/` | C 与 React 之间那层契约，界面碰不到 DOM 以外的东西 |
| `vendor/sgtpuzzles/` | 上游源码，未经修改 |
| `public/engine/` | 编译好的 wasm |
| `public/doc/` | 手册，`en/` 和 `zh/` 各一份 |
| `scripts/` | 构建脚本 |

wasm、手册、缩略图这些产物都已经提交进仓库，日常开发不需要重新生成。真要重新生成，步骤和依赖在 [CLAUDE.md](CLAUDE.md) 里。

## 致谢

谜题本身是 Simon Tatham 和众多贡献者的作品，以 MIT 许可证发布，见
[`vendor/sgtpuzzles/LICENCE`](vendor/sgtpuzzles/LICENCE)。上游主页：
<https://www.chiark.greenend.org.uk/~sgtatham/puzzles/>
