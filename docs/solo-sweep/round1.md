# Solo 参数全集普查 · 第一轮(一格一个随机种子)

- 判定线:生成 CPU 时间 ≤ 10 秒且成功 = 「跑得出来」。上限 10 秒,超了记 timeout。
- 跑完 9024 / 9024 格(留下 4424,排除 4600)。
- 每格只跑一个种子,所以「跑得出来」不等于「总是跑得出来」,「超时」也不等于「永远超时」。这一轮只用来划范围,结论留给第二轮。
- 这台机器比 owner 的慢 2–3 倍,且是 native gcc -O1、线上是 wasm,绝对秒数不能直接当线上标准。

## 总账

| | 符合预期 | 不符 |
|---|---|---|
| 留下(该 ≤ 10 秒生成成功) | 3943 | **481** |
| 排除(该失败或 > 10 秒) | 3139 | **1461** |

## 排除却跑得出来(1461 格)

| 被哪条规则排除 | 规则的理由 | 格数 | 中位耗时 |
|---|---|---|---|
| Killer 钉对称 | 别的(不该指望它失败) | 885 | 0.048 秒 |
| 难度分档上限(Intermediate 25) | **生成代价** | 146 | 3.486 秒 |
| 难度分档上限(Extreme 16) | **生成代价** | 142 | 3.538 秒 |
| Jigsaw 下限 4 | 别的(不该指望它失败) | 84 | 0.000 秒 |
| Killer 钉对称 + 2×2 对称白名单 | 别的(不该指望它失败) | 72 | 0.000 秒 |
| 2×2 对称白名单 | 别的(不该指望它失败) | 51 | 0.000 秒 |
| Killer 钉对称 + Jigsaw 下限 4 | 别的(不该指望它失败) | 42 | 0.000 秒 |
| Jigsaw 上限 12 | **生成代价** | 28 | 4.218 秒 |
| 难度分档上限(Unreasonable 16) | **生成代价** | 6 | 7.878 秒 |
| 难度分档上限(Advanced 25) | **生成代价** | 5 | 6.376 秒 |

### Killer 钉对称 —— 885 格(规则依据不是生成代价)

```
0.000s  2x3km2(阶 6 Killer 镜2 Trivial)  seed=81821033-355
0.000s  4jxk(阶 4 X Killer 旋2 Trivial)  seed=81821033-3031
0.000s  2x2xk(阶 4 X Killer 旋2 Trivial)  seed=81821033-247
0.000s  2x2xkdi(阶 4 X Killer 旋2 Intermediate)  seed=81821033-249
0.000s  4jkm8(阶 4 Killer 镜8 Trivial)  seed=81821033-2971
0.000s  3x2xkm2(阶 6 X Killer 镜2 Trivial)  seed=81821033-1987
0.000s  2x2xkdb(阶 4 X Killer 旋2 Basic)  seed=81821033-248
0.000s  4jxkm4(阶 4 X Killer 镜4 Trivial)  seed=81821033-3055
0.000s  5jkm2(阶 5 Killer 镜2 Trivial)  seed=81821033-3811
0.000s  4jxkm8(阶 4 X Killer 镜8 Trivial)  seed=81821033-3067
…… 另 875 格同类,全名单见 results-cap10.tsv
```

### 难度分档上限(Intermediate 25) —— 146 格(规则依据是生成代价,能秒生成就是判错了)

```
0.302s  2x13m8di(阶 26 镜8 Intermediate)  seed=81821033-1485
0.316s  13x2xm8di(阶 26 X 镜8 Intermediate)  seed=81821033-7101
0.325s  13x2m8di(阶 26 镜8 Intermediate)  seed=81821033-7053
0.410s  2x13xm8di(阶 26 X 镜8 Intermediate)  seed=81821033-1533
0.413s  14x2m8di(阶 28 镜8 Intermediate)  seed=81821033-7245
0.517s  2x14xm8di(阶 28 X 镜8 Intermediate)  seed=81821033-1629
0.518s  2x13md4di(阶 26 对镜4 Intermediate)  seed=81821033-1479
0.531s  13x2r4di(阶 26 旋4 Intermediate)  seed=81821033-7023
0.619s  2x13m4di(阶 26 镜4 Intermediate)  seed=81821033-1473
0.653s  2x13xr4di(阶 26 X 旋4 Intermediate)  seed=81821033-1503
0.676s  15x2m8di(阶 30 镜8 Intermediate)  seed=81821033-7437
0.707s  2x13xm4di(阶 26 X 镜4 Intermediate)  seed=81821033-1521
0.737s  2x13xmd4di(阶 26 X 对镜4 Intermediate)  seed=81821033-1527
0.852s  13x2xmd4di(阶 26 X 对镜4 Intermediate)  seed=81821033-7095
0.876s  13x2xr4di(阶 26 X 旋4 Intermediate)  seed=81821033-7071
0.877s  2x15xm8di(阶 30 X 镜8 Intermediate)  seed=81821033-1725
0.898s  13x2md4di(阶 26 对镜4 Intermediate)  seed=81821033-7047
0.909s  2x14m8di(阶 28 镜8 Intermediate)  seed=81821033-1581
0.938s  13x2xm4di(阶 26 X 镜4 Intermediate)  seed=81821033-7089
0.987s  14x2xm4di(阶 28 X 镜4 Intermediate)  seed=81821033-7281
1.018s  15x2xm8di(阶 30 X 镜8 Intermediate)  seed=81821033-7485
1.060s  2x14r4di(阶 28 旋4 Intermediate)  seed=81821033-1551
1.114s  3x9r4di(阶 27 旋4 Intermediate)  seed=81821033-2703
1.124s  2x14xmd4di(阶 28 X 对镜4 Intermediate)  seed=81821033-1623
1.126s  14x2m4di(阶 28 镜4 Intermediate)  seed=81821033-7233
1.298s  2x14m4di(阶 28 镜4 Intermediate)  seed=81821033-1569
1.302s  2x13di(阶 26 旋2 Intermediate)  seed=81821033-1449
1.344s  13x2md2di(阶 26 对镜2 Intermediate)  seed=81821033-7035
1.359s  14x2r4di(阶 28 旋4 Intermediate)  seed=81821033-7215
1.421s  7x4xm8di(阶 28 X 镜8 Intermediate)  seed=81821033-5469
1.450s  2x15m4di(阶 30 镜4 Intermediate)  seed=81821033-1665
1.497s  2x13md2di(阶 26 对镜2 Intermediate)  seed=81821033-1467
1.503s  13x2m2di(阶 26 镜2 Intermediate)  seed=81821033-7029
1.517s  14x2md4di(阶 28 对镜4 Intermediate)  seed=81821033-7239
1.548s  9x3xr4di(阶 27 X 旋4 Intermediate)  seed=81821033-6207
1.578s  2x15xmd4di(阶 30 X 对镜4 Intermediate)  seed=81821033-1719
1.676s  9x3m4di(阶 27 镜4 Intermediate)  seed=81821033-6177
1.692s  2x13m2di(阶 26 镜2 Intermediate)  seed=81821033-1461
1.716s  2x13xmd2di(阶 26 X 对镜2 Intermediate)  seed=81821033-1515
1.737s  13x2di(阶 26 旋2 Intermediate)  seed=81821033-7017
1.856s  4x7md4di(阶 28 对镜4 Intermediate)  seed=81821033-3687
1.902s  7x4r4di(阶 28 旋4 Intermediate)  seed=81821033-5391
1.973s  2x13xdi(阶 26 X 旋2 Intermediate)  seed=81821033-1497
2.050s  2x14di(阶 28 旋2 Intermediate)  seed=81821033-1545
2.277s  4x7xr4di(阶 28 X 旋4 Intermediate)  seed=81821033-3711
2.291s  3x9xmd4di(阶 27 X 对镜4 Intermediate)  seed=81821033-2775
2.308s  4x7m8di(阶 28 镜8 Intermediate)  seed=81821033-3693
2.388s  2x15r4di(阶 30 旋4 Intermediate)  seed=81821033-1647
2.396s  2x14md4di(阶 28 对镜4 Intermediate)  seed=81821033-1575
2.446s  14x2xr4di(阶 28 X 旋4 Intermediate)  seed=81821033-7263
2.493s  7x4m8di(阶 28 镜8 Intermediate)  seed=81821033-5421
2.576s  2x14xm2di(阶 28 X 镜2 Intermediate)  seed=81821033-1605
2.644s  9x3xmd4di(阶 27 X 对镜4 Intermediate)  seed=81821033-6231
2.686s  4x7m4di(阶 28 镜4 Intermediate)  seed=81821033-3681
2.719s  3x9xr4di(阶 27 X 旋4 Intermediate)  seed=81821033-2751
2.799s  14x2m2di(阶 28 镜2 Intermediate)  seed=81821033-7221
2.800s  4x7r4di(阶 28 旋4 Intermediate)  seed=81821033-3663
2.811s  14x2xmd4di(阶 28 X 对镜4 Intermediate)  seed=81821033-7287
2.865s  10x3r4di(阶 30 旋4 Intermediate)  seed=81821033-6447
2.888s  2x14xdi(阶 28 X 旋2 Intermediate)  seed=81821033-1593
2.896s  2x14md2di(阶 28 对镜2 Intermediate)  seed=81821033-1563
2.985s  13x2adi(阶 26 无 Intermediate)  seed=81821033-7011
3.229s  3x9m2di(阶 27 镜2 Intermediate)  seed=81821033-2709
3.239s  2x13r4di(阶 26 旋4 Intermediate)  seed=81821033-1455
3.246s  4x7xmd4di(阶 28 X 对镜4 Intermediate)  seed=81821033-3735
3.263s  13x2xmd2di(阶 26 X 对镜2 Intermediate)  seed=81821033-7083
3.293s  2x15m2di(阶 30 镜2 Intermediate)  seed=81821033-1653
3.371s  2x13xadi(阶 26 X 无 Intermediate)  seed=81821033-1491
3.411s  6x5m4di(阶 30 镜4 Intermediate)  seed=81821033-4929
3.415s  14x2xmd2di(阶 28 X 对镜2 Intermediate)  seed=81821033-7275
3.424s  2x15di(阶 30 旋2 Intermediate)  seed=81821033-1641
3.438s  2x15xm2di(阶 30 X 镜2 Intermediate)  seed=81821033-1701
3.472s  4x7xm8di(阶 28 X 镜8 Intermediate)  seed=81821033-3741
3.486s  2x15xr4di(阶 30 X 旋4 Intermediate)  seed=81821033-1695
3.573s  15x2xmd2di(阶 30 X 对镜2 Intermediate)  seed=81821033-7467
3.584s  7x4m4di(阶 28 镜4 Intermediate)  seed=81821033-5409
3.606s  2x15md2di(阶 30 对镜2 Intermediate)  seed=81821033-1659
3.608s  13x2m4di(阶 26 镜4 Intermediate)  seed=81821033-7041
3.614s  9x3xdi(阶 27 X 旋2 Intermediate)  seed=81821033-6201
3.707s  5x6xm4di(阶 30 X 镜4 Intermediate)  seed=81821033-4401
3.724s  4x7di(阶 28 旋2 Intermediate)  seed=81821033-3657
3.938s  14x2xdi(阶 28 X 旋2 Intermediate)  seed=81821033-7257
3.962s  15x2xdi(阶 30 X 旋2 Intermediate)  seed=81821033-7449
3.969s  5x6md4di(阶 30 对镜4 Intermediate)  seed=81821033-4359
4.010s  9x3xm2di(阶 27 X 镜2 Intermediate)  seed=81821033-6213
4.040s  14x2md2di(阶 28 对镜2 Intermediate)  seed=81821033-7227
4.147s  10x3md4di(阶 30 对镜4 Intermediate)  seed=81821033-6471
4.283s  9x3xmd2di(阶 27 X 对镜2 Intermediate)  seed=81821033-6219
4.293s  3x9xm2di(阶 27 X 镜2 Intermediate)  seed=81821033-2757
4.401s  2x13xm2di(阶 26 X 镜2 Intermediate)  seed=81821033-1509
4.408s  7x4m2di(阶 28 镜2 Intermediate)  seed=81821033-5397
4.413s  7x4xr4di(阶 28 X 旋4 Intermediate)  seed=81821033-5439
4.447s  15x2m2di(阶 30 镜2 Intermediate)  seed=81821033-7413
4.529s  15x2di(阶 30 旋2 Intermediate)  seed=81821033-7401
4.642s  4x7m2di(阶 28 镜2 Intermediate)  seed=81821033-3669
4.662s  9x3m2di(阶 27 镜2 Intermediate)  seed=81821033-6165
4.750s  6x5xm8di(阶 30 X 镜8 Intermediate)  seed=81821033-4989
4.787s  6x5m8di(阶 30 镜8 Intermediate)  seed=81821033-4941
4.932s  7x4md4di(阶 28 对镜4 Intermediate)  seed=81821033-5415
4.933s  7x4di(阶 28 旋2 Intermediate)  seed=81821033-5385
4.934s  13x2xdi(阶 26 X 旋2 Intermediate)  seed=81821033-7065
5.112s  5x6m8di(阶 30 镜8 Intermediate)  seed=81821033-4365
5.225s  3x9xdi(阶 27 X 旋2 Intermediate)  seed=81821033-2745
5.250s  2x14xm4di(阶 28 X 镜4 Intermediate)  seed=81821033-1617
5.313s  4x7md2di(阶 28 对镜2 Intermediate)  seed=81821033-3675
5.369s  6x5md4di(阶 30 对镜4 Intermediate)  seed=81821033-4935
5.376s  2x14adi(阶 28 无 Intermediate)  seed=81821033-1539
5.422s  2x14m2di(阶 28 镜2 Intermediate)  seed=81821033-1557
5.485s  2x14xr4di(阶 28 X 旋4 Intermediate)  seed=81821033-1599
5.486s  9x3xm8di(阶 27 X 镜8 Intermediate)  seed=81821033-6237
5.531s  15x2md2di(阶 30 对镜2 Intermediate)  seed=81821033-7419
5.562s  2x13adi(阶 26 无 Intermediate)  seed=81821033-1443
5.675s  7x4xdi(阶 28 X 旋2 Intermediate)  seed=81821033-5433
5.724s  7x4xm2di(阶 28 X 镜2 Intermediate)  seed=81821033-5445
5.988s  7x4md2di(阶 28 对镜2 Intermediate)  seed=81821033-5403
6.159s  7x4xmd2di(阶 28 X 对镜2 Intermediate)  seed=81821033-5451
6.166s  15x2xm2di(阶 30 X 镜2 Intermediate)  seed=81821033-7461
6.221s  6x5xmd4di(阶 30 X 对镜4 Intermediate)  seed=81821033-4983
6.265s  3x9m4di(阶 27 镜4 Intermediate)  seed=81821033-2721
6.316s  9x3xm4di(阶 27 X 镜4 Intermediate)  seed=81821033-6225
6.361s  4x7xmd2di(阶 28 X 对镜2 Intermediate)  seed=81821033-3723
6.377s  3x9di(阶 27 旋2 Intermediate)  seed=81821033-2697
6.500s  9x3adi(阶 27 无 Intermediate)  seed=81821033-6147
6.631s  9x3md4di(阶 27 对镜4 Intermediate)  seed=81821033-6183
6.653s  9x3di(阶 27 旋2 Intermediate)  seed=81821033-6153
6.825s  15x2xmd4di(阶 30 X 对镜4 Intermediate)  seed=81821033-7479
7.028s  13x2xadi(阶 26 X 无 Intermediate)  seed=81821033-7059
7.070s  14x2adi(阶 28 无 Intermediate)  seed=81821033-7203
7.365s  4x7xm4di(阶 28 X 镜4 Intermediate)  seed=81821033-3729
7.482s  14x2di(阶 28 旋2 Intermediate)  seed=81821033-7209
7.527s  6x5xm2di(阶 30 X 镜2 Intermediate)  seed=81821033-4965
7.631s  6x5di(阶 30 旋2 Intermediate)  seed=81821033-4905
7.720s  14x2xadi(阶 28 X 无 Intermediate)  seed=81821033-7251
7.740s  15x2r4di(阶 30 旋4 Intermediate)  seed=81821033-7407
7.901s  14x2xm8di(阶 28 X 镜8 Intermediate)  seed=81821033-7293
8.254s  2x15adi(阶 30 无 Intermediate)  seed=81821033-1635
8.274s  10x3md2di(阶 30 对镜2 Intermediate)  seed=81821033-6459
8.542s  14x2xm2di(阶 28 X 镜2 Intermediate)  seed=81821033-7269
8.578s  6x5r4di(阶 30 旋4 Intermediate)  seed=81821033-4911
8.940s  7x4xm4di(阶 28 X 镜4 Intermediate)  seed=81821033-5457
8.965s  9x3r4di(阶 27 旋4 Intermediate)  seed=81821033-6159
9.168s  5x6m2di(阶 30 镜2 Intermediate)  seed=81821033-4341
9.282s  13x2xm2di(阶 26 X 镜2 Intermediate)  seed=81821033-7077
9.417s  3x9adi(阶 27 无 Intermediate)  seed=81821033-2691
9.653s  2x15xdi(阶 30 X 旋2 Intermediate)  seed=81821033-1689
9.723s  2x14xadi(阶 28 X 无 Intermediate)  seed=81821033-1587
```

### 难度分档上限(Extreme 16) —— 142 格(规则依据是生成代价,能秒生成就是判错了)

```
0.131s  3x6m8de(阶 18 镜8 Extreme)  seed=81821033-2447
0.427s  2x9m8de(阶 18 镜8 Extreme)  seed=81821033-1103
0.439s  6x3md4de(阶 18 对镜4 Extreme)  seed=81821033-4745
0.447s  2x9m4de(阶 18 镜4 Extreme)  seed=81821033-1091
0.517s  6x3r4de(阶 18 旋4 Extreme)  seed=81821033-4721
0.530s  10x2m8de(阶 20 镜8 Extreme)  seed=81821033-6383
0.569s  3x6r4de(阶 18 旋4 Extreme)  seed=81821033-2417
0.639s  6x3m8de(阶 18 镜8 Extreme)  seed=81821033-4751
0.649s  9x2m8de(阶 18 镜8 Extreme)  seed=81821033-6095
0.680s  9x2r4de(阶 18 旋4 Extreme)  seed=81821033-6065
0.703s  2x9md4de(阶 18 对镜4 Extreme)  seed=81821033-1097
0.728s  2x9de(阶 18 旋2 Extreme)  seed=81821033-1067
0.744s  2x9xmd4de(阶 18 X 对镜4 Extreme)  seed=81821033-1145
0.796s  3x6xm8de(阶 18 X 镜8 Extreme)  seed=81821033-2495
0.857s  6x3xr4de(阶 18 X 旋4 Extreme)  seed=81821033-4769
1.057s  3x6m4de(阶 18 镜4 Extreme)  seed=81821033-2435
1.108s  9x2md4de(阶 18 对镜4 Extreme)  seed=81821033-6089
1.160s  9x2xmd4de(阶 18 X 对镜4 Extreme)  seed=81821033-6137
1.237s  6x3md2de(阶 18 对镜2 Extreme)  seed=81821033-4733
1.256s  2x9m2de(阶 18 镜2 Extreme)  seed=81821033-1079
1.262s  9x2m4de(阶 18 镜4 Extreme)  seed=81821033-6083
1.298s  10x2xm8de(阶 20 X 镜8 Extreme)  seed=81821033-6431
1.477s  2x9xr4de(阶 18 X 旋4 Extreme)  seed=81821033-1121
1.607s  2x9r4de(阶 18 旋4 Extreme)  seed=81821033-1073
1.612s  6x3m4de(阶 18 镜4 Extreme)  seed=81821033-4739
1.620s  9x2de(阶 18 旋2 Extreme)  seed=81821033-6059
1.629s  3x6xr4de(阶 18 X 旋4 Extreme)  seed=81821033-2465
1.642s  6x3xmd4de(阶 18 X 对镜4 Extreme)  seed=81821033-4793
1.650s  3x6md4de(阶 18 对镜4 Extreme)  seed=81821033-2441
1.667s  2x9md2de(阶 18 对镜2 Extreme)  seed=81821033-1085
1.692s  2x10r4de(阶 20 旋4 Extreme)  seed=81821033-1169
1.733s  9x2xm8de(阶 18 X 镜8 Extreme)  seed=81821033-6143
1.816s  5x4m8de(阶 20 镜8 Extreme)  seed=81821033-4175
1.887s  2x10m8de(阶 20 镜8 Extreme)  seed=81821033-1199
1.914s  9x2xm4de(阶 18 X 镜4 Extreme)  seed=81821033-6131
2.000s  2x9xm4de(阶 18 X 镜4 Extreme)  seed=81821033-1139
2.021s  2x10de(阶 20 旋2 Extreme)  seed=81821033-1163
2.022s  2x9xmd2de(阶 18 X 对镜2 Extreme)  seed=81821033-1133
2.072s  3x6md2de(阶 18 对镜2 Extreme)  seed=81821033-2429
2.079s  2x10m4de(阶 20 镜4 Extreme)  seed=81821033-1187
2.203s  2x10md2de(阶 20 对镜2 Extreme)  seed=81821033-1181
2.212s  5x4xm8de(阶 20 X 镜8 Extreme)  seed=81821033-4223
2.277s  6x3de(阶 18 旋2 Extreme)  seed=81821033-4715
2.342s  3x6xmd2de(阶 18 X 对镜2 Extreme)  seed=81821033-2477
2.364s  10x2xr4de(阶 20 X 旋4 Extreme)  seed=81821033-6401
2.499s  2x10xm8de(阶 20 X 镜8 Extreme)  seed=81821033-1247
2.519s  10x2xmd4de(阶 20 X 对镜4 Extreme)  seed=81821033-6425
2.538s  9x2xr4de(阶 18 X 旋4 Extreme)  seed=81821033-6113
2.561s  3x6de(阶 18 旋2 Extreme)  seed=81821033-2411
2.598s  7x3md4de(阶 21 对镜4 Extreme)  seed=81821033-5321
2.617s  2x10xr4de(阶 20 X 旋4 Extreme)  seed=81821033-1217
2.736s  4x5md4de(阶 20 对镜4 Extreme)  seed=81821033-3497
2.783s  3x6m2de(阶 18 镜2 Extreme)  seed=81821033-2423
2.801s  6x3xm4de(阶 18 X 镜4 Extreme)  seed=81821033-4787
2.806s  6x3m2de(阶 18 镜2 Extreme)  seed=81821033-4727
2.840s  2x10xmd4de(阶 20 X 对镜4 Extreme)  seed=81821033-1241
2.881s  2x10xm4de(阶 20 X 镜4 Extreme)  seed=81821033-1235
2.992s  9x2m2de(阶 18 镜2 Extreme)  seed=81821033-6071
3.043s  9x2md2de(阶 18 对镜2 Extreme)  seed=81821033-6077
3.087s  4x5md2de(阶 20 对镜2 Extreme)  seed=81821033-3485
3.155s  10x2md4de(阶 20 对镜4 Extreme)  seed=81821033-6377
3.197s  7x3r4de(阶 21 旋4 Extreme)  seed=81821033-5297
3.232s  11x2r4de(阶 22 旋4 Extreme)  seed=81821033-6641
3.245s  2x9xm8de(阶 18 X 镜8 Extreme)  seed=81821033-1151
3.261s  6x3xmd2de(阶 18 X 对镜2 Extreme)  seed=81821033-4781
3.396s  3x7m8de(阶 21 镜8 Extreme)  seed=81821033-2543
3.401s  5x4r4de(阶 20 旋4 Extreme)  seed=81821033-4145
3.412s  3x7r4de(阶 21 旋4 Extreme)  seed=81821033-2513
3.414s  11x2md4de(阶 22 对镜4 Extreme)  seed=81821033-6665
3.513s  9x2xde(阶 18 X 旋2 Extreme)  seed=81821033-6107
3.516s  7x3m8de(阶 21 镜8 Extreme)  seed=81821033-5327
3.538s  5x4m4de(阶 20 镜4 Extreme)  seed=81821033-4163
3.573s  2x11r4de(阶 22 旋4 Extreme)  seed=81821033-1265
3.621s  3x6ade(阶 18 无 Extreme)  seed=81821033-2405
3.639s  5x4xr4de(阶 20 X 旋4 Extreme)  seed=81821033-4193
3.784s  6x3xm8de(阶 18 X 镜8 Extreme)  seed=81821033-4799
3.883s  7x3xr4de(阶 21 X 旋4 Extreme)  seed=81821033-5345
4.024s  3x7md4de(阶 21 对镜4 Extreme)  seed=81821033-2537
4.084s  3x6xde(阶 18 X 旋2 Extreme)  seed=81821033-2459
4.113s  2x10md4de(阶 20 对镜4 Extreme)  seed=81821033-1193
4.154s  11x2de(阶 22 旋2 Extreme)  seed=81821033-6635
4.179s  6x3xde(阶 18 X 旋2 Extreme)  seed=81821033-4763
4.322s  5x4de(阶 20 旋2 Extreme)  seed=81821033-4139
4.369s  10x2xde(阶 20 X 旋2 Extreme)  seed=81821033-6395
4.374s  9x2xmd2de(阶 18 X 对镜2 Extreme)  seed=81821033-6125
4.487s  5x4xm4de(阶 20 X 镜4 Extreme)  seed=81821033-4211
4.531s  9x2ade(阶 18 无 Extreme)  seed=81821033-6053
4.568s  4x5xr4de(阶 20 X 旋4 Extreme)  seed=81821033-3521
4.669s  2x11xm8de(阶 22 X 镜8 Extreme)  seed=81821033-1343
4.720s  4x5r4de(阶 20 旋4 Extreme)  seed=81821033-3473
4.754s  3x6xm2de(阶 18 X 镜2 Extreme)  seed=81821033-2471
4.777s  7x3m4de(阶 21 镜4 Extreme)  seed=81821033-5315
4.865s  10x2m4de(阶 20 镜4 Extreme)  seed=81821033-6371
4.933s  4x5de(阶 20 旋2 Extreme)  seed=81821033-3467
4.986s  2x11m4de(阶 22 镜4 Extreme)  seed=81821033-1283
5.042s  10x2r4de(阶 20 旋4 Extreme)  seed=81821033-6353
5.127s  10x2xm2de(阶 20 X 镜2 Extreme)  seed=81821033-6407
5.225s  2x10xmd2de(阶 20 X 对镜2 Extreme)  seed=81821033-1229
5.359s  4x5xm8de(阶 20 X 镜8 Extreme)  seed=81821033-3551
5.424s  10x2m2de(阶 20 镜2 Extreme)  seed=81821033-6359
5.475s  10x2xmd2de(阶 20 X 对镜2 Extreme)  seed=81821033-6413
5.492s  11x2xr4de(阶 22 X 旋4 Extreme)  seed=81821033-6689
5.587s  6x3ade(阶 18 无 Extreme)  seed=81821033-4709
5.641s  5x4xmd2de(阶 20 X 对镜2 Extreme)  seed=81821033-4205
5.802s  11x2md2de(阶 22 对镜2 Extreme)  seed=81821033-6653
5.890s  4x5m8de(阶 20 镜8 Extreme)  seed=81821033-3503
5.940s  10x2md2de(阶 20 对镜2 Extreme)  seed=81821033-6365
6.025s  2x10xm2de(阶 20 X 镜2 Extreme)  seed=81821033-1223
6.030s  3x7xr4de(阶 21 X 旋4 Extreme)  seed=81821033-2561
6.150s  7x3xmd4de(阶 21 X 对镜4 Extreme)  seed=81821033-5369
6.213s  10x2xm4de(阶 20 X 镜4 Extreme)  seed=81821033-6419
6.452s  2x9xde(阶 18 X 旋2 Extreme)  seed=81821033-1115
6.660s  2x11xr4de(阶 22 X 旋4 Extreme)  seed=81821033-1313
6.722s  2x12m8de(阶 24 镜8 Extreme)  seed=81821033-1391
6.917s  2x11xm4de(阶 22 X 镜4 Extreme)  seed=81821033-1331
7.060s  5x4xde(阶 20 X 旋2 Extreme)  seed=81821033-4187
7.063s  2x11m8de(阶 22 镜8 Extreme)  seed=81821033-1295
7.180s  6x4m8de(阶 24 镜8 Extreme)  seed=81821033-4847
7.192s  12x2r4de(阶 24 旋4 Extreme)  seed=81821033-6833
7.303s  3x7xmd4de(阶 21 X 对镜4 Extreme)  seed=81821033-2585
7.363s  2x11de(阶 22 旋2 Extreme)  seed=81821033-1259
7.405s  5x4m2de(阶 20 镜2 Extreme)  seed=81821033-4151
7.494s  4x6m8de(阶 24 镜8 Extreme)  seed=81821033-3599
7.503s  4x5m2de(阶 20 镜2 Extreme)  seed=81821033-3479
7.617s  8x3r4de(阶 24 旋4 Extreme)  seed=81821033-5777
7.645s  2x10ade(阶 20 无 Extreme)  seed=81821033-1157
7.746s  10x2de(阶 20 旋2 Extreme)  seed=81821033-6347
7.985s  11x2xm2de(阶 22 X 镜2 Extreme)  seed=81821033-6695
8.004s  4x5xmd4de(阶 20 X 对镜4 Extreme)  seed=81821033-3545
8.035s  7x3xm8de(阶 21 X 镜8 Extreme)  seed=81821033-5375
8.046s  11x2xm8de(阶 22 X 镜8 Extreme)  seed=81821033-6719
8.125s  10x2ade(阶 20 无 Extreme)  seed=81821033-6341
8.314s  6x3xm2de(阶 18 X 镜2 Extreme)  seed=81821033-4775
8.361s  8x3m8de(阶 24 镜8 Extreme)  seed=81821033-5807
8.513s  2x9xm2de(阶 18 X 镜2 Extreme)  seed=81821033-1127
8.520s  2x11md4de(阶 22 对镜4 Extreme)  seed=81821033-1289
8.717s  6x3xade(阶 18 X 无 Extreme)  seed=81821033-4757
9.315s  9x2xm2de(阶 18 X 镜2 Extreme)  seed=81821033-6119
9.504s  11x2m8de(阶 22 镜8 Extreme)  seed=81821033-6671
9.564s  5x4md2de(阶 20 对镜2 Extreme)  seed=81821033-4157
9.867s  5x4xmd4de(阶 20 X 对镜4 Extreme)  seed=81821033-4217
9.905s  3x6xm4de(阶 18 X 镜4 Extreme)  seed=81821033-2483
```

### Jigsaw 下限 4 —— 84 格(规则依据不是生成代价)

```
0.000s  3jmd4du(阶 3 对镜4 Unreasonable)  seed=81821033-1770
0.000s  2jmd4di(阶 2 对镜4 Intermediate)  seed=81821033-39
0.000s  2jmd4da(阶 2 对镜4 Advanced)  seed=81821033-40
0.000s  3jm4(阶 3 镜4 Trivial)  seed=81821033-1759
0.000s  3jm8de(阶 3 镜8 Extreme)  seed=81821033-1775
0.000s  3jmd4(阶 3 对镜4 Trivial)  seed=81821033-1765
0.000s  2jmd4de(阶 2 对镜4 Extreme)  seed=81821033-41
0.000s  3jkadi(阶 3 Killer 无 Intermediate)  seed=81821033-1779
0.000s  2jm2du(阶 2 镜2 Unreasonable)  seed=81821033-24
0.000s  3jdb(阶 3 旋2 Basic)  seed=81821033-1736
…… 另 74 格同类,全名单见 results-cap10.tsv
```

### Killer 钉对称 + 2×2 对称白名单 —— 72 格(规则依据不是生成代价)

```
0.000s  2x2kmd2(阶 4 Killer 对镜2 Trivial)  seed=81821033-169
0.000s  2x2km4de(阶 4 Killer 镜4 Extreme)  seed=81821033-179
0.000s  2x2xkm8db(阶 4 X Killer 镜8 Basic)  seed=81821033-284
0.000s  2x2km2du(阶 4 Killer 镜2 Unreasonable)  seed=81821033-168
0.000s  2x2xkm8(阶 4 X Killer 镜8 Trivial)  seed=81821033-283
0.000s  2x2xkr4de(阶 4 X Killer 旋4 Extreme)  seed=81821033-257
0.000s  2x2kr4da(阶 4 Killer 旋4 Advanced)  seed=81821033-160
0.000s  2x2xkmd4di(阶 4 X Killer 对镜4 Intermediate)  seed=81821033-279
0.000s  2x2xkr4da(阶 4 X Killer 旋4 Advanced)  seed=81821033-256
0.000s  2x2xkm8de(阶 4 X Killer 镜8 Extreme)  seed=81821033-287
…… 另 62 格同类,全名单见 results-cap10.tsv
```

### 2×2 对称白名单 —— 51 格(规则依据不是生成代价)

```
0.000s  2x2md4du(阶 4 对镜4 Unreasonable)  seed=81821033-138
0.000s  2x2xmd4db(阶 4 X 对镜4 Basic)  seed=81821033-230
0.000s  2x2xm2di(阶 4 X 镜2 Intermediate)  seed=81821033-213
0.000s  2x2m2di(阶 4 镜2 Intermediate)  seed=81821033-117
0.000s  2x2md2de(阶 4 对镜2 Extreme)  seed=81821033-125
0.000s  2x2xmd4di(阶 4 X 对镜4 Intermediate)  seed=81821033-231
0.000s  2x2xmd2db(阶 4 X 对镜2 Basic)  seed=81821033-218
0.000s  2x2md2(阶 4 对镜2 Trivial)  seed=81821033-121
0.000s  2x2xr4di(阶 4 X 旋4 Intermediate)  seed=81821033-207
0.000s  2x2md4di(阶 4 对镜4 Intermediate)  seed=81821033-135
…… 另 41 格同类,全名单见 results-cap10.tsv
```

### Killer 钉对称 + Jigsaw 下限 4 —— 42 格(规则依据不是生成代价)

```
0.000s  3jkm2db(阶 3 Killer 镜2 Basic)  seed=81821033-1796
0.000s  3jkmd4db(阶 3 Killer 对镜4 Basic)  seed=81821033-1814
0.000s  3jkde(阶 3 Killer 旋2 Extreme)  seed=81821033-1787
0.000s  3jkm4db(阶 3 Killer 镜4 Basic)  seed=81821033-1808
0.000s  3jkm8di(阶 3 Killer 镜8 Intermediate)  seed=81821033-1821
0.000s  3jkm4di(阶 3 Killer 镜4 Intermediate)  seed=81821033-1809
0.000s  3jkr4da(阶 3 Killer 旋4 Advanced)  seed=81821033-1792
0.000s  3jkm4du(阶 3 Killer 镜4 Unreasonable)  seed=81821033-1812
0.000s  3jkm4da(阶 3 Killer 镜4 Advanced)  seed=81821033-1810
0.000s  3jkm4(阶 3 Killer 镜4 Trivial)  seed=81821033-1807
…… 另 32 格同类,全名单见 results-cap10.tsv
```

### Jigsaw 上限 12 —— 28 格(规则依据是生成代价,能秒生成就是判错了)

```
0.657s  13jmd2(阶 13 对镜2 Trivial)  seed=81821033-6937
1.298s  14jr4db(阶 14 旋4 Basic)  seed=81821033-7118
1.359s  13jm2(阶 13 镜2 Trivial)  seed=81821033-6931
1.579s  13jm4db(阶 13 镜4 Basic)  seed=81821033-6944
1.709s  13jmd4de(阶 13 对镜4 Extreme)  seed=81821033-6953
2.010s  13jr4(阶 13 旋4 Trivial)  seed=81821033-6925
2.123s  13jm8(阶 13 镜8 Trivial)  seed=81821033-6955
2.396s  13jdb(阶 13 旋2 Basic)  seed=81821033-6920
2.432s  13jm2de(阶 13 镜2 Extreme)  seed=81821033-6935
2.785s  14jmd2db(阶 14 对镜2 Basic)  seed=81821033-7130
3.040s  13jm8di(阶 13 镜8 Intermediate)  seed=81821033-6957
3.441s  13jde(阶 13 旋2 Extreme)  seed=81821033-6923
3.458s  13jade(阶 13 无 Extreme)  seed=81821033-6917
3.526s  13jmd4db(阶 13 对镜4 Basic)  seed=81821033-6950
4.218s  13jada(阶 13 无 Advanced)  seed=81821033-6916
4.628s  13jmd2db(阶 13 对镜2 Basic)  seed=81821033-6938
4.799s  13jxada(阶 13 X 无 Advanced)  seed=81821033-6964
4.887s  13jr4da(阶 13 旋4 Advanced)  seed=81821033-6928
5.413s  13jmd4du(阶 13 对镜4 Unreasonable)  seed=81821033-6954
5.532s  14jdi(阶 14 旋2 Intermediate)  seed=81821033-7113
6.336s  13jmd4(阶 13 对镜4 Trivial)  seed=81821033-6949
6.826s  13ja(阶 13 无 Trivial)  seed=81821033-6913
8.659s  13jmd2de(阶 13 对镜2 Extreme)  seed=81821033-6941
8.694s  13jm8du(阶 13 镜8 Unreasonable)  seed=81821033-6960
8.842s  13jm2di(阶 13 镜2 Intermediate)  seed=81821033-6933
8.895s  15jmd4db(阶 15 对镜4 Basic)  seed=81821033-7334
9.693s  13jadi(阶 13 无 Intermediate)  seed=81821033-6915
9.961s  13jadb(阶 13 无 Basic)  seed=81821033-6914
```

### 难度分档上限(Unreasonable 16) —— 6 格(规则依据是生成代价,能秒生成就是判错了)

```
2.325s  2x9m8du(阶 18 镜8 Unreasonable)  seed=81821033-1104
3.546s  9x2md4du(阶 18 对镜4 Unreasonable)  seed=81821033-6090
5.001s  2x9r4du(阶 18 旋4 Unreasonable)  seed=81821033-1074
7.878s  6x3md4du(阶 18 对镜4 Unreasonable)  seed=81821033-4746
8.371s  9x2m8du(阶 18 镜8 Unreasonable)  seed=81821033-6096
9.360s  6x3m4du(阶 18 镜4 Unreasonable)  seed=81821033-4740
```

### 难度分档上限(Advanced 25) —— 5 格(规则依据是生成代价,能秒生成就是判错了)

```
4.787s  13x2m8da(阶 26 镜8 Advanced)  seed=81821033-7054
5.671s  13x2xm8da(阶 26 X 镜8 Advanced)  seed=81821033-7102
6.376s  2x13xm8da(阶 26 X 镜8 Advanced)  seed=81821033-1534
9.652s  13x2md4da(阶 26 对镜4 Advanced)  seed=81821033-7048
9.797s  2x13m8da(阶 26 镜8 Advanced)  seed=81821033-1486
```

## 留下却没跑出来(481 格)


### timeout —— 480 格

```
10.043s  5x6m2db(阶 30 镜2 Basic)  seed=81821033-4340
10.039s  3x10md2(阶 30 对镜2 Trivial)  seed=81821033-2809
10.033s  11x2xmd2da(阶 22 X 对镜2 Advanced)  seed=81821033-6700
10.032s  2x12xada(阶 24 X 无 Advanced)  seed=81821033-1396
10.026s  12jm4da(阶 12 镜4 Advanced)  seed=81821033-6754
10.025s  12jx(阶 12 X 旋2 Trivial)  seed=81821033-6775
10.022s  11jxmd2du(阶 11 X 对镜2 Unreasonable)  seed=81821033-6606
10.022s  4jr4da(阶 4 旋4 Advanced)  seed=81821033-2896
10.021s  7x3ada(阶 21 无 Advanced)  seed=81821033-5284
10.020s  2x3m8di(阶 6 镜8 Intermediate)  seed=81821033-333
10.018s  3x10xadb(阶 30 X 无 Basic)  seed=81821033-2834
10.018s  4jmd2da(阶 4 对镜2 Advanced)  seed=81821033-2908
10.018s  10x3(阶 30 旋2 Trivial)  seed=81821033-6439
10.016s  2x15xm2db(阶 30 X 镜2 Basic)  seed=81821033-1700
10.016s  5x5xadi(阶 25 X 无 Intermediate)  seed=81821033-4275
10.014s  3x2xm8da(阶 6 X 镜8 Advanced)  seed=81821033-1966
10.014s  7x3xda(阶 21 X 旋2 Advanced)  seed=81821033-5338
10.014s  10x3m4db(阶 30 镜4 Basic)  seed=81821033-6464
10.013s  10x3m8(阶 30 镜8 Trivial)  seed=81821033-6475
10.013s  10x3xr4db(阶 30 X 旋4 Basic)  seed=81821033-6494
10.013s  2x8xm4du(阶 16 X 镜4 Unreasonable)  seed=81821033-1044
10.013s  10x3x(阶 30 X 旋2 Trivial)  seed=81821033-6487
10.013s  2x8xm8du(阶 16 X 镜8 Unreasonable)  seed=81821033-1056
10.012s  12jxm4de(阶 12 X 镜4 Extreme)  seed=81821033-6803
10.012s  4jxmd2da(阶 4 X 对镜2 Advanced)  seed=81821033-3004
10.012s  10x3xa(阶 30 X 无 Trivial)  seed=81821033-6481
10.011s  11jxdu(阶 11 X 旋2 Unreasonable)  seed=81821033-6588
10.011s  4x6xda(阶 24 X 旋2 Advanced)  seed=81821033-3610
10.011s  5x3xmd4du(阶 15 X 对镜4 Unreasonable)  seed=81821033-4122
10.011s  5x6db(阶 30 旋2 Basic)  seed=81821033-4328
10.010s  10x3r4db(阶 30 旋4 Basic)  seed=81821033-6446
10.010s  6jxkade(阶 6 X Killer 无 Extreme)  seed=81821033-4565
10.010s  10jxm4de(阶 10 X 镜4 Extreme)  seed=81821033-6323
10.009s  9jxkadu(阶 9 X Killer 无 Unreasonable)  seed=81821033-6006
10.009s  9x3(阶 27 旋2 Trivial)  seed=81821033-6151
10.008s  4x4xm4du(阶 16 X 镜4 Unreasonable)  seed=81821033-3444
10.008s  3x5xr4du(阶 15 X 旋4 Unreasonable)  seed=81821033-2370
10.008s  2x3xm8du(阶 6 X 镜8 Unreasonable)  seed=81821033-432
10.008s  3x10xm2(阶 30 X 镜2 Trivial)  seed=81821033-2851
10.008s  3x8xm8da(阶 24 X 镜8 Advanced)  seed=81821033-2686
10.007s  10x3r4(阶 30 旋4 Trivial)  seed=81821033-6445
10.007s  4jxm8de(阶 4 X 镜8 Extreme)  seed=81821033-3023
10.007s  4jxm8db(阶 4 X 镜8 Basic)  seed=81821033-3020
10.007s  4x4xr4du(阶 16 X 旋4 Unreasonable)  seed=81821033-3426
10.007s  4jdu(阶 4 旋2 Unreasonable)  seed=81821033-2892
10.007s  4x6xmd2da(阶 24 X 对镜2 Advanced)  seed=81821033-3628
10.007s  4x6xr4da(阶 24 X 旋4 Advanced)  seed=81821033-3616
10.007s  12jxada(阶 12 X 无 Advanced)  seed=81821033-6772
10.007s  12jxmd4di(阶 12 X 对镜4 Intermediate)  seed=81821033-6807
10.007s  12jxm8da(阶 12 X 镜8 Advanced)  seed=81821033-6814
10.007s  3x8xr4da(阶 24 X 旋4 Advanced)  seed=81821033-2656
10.006s  4jda(阶 4 旋2 Advanced)  seed=81821033-2890
10.006s  12jxda(阶 12 X 旋2 Advanced)  seed=81821033-6778
10.006s  2x8md2du(阶 16 对镜2 Unreasonable)  seed=81821033-990
10.006s  3x8xmd2da(阶 24 X 对镜2 Advanced)  seed=81821033-2668
10.006s  6x5(阶 30 旋2 Trivial)  seed=81821033-4903
10.005s  2x11xada(阶 22 X 无 Advanced)  seed=81821033-1300
10.005s  7x2xadu(阶 14 X 无 Unreasonable)  seed=81821033-5238
10.005s  5x5xmd4da(阶 25 X 对镜4 Advanced)  seed=81821033-4312
10.005s  9x3m2db(阶 27 镜2 Basic)  seed=81821033-6164
10.005s  4jm4de(阶 4 镜4 Extreme)  seed=81821033-2915
10.005s  10jxda(阶 10 X 旋2 Advanced)  seed=81821033-6298
10.004s  6x5db(阶 30 旋2 Basic)  seed=81821033-4904
10.004s  12jxm2de(阶 12 X 镜2 Extreme)  seed=81821033-6791
10.004s  2x8xmd2du(阶 16 X 对镜2 Unreasonable)  seed=81821033-1038
10.003s  4x5ada(阶 20 无 Advanced)  seed=81821033-3460
10.003s  12jxmd4(阶 12 X 对镜4 Trivial)  seed=81821033-6805
10.003s  5x6xmd4db(阶 30 X 对镜4 Basic)  seed=81821033-4406
10.003s  11jxm2db(阶 11 X 镜2 Basic)  seed=81821033-6596
10.003s  3x8da(阶 24 旋2 Advanced)  seed=81821033-2602
10.003s  6x4xada(阶 24 X 无 Advanced)  seed=81821033-4852
10.003s  2x7xr4du(阶 14 X 旋4 Unreasonable)  seed=81821033-930
10.003s  6x5md4(阶 30 对镜4 Trivial)  seed=81821033-4933
10.003s  4x4xadu(阶 16 X 无 Unreasonable)  seed=81821033-3414
10.003s  5x3xm4du(阶 15 X 镜4 Unreasonable)  seed=81821033-4116
10.003s  6x4xmd2da(阶 24 X 对镜2 Advanced)  seed=81821033-4876
10.003s  12jmd2da(阶 12 对镜2 Advanced)  seed=81821033-6748
10.003s  12jxmd4du(阶 12 X 对镜4 Unreasonable)  seed=81821033-6810
10.003s  12jxm4db(阶 12 X 镜4 Basic)  seed=81821033-6800
10.003s  5x3xmd2du(阶 15 X 对镜2 Unreasonable)  seed=81821033-4110
10.003s  6x5md2db(阶 30 对镜2 Basic)  seed=81821033-4922
10.003s  4jm4du(阶 4 镜4 Unreasonable)  seed=81821033-2916
10.003s  6x5a(阶 30 无 Trivial)  seed=81821033-4897
10.003s  12jxm8du(阶 12 X 镜8 Unreasonable)  seed=81821033-6816
10.003s  11jxm8de(阶 11 X 镜8 Extreme)  seed=81821033-6623
10.003s  3x10xm8(阶 30 X 镜8 Trivial)  seed=81821033-2875
10.003s  6x5xr4(阶 30 X 旋4 Trivial)  seed=81821033-4957
10.003s  12jxdu(阶 12 X 旋2 Unreasonable)  seed=81821033-6780
10.003s  8x3xmd4da(阶 24 X 对镜4 Advanced)  seed=81821033-5848
10.003s  5x4xada(阶 20 X 无 Advanced)  seed=81821033-4180
10.003s  4x7m4(阶 28 镜4 Trivial)  seed=81821033-3679
10.003s  4jm8du(阶 4 镜8 Unreasonable)  seed=81821033-2928
10.003s  11jxm4da(阶 11 X 镜4 Advanced)  seed=81821033-6610
10.003s  11jxm8di(阶 11 X 镜8 Intermediate)  seed=81821033-6621
10.003s  11jxm4du(阶 11 X 镜4 Unreasonable)  seed=81821033-6612
10.003s  7x2xmd2du(阶 14 X 对镜2 Unreasonable)  seed=81821033-5262
10.003s  3x2xmd4da(阶 6 X 对镜4 Advanced)  seed=81821033-1960
10.003s  3x8xm2da(阶 24 X 镜2 Advanced)  seed=81821033-2662
10.003s  12jdu(阶 12 旋2 Unreasonable)  seed=81821033-6732
10.003s  3x7xmd2da(阶 21 X 对镜2 Advanced)  seed=81821033-2572
10.003s  3x8m2da(阶 24 镜2 Advanced)  seed=81821033-2614
10.003s  5x6xmd2db(阶 30 X 对镜2 Basic)  seed=81821033-4394
10.003s  12jxadi(阶 12 X 无 Intermediate)  seed=81821033-6771
10.003s  5x3xm8du(阶 15 X 镜8 Unreasonable)  seed=81821033-4128
10.003s  11jxdi(阶 11 X 旋2 Intermediate)  seed=81821033-6585
10.003s  5x5xm4da(阶 25 X 镜4 Advanced)  seed=81821033-4306
10.003s  4x6xm2da(阶 24 X 镜2 Advanced)  seed=81821033-3622
10.003s  3x10a(阶 30 无 Trivial)  seed=81821033-2785
10.003s  5x6adb(阶 30 无 Basic)  seed=81821033-4322
10.003s  2x7xmd2du(阶 14 X 对镜2 Unreasonable)  seed=81821033-942
10.002s  12jxade(阶 12 X 无 Extreme)  seed=81821033-6773
10.002s  12jxm4di(阶 12 X 镜4 Intermediate)  seed=81821033-6801
10.002s  12jmd2du(阶 12 对镜2 Unreasonable)  seed=81821033-6750
10.002s  8jxkade(阶 8 X Killer 无 Extreme)  seed=81821033-5621
10.002s  3x9m8db(阶 27 镜8 Basic)  seed=81821033-2732
10.002s  8x3m2da(阶 24 镜2 Advanced)  seed=81821033-5782
10.002s  8x3xda(阶 24 X 旋2 Advanced)  seed=81821033-5818
10.002s  8x3xm8da(阶 24 X 镜8 Advanced)  seed=81821033-5854
10.002s  3x8xda(阶 24 X 旋2 Advanced)  seed=81821033-2650
10.002s  6jxm8du(阶 6 X 镜8 Unreasonable)  seed=81821033-4560
10.002s  6x4da(阶 24 旋2 Advanced)  seed=81821033-4810
10.002s  5x5ada(阶 25 无 Advanced)  seed=81821033-4228
10.002s  11jxde(阶 11 X 旋2 Extreme)  seed=81821033-6587
10.002s  6x5x(阶 30 X 旋2 Trivial)  seed=81821033-4951
10.002s  14x2xr4(阶 28 X 旋4 Trivial)  seed=81821033-7261
10.002s  3x5xmd2du(阶 15 X 对镜2 Unreasonable)  seed=81821033-2382
10.002s  10x3xm8(阶 30 X 镜8 Trivial)  seed=81821033-6523
10.002s  5x6m8db(阶 30 镜8 Basic)  seed=81821033-4364
10.002s  12x2xada(阶 24 X 无 Advanced)  seed=81821033-6868
10.002s  7x4r4db(阶 28 旋4 Basic)  seed=81821033-5390
10.002s  6x5xadb(阶 30 X 无 Basic)  seed=81821033-4946
10.002s  4jmd4de(阶 4 对镜4 Extreme)  seed=81821033-2921
10.002s  3x8xada(阶 24 X 无 Advanced)  seed=81821033-2644
10.002s  11jx(阶 11 X 旋2 Trivial)  seed=81821033-6583
10.002s  3x9md4db(阶 27 对镜4 Basic)  seed=81821033-2726
10.002s  8x3xmd2da(阶 24 X 对镜2 Advanced)  seed=81821033-5836
10.002s  5x5md2da(阶 25 对镜2 Advanced)  seed=81821033-4252
10.002s  12jxm8di(阶 12 X 镜8 Intermediate)  seed=81821033-6813
10.002s  4x4adu(阶 16 无 Unreasonable)  seed=81821033-3366
10.002s  3x9xmd2db(阶 27 X 对镜2 Basic)  seed=81821033-2762
10.002s  15x2xm8db(阶 30 X 镜8 Basic)  seed=81821033-7484
10.002s  11jxadu(阶 11 X 无 Unreasonable)  seed=81821033-6582
10.002s  11jxm8du(阶 11 X 镜8 Unreasonable)  seed=81821033-6624
10.002s  4jxmd4di(阶 4 X 对镜4 Intermediate)  seed=81821033-3015
10.002s  2x11xm2da(阶 22 X 镜2 Advanced)  seed=81821033-1318
10.002s  11jxmd4de(阶 11 X 对镜4 Extreme)  seed=81821033-6617
10.002s  3x10m4(阶 30 镜4 Trivial)  seed=81821033-2815
10.002s  3x8r4da(阶 24 旋4 Advanced)  seed=81821033-2608
10.002s  8x2adu(阶 16 无 Unreasonable)  seed=81821033-5670
10.002s  11jxmd4(阶 11 X 对镜4 Trivial)  seed=81821033-6613
10.002s  8x2xmd2du(阶 16 X 对镜2 Unreasonable)  seed=81821033-5742
10.002s  12jxm2da(阶 12 X 镜2 Advanced)  seed=81821033-6790
10.002s  4jm4da(阶 4 镜4 Advanced)  seed=81821033-2914
10.002s  10x3m2(阶 30 镜2 Trivial)  seed=81821033-6451
10.002s  5x6xmd2(阶 30 X 对镜2 Trivial)  seed=81821033-4393
10.002s  4x4xmd2du(阶 16 X 对镜2 Unreasonable)  seed=81821033-3438
10.002s  5x5xm8da(阶 25 X 镜8 Advanced)  seed=81821033-4318
10.002s  11jxada(阶 11 X 无 Advanced)  seed=81821033-6580
10.002s  9x3md2db(阶 27 对镜2 Basic)  seed=81821033-6170
10.002s  2x7xadu(阶 14 X 无 Unreasonable)  seed=81821033-918
10.002s  4x6xm8da(阶 24 X 镜8 Advanced)  seed=81821033-3646
10.002s  4x6da(阶 24 旋2 Advanced)  seed=81821033-3562
10.002s  4jmd4du(阶 4 对镜4 Unreasonable)  seed=81821033-2922
10.002s  5x6xm2db(阶 30 X 镜2 Basic)  seed=81821033-4388
10.002s  6x5xm2db(阶 30 X 镜2 Basic)  seed=81821033-4964
10.002s  6x5m2db(阶 30 镜2 Basic)  seed=81821033-4916
10.002s  4x6md2da(阶 24 对镜2 Advanced)  seed=81821033-3580
10.002s  6jxm8da(阶 6 X 镜8 Advanced)  seed=81821033-4558
10.001s  7x2xm8du(阶 14 X 镜8 Unreasonable)  seed=81821033-5280
10.001s  6x4xm4da(阶 24 X 镜4 Advanced)  seed=81821033-4882
10.001s  14x2xa(阶 28 X 无 Trivial)  seed=81821033-7249
10.001s  2x3xm4di(阶 6 X 镜4 Intermediate)  seed=81821033-417
10.001s  4jxm2da(阶 4 X 镜2 Advanced)  seed=81821033-2998
10.001s  11jm8da(阶 11 镜8 Advanced)  seed=81821033-6574
10.001s  10jxm2du(阶 10 X 镜2 Unreasonable)  seed=81821033-6312
10.001s  3x10xm4(阶 30 X 镜4 Trivial)  seed=81821033-2863
10.001s  10x3xm2(阶 30 X 镜2 Trivial)  seed=81821033-6499
10.001s  4jxmd4db(阶 4 X 对镜4 Basic)  seed=81821033-3014
10.001s  5x3xdu(阶 15 X 旋2 Unreasonable)  seed=81821033-4092
10.001s  4x6r4da(阶 24 旋4 Advanced)  seed=81821033-3568
10.001s  3x7m2da(阶 21 镜2 Advanced)  seed=81821033-2518
10.001s  10x3a(阶 30 无 Trivial)  seed=81821033-6433
10.001s  2x12xda(阶 24 X 旋2 Advanced)  seed=81821033-1402
10.001s  2x3xm8di(阶 6 X 镜8 Intermediate)  seed=81821033-429
10.001s  8x3xm2da(阶 24 X 镜2 Advanced)  seed=81821033-5830
10.001s  2x12xm8da(阶 24 X 镜8 Advanced)  seed=81821033-1438
10.001s  8x2xmd4du(阶 16 X 对镜4 Unreasonable)  seed=81821033-5754
10.001s  12jm8da(阶 12 镜8 Advanced)  seed=81821033-6766
10.001s  5x6xa(阶 30 X 无 Trivial)  seed=81821033-4369
10.001s  2x8xdu(阶 16 X 旋2 Unreasonable)  seed=81821033-1020
10.001s  5x5m8da(阶 25 镜8 Advanced)  seed=81821033-4270
10.001s  11jxdb(阶 11 X 旋2 Basic)  seed=81821033-6584
10.001s  12jxmd2db(阶 12 X 对镜2 Basic)  seed=81821033-6794
10.001s  8x2xadu(阶 16 X 无 Unreasonable)  seed=81821033-5718
10.001s  3x8xmd4da(阶 24 X 对镜4 Advanced)  seed=81821033-2680
10.001s  12jxr4db(阶 12 X 旋4 Basic)  seed=81821033-6782
10.001s  4jxr4da(阶 4 X 旋4 Advanced)  seed=81821033-2992
10.001s  5x3xr4du(阶 15 X 旋4 Unreasonable)  seed=81821033-4098
10.001s  11jxadi(阶 11 X 无 Intermediate)  seed=81821033-6579
10.001s  12jxm2di(阶 12 X 镜2 Intermediate)  seed=81821033-6789
10.001s  4jxdu(阶 4 X 旋2 Unreasonable)  seed=81821033-2988
10.001s  12jxm8de(阶 12 X 镜8 Extreme)  seed=81821033-6815
10.001s  6x5m8(阶 30 镜8 Trivial)  seed=81821033-4939
10.001s  5x6r4db(阶 30 旋4 Basic)  seed=81821033-4334
10.001s  3x10m8db(阶 30 镜8 Basic)  seed=81821033-2828
10.001s  12jxr4de(阶 12 X 旋4 Extreme)  seed=81821033-6785
10.001s  2x7xmd4du(阶 14 X 对镜4 Unreasonable)  seed=81821033-954
10.001s  4jxmd4da(阶 4 X 对镜4 Advanced)  seed=81821033-3016
10.001s  11jxr4de(阶 11 X 旋4 Extreme)  seed=81821033-6593
10.001s  4jxr4de(阶 4 X 旋4 Extreme)  seed=81821033-2993
10.001s  9x3xdb(阶 27 X 旋2 Basic)  seed=81821033-6200
10.001s  3x10md4(阶 30 对镜4 Trivial)  seed=81821033-2821
10.001s  5x3adu(阶 15 无 Unreasonable)  seed=81821033-4038
10.001s  12jxm4du(阶 12 X 镜4 Unreasonable)  seed=81821033-6804
10.001s  6x5r4db(阶 30 旋4 Basic)  seed=81821033-4910
10.001s  6x5m4(阶 30 镜4 Trivial)  seed=81821033-4927
10.001s  3x10xm2db(阶 30 X 镜2 Basic)  seed=81821033-2852
10.001s  8x3m4da(阶 24 镜4 Advanced)  seed=81821033-5794
10.001s  6x5r4(阶 30 旋4 Trivial)  seed=81821033-4909
10.001s  10x3xdb(阶 30 X 旋2 Basic)  seed=81821033-6488
10.001s  2x8xr4du(阶 16 X 旋4 Unreasonable)  seed=81821033-1026
10.001s  3x10md2db(阶 30 对镜2 Basic)  seed=81821033-2810
10.000s  11jxr4du(阶 11 X 旋4 Unreasonable)  seed=81821033-6594
10.000s  5x5da(阶 25 旋2 Advanced)  seed=81821033-4234
10.000s  2x7xdu(阶 14 X 旋2 Unreasonable)  seed=81821033-924
10.000s  10x3md2(阶 30 对镜2 Trivial)  seed=81821033-6457
10.000s  2x6xm2du(阶 12 X 镜2 Unreasonable)  seed=81821033-840
10.000s  7x2xdu(阶 14 X 旋2 Unreasonable)  seed=81821033-5244
10.000s  4x4xmd4du(阶 16 X 对镜4 Unreasonable)  seed=81821033-3450
10.000s  5x5xada(阶 25 X 无 Advanced)  seed=81821033-4276
10.000s  9x3x(阶 27 X 旋2 Trivial)  seed=81821033-6199
10.000s  4x6m4da(阶 24 镜4 Advanced)  seed=81821033-3586
10.000s  2x3xr4da(阶 6 X 旋4 Advanced)  seed=81821033-400
10.000s  2x12xmd4da(阶 24 X 对镜4 Advanced)  seed=81821033-1432
10.000s  3x10x(阶 30 X 旋2 Trivial)  seed=81821033-2839
10.000s  4x4xm2du(阶 16 X 镜2 Unreasonable)  seed=81821033-3432
10.000s  4jxr4du(阶 4 X 旋4 Unreasonable)  seed=81821033-2994
10.000s  4jxm2du(阶 4 X 镜2 Unreasonable)  seed=81821033-3000
10.000s  4jxada(阶 4 X 无 Advanced)  seed=81821033-2980
10.000s  10jxm8de(阶 10 X 镜8 Extreme)  seed=81821033-6335
10.000s  6x4ada(阶 24 无 Advanced)  seed=81821033-4804
10.000s  3x10xdb(阶 30 X 旋2 Basic)  seed=81821033-2840
10.000s  4x4md2du(阶 16 对镜2 Unreasonable)  seed=81821033-3390
10.000s  6x4xda(阶 24 X 旋2 Advanced)  seed=81821033-4858
10.000s  4jxadu(阶 4 X 无 Unreasonable)  seed=81821033-2982
10.000s  6x5m2(阶 30 镜2 Trivial)  seed=81821033-4915
10.000s  4x6md4da(阶 24 对镜4 Advanced)  seed=81821033-3592
10.000s  2x11ada(阶 22 无 Advanced)  seed=81821033-1252
10.000s  11jxadb(阶 11 X 无 Basic)  seed=81821033-6578
10.000s  6x4md2da(阶 24 对镜2 Advanced)  seed=81821033-4828
10.000s  4x6xmd4da(阶 24 X 对镜4 Advanced)  seed=81821033-3640
10.000s  6x5xm8db(阶 30 X 镜8 Basic)  seed=81821033-4988
10.000s  2x15xmd4db(阶 30 X 对镜4 Basic)  seed=81821033-1718
10.000s  12x2m2da(阶 24 镜2 Advanced)  seed=81821033-6838
10.000s  4x3xmd2du(阶 12 X 对镜2 Unreasonable)  seed=81821033-3342
10.000s  10x3xmd2db(阶 30 X 对镜2 Basic)  seed=81821033-6506
10.000s  6x5xdb(阶 30 X 旋2 Basic)  seed=81821033-4952
10.000s  9x3a(阶 27 无 Trivial)  seed=81821033-6145
10.000s  11jxm2du(阶 11 X 镜2 Unreasonable)  seed=81821033-6600
10.000s  5x5m4da(阶 25 镜4 Advanced)  seed=81821033-4258
10.000s  6x4m4da(阶 24 镜4 Advanced)  seed=81821033-4834
10.000s  2x12xmd2da(阶 24 X 对镜2 Advanced)  seed=81821033-1420
10.000s  10x3xm8db(阶 30 X 镜8 Basic)  seed=81821033-6524
10.000s  4x6ada(阶 24 无 Advanced)  seed=81821033-3556
10.000s  11jxda(阶 11 X 旋2 Advanced)  seed=81821033-6586
10.000s  4jr4di(阶 4 旋4 Intermediate)  seed=81821033-2895
10.000s  4jm8de(阶 4 镜8 Extreme)  seed=81821033-2927
10.000s  11jxmd4da(阶 11 X 对镜4 Advanced)  seed=81821033-6616
10.000s  4jm2da(阶 4 镜2 Advanced)  seed=81821033-2902
10.000s  5x6r4(阶 30 旋4 Trivial)  seed=81821033-4333
10.000s  12jxa(阶 12 X 无 Trivial)  seed=81821033-6769
10.000s  5x6xmd4(阶 30 X 对镜4 Trivial)  seed=81821033-4405
10.000s  3x2m8di(阶 6 镜8 Intermediate)  seed=81821033-1869
10.000s  5x3xm2du(阶 15 X 镜2 Unreasonable)  seed=81821033-4104
10.000s  4jxm4da(阶 4 X 镜4 Advanced)  seed=81821033-3010
10.000s  3x7xda(阶 21 X 旋2 Advanced)  seed=81821033-2554
10.000s  5x5xr4da(阶 25 X 旋4 Advanced)  seed=81821033-4288
10.000s  3x2m4du(阶 6 镜4 Unreasonable)  seed=81821033-1860
10.000s  4jm8da(阶 4 镜8 Advanced)  seed=81821033-2926
10.000s  8x3xr4da(阶 24 X 旋4 Advanced)  seed=81821033-5824
10.000s  3x9r4db(阶 27 旋4 Basic)  seed=81821033-2702
10.000s  3x8ada(阶 24 无 Advanced)  seed=81821033-2596
10.000s  8jxkadu(阶 8 X Killer 无 Unreasonable)  seed=81821033-5622
10.000s  6x4r4da(阶 24 旋4 Advanced)  seed=81821033-4816
10.000s  7x4xadb(阶 28 X 无 Basic)  seed=81821033-5426
10.000s  8x3xm4da(阶 24 X 镜4 Advanced)  seed=81821033-5842
10.000s  8x2xdu(阶 16 X 旋2 Unreasonable)  seed=81821033-5724
9.999s  12jxmd2du(阶 12 X 对镜2 Unreasonable)  seed=81821033-6798
9.999s  10x3xm2db(阶 30 X 镜2 Basic)  seed=81821033-6500
9.999s  2x8xm2du(阶 16 X 镜2 Unreasonable)  seed=81821033-1032
9.999s  4x6xada(阶 24 X 无 Advanced)  seed=81821033-3604
9.999s  3x10md4db(阶 30 对镜4 Basic)  seed=81821033-2822
9.999s  9jxkade(阶 9 X Killer 无 Extreme)  seed=81821033-6005
9.999s  12jxm4da(阶 12 X 镜4 Advanced)  seed=81821033-6802
9.999s  4jxmd2di(阶 4 X 对镜2 Intermediate)  seed=81821033-3003
9.999s  2x3m4di(阶 6 镜4 Intermediate)  seed=81821033-321
9.999s  12jr4de(阶 12 旋4 Extreme)  seed=81821033-6737
9.999s  10x3db(阶 30 旋2 Basic)  seed=81821033-6440
9.999s  5x6xr4(阶 30 X 旋4 Trivial)  seed=81821033-4381
9.999s  2x3m4du(阶 6 镜4 Unreasonable)  seed=81821033-324
9.999s  5x6xr4db(阶 30 X 旋4 Basic)  seed=81821033-4382
9.999s  4x6xm4da(阶 24 X 镜4 Advanced)  seed=81821033-3634
9.999s  3x4xm8du(阶 12 X 镜8 Unreasonable)  seed=81821033-2304
9.999s  10x2xada(阶 20 X 无 Advanced)  seed=81821033-6388
9.999s  11jxm2da(阶 11 X 镜2 Advanced)  seed=81821033-6598
9.999s  3x10adb(阶 30 无 Basic)  seed=81821033-2786
9.999s  11jxmd4db(阶 11 X 对镜4 Basic)  seed=81821033-6614
9.999s  5x5md4da(阶 25 对镜4 Advanced)  seed=81821033-4264
9.999s  12jm8de(阶 12 镜8 Extreme)  seed=81821033-6767
9.999s  11x2xada(阶 22 X 无 Advanced)  seed=81821033-6676
9.999s  15x2m4(阶 30 镜4 Trivial)  seed=81821033-7423
9.999s  3x5xdu(阶 15 X 旋2 Unreasonable)  seed=81821033-2364
9.999s  12jxmd2da(阶 12 X 对镜2 Advanced)  seed=81821033-6796
9.999s  3x9xdb(阶 27 X 旋2 Basic)  seed=81821033-2744
9.999s  5x6x(阶 30 X 旋2 Trivial)  seed=81821033-4375
9.999s  4jxda(阶 4 X 旋2 Advanced)  seed=81821033-2986
9.999s  3x10(阶 30 旋2 Trivial)  seed=81821033-2791
9.999s  4x5xmd2da(阶 20 X 对镜2 Advanced)  seed=81821033-3532
9.999s  8x3md2da(阶 24 对镜2 Advanced)  seed=81821033-5788
9.999s  4jr4du(阶 4 旋4 Unreasonable)  seed=81821033-2898
9.999s  4x4xm8du(阶 16 X 镜8 Unreasonable)  seed=81821033-3456
9.999s  10jxmd4de(阶 10 X 对镜4 Extreme)  seed=81821033-6329
9.999s  7x2xm2du(阶 14 X 镜2 Unreasonable)  seed=81821033-5256
9.999s  11jxmd2de(阶 11 X 对镜2 Extreme)  seed=81821033-6605
9.999s  3x7ada(阶 21 无 Advanced)  seed=81821033-2500
9.999s  9x3xm4(阶 27 X 镜4 Trivial)  seed=81821033-6223
9.999s  12jxadu(阶 12 X 无 Unreasonable)  seed=81821033-6774
9.999s  6x4m2da(阶 24 镜2 Advanced)  seed=81821033-4822
9.999s  2x3m8du(阶 6 镜8 Unreasonable)  seed=81821033-336
9.999s  3x10m2db(阶 30 镜2 Basic)  seed=81821033-2804
9.999s  8x3md4da(阶 24 对镜4 Advanced)  seed=81821033-5800
9.999s  4x5xada(阶 20 X 无 Advanced)  seed=81821033-3508
9.998s  12jxr4di(阶 12 X 旋4 Intermediate)  seed=81821033-6783
9.998s  8x3ada(阶 24 无 Advanced)  seed=81821033-5764
9.998s  3x10xr4(阶 30 X 旋4 Trivial)  seed=81821033-2845
9.998s  11jxmd2da(阶 11 X 对镜2 Advanced)  seed=81821033-6604
9.998s  9x3m4(阶 27 镜4 Trivial)  seed=81821033-6175
9.998s  10x3xmd4db(阶 30 X 对镜4 Basic)  seed=81821033-6518
9.998s  2x7xm8du(阶 14 X 镜8 Unreasonable)  seed=81821033-960
9.998s  3x4xmd2du(阶 12 X 对镜2 Unreasonable)  seed=81821033-2286
9.998s  9x3xmd4db(阶 27 X 对镜4 Basic)  seed=81821033-6230
9.998s  12jxmd4db(阶 12 X 对镜4 Basic)  seed=81821033-6806
9.998s  4jxr4di(阶 4 X 旋4 Intermediate)  seed=81821033-2991
9.998s  5x6xm8db(阶 30 X 镜8 Basic)  seed=81821033-4412
9.998s  12jxmd4da(阶 12 X 对镜4 Advanced)  seed=81821033-6808
9.998s  5x3xadu(阶 15 X 无 Unreasonable)  seed=81821033-4086
9.998s  4jada(阶 4 无 Advanced)  seed=81821033-2884
9.998s  10jxdu(阶 10 X 旋2 Unreasonable)  seed=81821033-6300
9.998s  4x7xmd4db(阶 28 X 对镜4 Basic)  seed=81821033-3734
9.998s  2x12m2da(阶 24 镜2 Advanced)  seed=81821033-1366
9.998s  4x7xmd2(阶 28 X 对镜2 Trivial)  seed=81821033-3721
9.998s  3x5xm4du(阶 15 X 镜4 Unreasonable)  seed=81821033-2388
9.998s  12jxmd2di(阶 12 X 对镜2 Intermediate)  seed=81821033-6795
9.998s  2x8m2du(阶 16 镜2 Unreasonable)  seed=81821033-984
9.998s  11jxmd2di(阶 11 X 对镜2 Intermediate)  seed=81821033-6603
9.998s  3x2xm8di(阶 6 X 镜8 Intermediate)  seed=81821033-1965
9.998s  4jxm8di(阶 4 X 镜8 Intermediate)  seed=81821033-3021
9.998s  12jxm2(阶 12 X 镜2 Trivial)  seed=81821033-6787
9.998s  4jxmd2de(阶 4 X 对镜2 Extreme)  seed=81821033-3005
9.998s  6x4xmd4da(阶 24 X 对镜4 Advanced)  seed=81821033-4888
9.998s  12jxmd2de(阶 12 X 对镜2 Extreme)  seed=81821033-6797
9.998s  10x3md4db(阶 30 对镜4 Basic)  seed=81821033-6470
9.997s  5x6md2db(阶 30 对镜2 Basic)  seed=81821033-4346
9.997s  2x7xm4du(阶 14 X 镜4 Unreasonable)  seed=81821033-948
9.997s  5x4ada(阶 20 无 Advanced)  seed=81821033-4132
9.997s  6x5m8db(阶 30 镜8 Basic)  seed=81821033-4940
9.997s  11jxmd2db(阶 11 X 对镜2 Basic)  seed=81821033-6602
9.997s  3x10xmd4(阶 30 X 对镜4 Trivial)  seed=81821033-2869
9.997s  3x2m8du(阶 6 镜8 Unreasonable)  seed=81821033-1872
9.997s  4jmd4da(阶 4 对镜4 Advanced)  seed=81821033-2920
9.997s  5x6a(阶 30 无 Trivial)  seed=81821033-4321
9.997s  12x2ada(阶 24 无 Advanced)  seed=81821033-6820
9.997s  2x8xadu(阶 16 X 无 Unreasonable)  seed=81821033-1014
9.997s  4jxmd4du(阶 4 X 对镜4 Unreasonable)  seed=81821033-3018
9.997s  3x10xm4db(阶 30 X 镜4 Basic)  seed=81821033-2864
9.997s  11jxm2di(阶 11 X 镜2 Intermediate)  seed=81821033-6597
9.997s  10jxm2de(阶 10 X 镜2 Extreme)  seed=81821033-6311
9.997s  12jxm2du(阶 12 X 镜2 Unreasonable)  seed=81821033-6792
9.997s  4jxmd4de(阶 4 X 对镜4 Extreme)  seed=81821033-3017
9.996s  7x4xm2db(阶 28 X 镜2 Basic)  seed=81821033-5444
9.996s  3x10m2(阶 30 镜2 Trivial)  seed=81821033-2803
9.996s  2x15m4(阶 30 镜4 Trivial)  seed=81821033-1663
9.996s  4jm2du(阶 4 镜2 Unreasonable)  seed=81821033-2904
9.996s  12jxmd2(阶 12 X 对镜2 Trivial)  seed=81821033-6793
9.996s  3x5adu(阶 15 无 Unreasonable)  seed=81821033-2310
9.996s  5x5m2da(阶 25 镜2 Advanced)  seed=81821033-4246
9.996s  3x10m8(阶 30 镜8 Trivial)  seed=81821033-2827
9.996s  4x7r4(阶 28 旋4 Trivial)  seed=81821033-3661
9.996s  7x3xada(阶 21 X 无 Advanced)  seed=81821033-5332
9.996s  7x3xmd4da(阶 21 X 对镜4 Advanced)  seed=81821033-5368
9.996s  4jxr4db(阶 4 X 旋4 Basic)  seed=81821033-2990
9.996s  10x3xmd2(阶 30 X 对镜2 Trivial)  seed=81821033-6505
9.996s  3x7xm2da(阶 21 X 镜2 Advanced)  seed=81821033-2566
9.996s  7jxkade(阶 7 X Killer 无 Extreme)  seed=81821033-5141
9.996s  4jm8di(阶 4 镜8 Intermediate)  seed=81821033-2925
9.995s  3x10db(阶 30 旋2 Basic)  seed=81821033-2792
9.995s  12jxmd4de(阶 12 X 对镜4 Extreme)  seed=81821033-6809
9.995s  4jxm8da(阶 4 X 镜8 Advanced)  seed=81821033-3022
9.995s  10x3m2db(阶 30 镜2 Basic)  seed=81821033-6452
9.995s  7x2xmd4du(阶 14 X 对镜4 Unreasonable)  seed=81821033-5274
9.995s  10x3adb(阶 30 无 Basic)  seed=81821033-6434
9.995s  2x14xm4(阶 28 X 镜4 Trivial)  seed=81821033-1615
9.995s  3x8md4da(阶 24 对镜4 Advanced)  seed=81821033-2632
9.995s  10x3xm4db(阶 30 X 镜4 Basic)  seed=81821033-6512
9.995s  2x3xm8da(阶 6 X 镜8 Advanced)  seed=81821033-430
9.995s  7x2xm4du(阶 14 X 镜4 Unreasonable)  seed=81821033-5268
9.994s  12jmd4de(阶 12 对镜4 Extreme)  seed=81821033-6761
9.994s  8x2xm8du(阶 16 X 镜8 Unreasonable)  seed=81821033-5760
9.994s  4jmd4di(阶 4 对镜4 Intermediate)  seed=81821033-2919
9.994s  5x6xm4db(阶 30 X 镜4 Basic)  seed=81821033-4400
9.994s  3x2m4di(阶 6 镜4 Intermediate)  seed=81821033-1857
9.994s  2x12xm4da(阶 24 X 镜4 Advanced)  seed=81821033-1426
9.993s  11jxmd4du(阶 11 X 对镜4 Unreasonable)  seed=81821033-6618
9.993s  11jxm2de(阶 11 X 镜2 Extreme)  seed=81821033-6599
9.993s  12jm4du(阶 12 镜4 Unreasonable)  seed=81821033-6756
9.993s  10x3xm4(阶 30 X 镜4 Trivial)  seed=81821033-6511
9.992s  12jxde(阶 12 X 旋2 Extreme)  seed=81821033-6779
9.992s  5x6xadb(阶 30 X 无 Basic)  seed=81821033-4370
9.991s  4x6m2da(阶 24 镜2 Advanced)  seed=81821033-3574
9.991s  10x3md2db(阶 30 对镜2 Basic)  seed=81821033-6458
9.991s  4jxm8du(阶 4 X 镜8 Unreasonable)  seed=81821033-3024
9.991s  4jxmd2du(阶 4 X 对镜2 Unreasonable)  seed=81821033-3006
9.990s  5x5xm2da(阶 25 X 镜2 Advanced)  seed=81821033-4294
9.990s  12x2xda(阶 24 X 旋2 Advanced)  seed=81821033-6874
9.989s  8x3xada(阶 24 X 无 Advanced)  seed=81821033-5812
9.989s  11jxm8(阶 11 X 镜8 Trivial)  seed=81821033-6619
9.988s  12jxr4da(阶 12 X 旋4 Advanced)  seed=81821033-6784
9.988s  6x4xm2da(阶 24 X 镜2 Advanced)  seed=81821033-4870
9.988s  3x2xm8de(阶 6 X 镜8 Extreme)  seed=81821033-1967
9.988s  8x2xr4du(阶 16 X 旋4 Unreasonable)  seed=81821033-5730
9.988s  5x5xmd2da(阶 25 X 对镜2 Advanced)  seed=81821033-4300
9.988s  12x2xm2da(阶 24 X 镜2 Advanced)  seed=81821033-6886
9.986s  12x2m4da(阶 24 镜4 Advanced)  seed=81821033-6850
9.986s  5x6xdb(阶 30 X 旋2 Basic)  seed=81821033-4376
9.985s  12jxr4(阶 12 X 旋4 Trivial)  seed=81821033-6781
9.985s  3x10xa(阶 30 X 无 Trivial)  seed=81821033-2833
9.985s  4x4du(阶 16 旋2 Unreasonable)  seed=81821033-3372
9.985s  4x4xdu(阶 16 X 旋2 Unreasonable)  seed=81821033-3420
9.984s  3x2xr4da(阶 6 X 旋4 Advanced)  seed=81821033-1936
9.984s  12jxm8db(阶 12 X 镜8 Basic)  seed=81821033-6812
9.984s  12jadu(阶 12 无 Unreasonable)  seed=81821033-6726
9.983s  12jxm2db(阶 12 X 镜2 Basic)  seed=81821033-6788
9.983s  6x4md4da(阶 24 对镜4 Advanced)  seed=81821033-4840
9.983s  3x7xada(阶 21 X 无 Advanced)  seed=81821033-2548
9.982s  2x7xm2du(阶 14 X 镜2 Unreasonable)  seed=81821033-936
9.982s  2x3xmd4da(阶 6 X 对镜4 Advanced)  seed=81821033-424
9.981s  5x5xda(阶 25 X 旋2 Advanced)  seed=81821033-4282
9.981s  12jxadb(阶 12 X 无 Basic)  seed=81821033-6770
9.981s  4jxm4du(阶 4 X 镜4 Unreasonable)  seed=81821033-3012
9.981s  6jxkadu(阶 6 X Killer 无 Unreasonable)  seed=81821033-4566
9.980s  2x3xm8de(阶 6 X 镜8 Extreme)  seed=81821033-431
9.980s  3x8xm4da(阶 24 X 镜4 Advanced)  seed=81821033-2674
9.980s  6x5xm4(阶 30 X 镜4 Trivial)  seed=81821033-4975
9.980s  11jxm8da(阶 11 X 镜8 Advanced)  seed=81821033-6622
9.978s  2x8xmd4du(阶 16 X 对镜4 Unreasonable)  seed=81821033-1050
9.977s  12jxr4du(阶 12 X 旋4 Unreasonable)  seed=81821033-6786
9.976s  3x5xm2du(阶 15 X 镜2 Unreasonable)  seed=81821033-2376
9.976s  2x8adu(阶 16 无 Unreasonable)  seed=81821033-966
9.974s  4jr4de(阶 4 旋4 Extreme)  seed=81821033-2897
9.974s  11jxmd2(阶 11 X 对镜2 Trivial)  seed=81821033-6601
9.974s  3x5xadu(阶 15 X 无 Unreasonable)  seed=81821033-2358
9.973s  12jxm8(阶 12 X 镜8 Trivial)  seed=81821033-6811
9.973s  12jr4du(阶 12 旋4 Unreasonable)  seed=81821033-6738
9.972s  11jxr4db(阶 11 X 旋4 Basic)  seed=81821033-6590
9.972s  3x10r4(阶 30 旋4 Trivial)  seed=81821033-2797
9.971s  3x5xmd4du(阶 15 X 对镜4 Unreasonable)  seed=81821033-2394
9.971s  3x2xm4di(阶 6 X 镜4 Intermediate)  seed=81821033-1953
9.970s  4jde(阶 4 旋2 Extreme)  seed=81821033-2891
9.970s  3x8md2da(阶 24 对镜2 Advanced)  seed=81821033-2620
9.967s  12jxdb(阶 12 X 旋2 Basic)  seed=81821033-6776
9.966s  7x4xm4(阶 28 X 镜4 Trivial)  seed=81821033-5455
9.965s  5jxm8du(阶 5 X 镜8 Unreasonable)  seed=81821033-3888
9.964s  3x2xm8du(阶 6 X 镜8 Unreasonable)  seed=81821033-1968
9.963s  8x2xm2du(阶 16 X 镜2 Unreasonable)  seed=81821033-5736
9.962s  10jxmd2du(阶 10 X 对镜2 Unreasonable)  seed=81821033-6318
9.960s  2x12ada(阶 24 无 Advanced)  seed=81821033-1348
9.959s  5x6md4db(阶 30 对镜4 Basic)  seed=81821033-4358
9.959s  3x10xm8db(阶 30 X 镜8 Basic)  seed=81821033-2876
9.959s  12x2xm4da(阶 24 X 镜4 Advanced)  seed=81821033-6898
9.954s  8x3da(阶 24 旋2 Advanced)  seed=81821033-5770
```

### crash —— 1 格

```
0.000s  4jm4(阶 4 镜4 Trivial)  seed=81821033-2911
```

**按难度分**

| 难度 | 不符格数 | 留下的总格数 |
|---|---|---|
| Trivial | 70 | 988 |
| Basic | 82 | 988 |
| Intermediate | 28 | 764 |
| Advanced | 150 | 764 |
| Extreme | 36 | 460 |
| Unreasonable | 115 | 460 |

**按对称分**

| 对称 | 不符格数 | 留下的总格数 |
|---|---|---|
| 无 | 76 | 688 |
| 旋2 | 60 | 544 |
| 旋4 | 51 | 532 |
| 镜2 | 58 | 532 |
| 对镜2 | 58 | 532 |
| 镜4 | 56 | 532 |
| 对镜4 | 56 | 532 |
| 镜8 | 66 | 532 |

**X 开关**

| X | 不符格数 | 留下的总格数 |
|---|---|---|
| 关 | 157 | 2212 |
| 开 | 324 | 2212 |

## 崩溃(40 格)

断言都在 `solo.c:3414` 的 `assert(p - desc < space)`:题面写不进 encode_puzzle_desc 的预算。
崩溃是**概率性**的,同一格换个种子多半就过了,所以下面的格数是「一个种子撞上了」,不是「一定崩」。

**留在我们范围里的 1 格**(这是规则漏洞):

```
4jm4(阶 4 镜4 Trivial)  seed=81821033-2911
```

已经被我们排除的 39 格(规则挡住了):

```
2jr4(阶 2 旋4 Trivial)  seed=81821033-13
2x2m4db(阶 4 镜4 Basic)  seed=81821033-128
2jr4de(阶 2 旋4 Extreme)  seed=81821033-17
2jm4db(阶 2 镜4 Basic)  seed=81821033-32
2x2m4da(阶 4 镜4 Advanced)  seed=81821033-130
2jm4di(阶 2 镜4 Intermediate)  seed=81821033-33
2jm4de(阶 2 镜4 Extreme)  seed=81821033-35
2x2m8db(阶 4 镜8 Basic)  seed=81821033-140
2x2xm4da(阶 4 X 镜4 Advanced)  seed=81821033-226
2jr4du(阶 2 旋4 Unreasonable)  seed=81821033-18
2jm4du(阶 2 镜4 Unreasonable)  seed=81821033-36
2x2xr4de(阶 4 X 旋4 Extreme)  seed=81821033-209
2jm8du(阶 2 镜8 Unreasonable)  seed=81821033-48
2x2xm8(阶 4 X 镜8 Trivial)  seed=81821033-235
2jm4da(阶 2 镜4 Advanced)  seed=81821033-34
2jm4(阶 2 镜4 Trivial)  seed=81821033-31
2x2xr4du(阶 4 X 旋4 Unreasonable)  seed=81821033-210
2jr4da(阶 2 旋4 Advanced)  seed=81821033-16
2x2m8du(阶 4 镜8 Unreasonable)  seed=81821033-144
2jm8da(阶 2 镜8 Advanced)  seed=81821033-46
2jm8(阶 2 镜8 Trivial)  seed=81821033-43
2x2xm4di(阶 4 X 镜4 Intermediate)  seed=81821033-225
2x2xm8da(阶 4 X 镜8 Advanced)  seed=81821033-238
2x2m8di(阶 4 镜8 Intermediate)  seed=81821033-141
2jr4db(阶 2 旋4 Basic)  seed=81821033-14
2x2xr4db(阶 4 X 旋4 Basic)  seed=81821033-206
2x2m8(阶 4 镜8 Trivial)  seed=81821033-139
2x2xr4(阶 4 X 旋4 Trivial)  seed=81821033-205
2jm8db(阶 2 镜8 Basic)  seed=81821033-44
2x2xm4du(阶 4 X 镜4 Unreasonable)  seed=81821033-228
2jm8di(阶 2 镜8 Intermediate)  seed=81821033-45
2x2xm8di(阶 4 X 镜8 Intermediate)  seed=81821033-237
2x2md4de(阶 4 对镜4 Extreme)  seed=81821033-137
2x2xm8du(阶 4 X 镜8 Unreasonable)  seed=81821033-240
2jr4di(阶 2 旋4 Intermediate)  seed=81821033-15
2jm8de(阶 2 镜8 Extreme)  seed=81821033-47
2x2m8de(阶 4 镜8 Extreme)  seed=81821033-143
2x2m4du(阶 4 镜4 Unreasonable)  seed=81821033-132
2x2xm8de(阶 4 X 镜8 Extreme)  seed=81821033-239
```
