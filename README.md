# Puzzles

Simon Tatham 的四十个谜题，做成了一个网页应用。手机上可以装到主屏幕，断网也能玩。

> Think between vibes.

## 能做什么

- 四十个逻辑谜题：Net、Solo、Mines、Bridges、Loopy……
- 随手关掉，回来还是上次那一局
- 深色模式，棋盘跟着一起变
- 界面和完整手册都有中文
- 可以装到主屏幕，像个独立应用一样打开
- 不用注册，不联网，进度只在你自己的浏览器里

## 怎么做的

谜题的逻辑是上游的 C 代码，编译成 WebAssembly 直接跑在浏览器里；外面这层界面是用
React + TypeScript 重写的。`vendor/sgtpuzzles/` 是上游工作树的逐字副本，一行没改——
被替换掉的只是上游自带的那层 JavaScript 外壳。

深色模式在上游没有对应实现。上游只画浅色棋盘，所以深色是在这边把它报上来的颜色表重新
算一遍得到的，C 那边全程不知道自己被改了颜色。

## 开发

```bash
npm install
npm run dev
```

打包：

```bash
npm run build      # 类型检查 + 校验，产物在 dist/
npm run preview    # 预览 dist/
```

没有测试框架，也没有 linter，`npm run build` 就是全部的自动检查。动过手册的话再跑一次
`npm run verify-doc`（需要 halibut）。

| 路径 | 是什么 |
| --- | --- |
| `src/` | 界面 |
| `src/engine/` | C 与界面之间的那层契约 |
| `vendor/sgtpuzzles/` | 上游源码，未经修改 |
| `public/` | 编译好的 wasm、手册、图片 |
| `scripts/` | 构建脚本 |

wasm、手册、缩略图这些产物都已经提交进仓库，日常开发不用重新生成。真要重新生成，步骤
和依赖在 [CLAUDE.md](CLAUDE.md)。

## 致谢

谜题本身是 Simon Tatham 和众多贡献者的作品，以 MIT 许可证发布，见
[`vendor/sgtpuzzles/LICENCE`](vendor/sgtpuzzles/LICENCE)。上游主页：
<https://www.chiark.greenend.org.uk/~sgtatham/puzzles/>
