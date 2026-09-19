# Solo 参数全集普查

上游放行的 9024 个 Solo 参数组合逐格跑一遍生成,对着我们的范围规则查账:
**留下的该在上限内生成成功,排除的该失败或超时**。不符的逐条记下来,交给下一轮排查。

工具在 `scripts/solo-sweep/`:

```
node scripts/solo-sweep/run.mjs --cap 10 --shuffle        # 跑,产物落在 .build/solo-sweep/out/
node scripts/solo-sweep/report.mjs > docs/solo-sweep/round1.md
```

要 gcc(和 `check-params` 同一套 oracle 机器,把 `vendor/` 的 `solo.c` 临时编出来,不动 vendor 一行)。
全量一轮在容器上约 2.7 小时;结果一行一行追加,中断后重跑按 key 跳过已完成的。

## 这里的文件

| 文件 | 是什么 |
|---|---|
| `round1.md` | 第一轮报告:总账、按规则归因的不符名单、崩溃名单 |
| `results-cap10.tsv` | 第一轮原始结果,9024 行:结局、墙钟、CPU、提示格数 |
| `manifest.tsv` | 组合清单:参数串、我们收不收、这一轮用的种子 |
| `jigsaw45-crash-rate.tsv` | 4/5 阶 Jigsaw × 八种对称各 200 个种子,量断言的发生率 |

## 读数据的时候记着

- **一格只跑了一个种子**。「跑得出来」不等于「总是跑得出来」,「超时」也不等于「永远超时」;
  断言尤其是概率性的(4 阶 Jigsaw 配镜8 是 11%,配旋4 只有 1%)。这一轮只用来划范围。
- **每格的实测耗时都记了**,所以判定线想从 10 秒挪到别的值,重跑 `report.mjs --limit N` 就行,
  不用重跑生成。
- **绝对秒数不能直接当线上标准**:这台容器比 owner 的机器慢 2–3 倍,而且这是 native gcc `-O1`,
  线上跑的是 wasm,还要再慢一截。
- 上限按 **CPU 时间**(`RLIMIT_CPU`)算,不按墙钟——并行跑时墙钟含排队,会把慢格误判成超时。
