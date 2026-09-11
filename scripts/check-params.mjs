// 自定义参数范围模型的契约测试:src/games/*.ts 的 types.params 对着上游源码逐值对账。
// 何时跑:改了 src/games/util/params.ts、任一游戏的 types.params,或升级 vendor/ 之后。
//
//   node scripts/check-params.mjs [game ...]
//
// 要 gcc(lib/params-oracle.mjs 把 vendor/ 的 C 源码编进 .build/params-oracle/,不动 vendor
// 一行),每个游戏一个 oracle,直接调 custom_params + validate_params(full)。
// 对账三件事,任一条不成立就 FAIL:
//   1. 覆盖:每个 string 控件都有申报,每条申报都能按 label 认到控件。
//   2. 健全:按申报顺序把每张表走一遍(大表抽样),走出来的每个组合上游都放行;
//      走的路上没有空表;settle 对这些组合是 no-op;从乱值出发 settle 之后上游放行。
//   3. 紧:表外一格(下界减一、上界加一、表中间的洞)按界面的做法钉住再落定后面的,
//      上游若放行就说明表比上游窄——除了文档里写明的几处故意收窄。
import { spawnSync } from 'node:child_process'
import { buildOracles, describe, loadModel } from './lib/params-oracle.mjs'

const only = process.argv.slice(2)

// ---------------------------------------------------------------- oracle 往返

function ask(bin, lines) {
  if (lines.length === 0) return []
  const res = spawnSync(bin, [], {
    input: lines.join('\n') + '\n',
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  })
  if (res.status !== 0) throw new Error(`${bin} exited ${res.status}: ${res.stderr}`)
  const out = res.stdout.split('\n')
  if (out[out.length - 1] === '') out.pop()
  if (out.length !== lines.length) throw new Error(`${bin}: ${lines.length} 问 ${out.length} 答`)
  return out.map((line) => {
    const tab = line.indexOf('\t')
    return { ok: line.slice(0, tab) === 'ok', text: line.slice(tab + 1) }
  })
}

// ---------------------------------------------------------------- 枚举

const line = (controls) =>
  controls
    .map((c) => (c.kind === 'string' ? c.value : c.kind === 'boolean' ? (c.value ? '1' : '0') : String(c.value)))
    .join('\t')

// 大表抽样:两头各三个、中间等距六个、随机两个。
function sample(list, rng) {
  if (list.length <= 14) return [...list]
  const picked = new Set()
  for (let i = 0; i < 3; i++) {
    picked.add(list[i])
    picked.add(list[list.length - 1 - i])
  }
  for (let i = 1; i <= 6; i++) picked.add(list[Math.floor((i * (list.length - 1)) / 7)])
  picked.add(list[Math.floor(rng() * list.length)])
  picked.add(list[Math.floor(rng() * list.length)])
  return [...picked].sort((a, b) => a - b)
}

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// choices × boolean 的全部组合;超过 96 种抽 96 种(每次跑抽的一样)。
function fixedCombos(controls) {
  let combos = [[]]
  for (const c of controls) {
    if (c.kind === 'string') continue
    const values = c.kind === 'boolean' ? [false, true] : c.choices.map((_, i) => i)
    combos = combos.flatMap((prefix) => values.map((v) => [...prefix, [c.index, v]]))
  }
  if (combos.length <= 96) return combos
  const rng = mulberry32(11)
  const picked = new Set([0, combos.length - 1])
  while (picked.size < 96) picked.add(Math.floor(rng() * combos.length))
  return [...picked].sort((a, b) => a - b).map((i) => combos[i])
}

const write = (M, control, param, value) => {
  if (param.kind === 'int') control.value = String(value)
  else if (param.kind === 'float') control.value = M.formatFloat(value, param.digits)
  else control.value = M.formatSpan(value[0], value[1])
}

// 一个参数此刻的表;span 只给 lo 的表(hi 的表随 lo 变,枚举时逐个取)。
function table(M, param, controls) {
  const r = M.reader(controls)
  return param.kind === 'span' ? param.lo(r) : param.allowed(r)
}

// 故意比上游窄的几处,文档 docs/params.md「与上游的出入」一节逐条对应。span 的探针
// 带 side:只有「最多」那头的封顶是登记过的。
const EXPECTED_NARROWER = {
  // 本仓库定的下限:1×n 是一条直管,不成谜题。抬到 3 之后上游那两条(1×1、
  // wrap+unique 下的 2)永远触发不了。
  net: (label, v) => (label === 'Width' || label === 'Height') && v === 2,
  // 三角网(除立方体外的三个)封到 50:六边形跨 d1+d2 行,50×50 的铺展和方格网
  // 100×100 相当。立方体那张表到 100,和 CAP 同高,探针够不着。
  cube: (label, v, side, forced) => forced[0].value !== 1 && v > 50,
  // 封到 50:格子里要写编号,再大字号就认不出了(见 docs/params.md 第四节)。
  fifteen: (label, v) => v > 50,
  // 同上,只有宽高;打乱步数封到 100,探针试的 101 超过 CAP,够不着。
  sixteen: (label, v) => label !== 'Number of shuffling moves' && v > 50,
  // 同上;块边长只跟上游的 n ≤ min(宽, 高),不额外收。
  twiddle: (label, v) =>
    label === 'Width' || label === 'Height' ? v > 50 : false,
  // 宽高只给 5 的倍数 5..50:表外的一律是预期收窄(下界减一、上界加一、中间的洞)。
  // 上游只查 > 0 和面积 ≥ 2,窄盘与大盘各自卡在生成的两条判据上,见 docs/params.md。
  pattern: (label, v) => v < 5 || v > 50 || v % 5 !== 0,
  // 宽高从 4 起:上游放行 3×4(勾了唯一解时两维 > 2 即可),但 3×3 面积不够放雷、
  // 3×n 高密度时唯一解生成不收敛(见 docs/params.md 第四节)。
  mines: (label, v) => (label === 'Width' || label === 'Height') && v < 4,
  // 宽高从 2 起(1×n 退化成一维消除);色数上限统一封到 ⌊面积/2⌋(勾着时上游不查,
  // 但块数就这么多,多出来的档拖了也一格不变),勾着且宽 > 20 时下限抬到 4。
  samegame: (label, v, side, forced) => {
    if (label === 'Width' || label === 'Height') return v < 2
    const w = Number(forced[0].value)
    const h = Number(forced[1].value)
    return v > Math.floor((w * h) / 2) || (forced[4].value && w > 20 && v < 4)
  },
  // 宽高 2..50 且面积 ≤ 1000。上游只查 > 0(191)和面积² ≤ INT_MAX−3(195):
  // 1×2 配 Random 是结构性死循环,上限则是 DESC = ⌈面积²/4⌉ 个字符撑不住(596)。
  flip: (label, v, side, forced) =>
    v < 2 || v > 50 || Number(forced[0].value) * Number(forced[1].value) > 1000,
  // n 的上限随难度走(Trivial / Basic / Hard / Extreme / Ambiguous):上游只查 n ≥ 1,
  // 但它要求局面「恰好需要这个难度」,两头都贵——Hard 从 n=11、Extreme 从 n=9 起就是
  // 几十秒,Ambiguous 不跑求解器所以免费。见 docs/params.md。
  dominosa: (label, v, side, forced) => v > [25, 30, 15, 10, 50][Number(forced[1].value)],
  solo: (label, v, side, forced) => {
    const c = Number(forced[0].value)
    const r = Number(forced[1].value)
    const jigsaw = forced[3].value
    const symm = Number(forced[5].value)
    if (label === 'Rows of sub-blocks' && v < 1) return true
    // 不勾 Jigsaw 时行数从 2 起(上游 r=1 即 Jigsaw,勾不掉)
    if (label === 'Rows of sub-blocks' && !jigsaw && v === 1) return true
    if (label === 'Columns of sub-blocks' && !jigsaw && c * 2 > (forced[4].value ? 9 : 31)) return true
    // 二阶(2j 或 2×2)配 4 向旋转 / 4 向镜像 / 8 向镜像,或二阶 Killer:生成不终止
    const order2 = jigsaw ? c * r === 2 : c === 2 && r === 2
    return order2 && ([2, 5, 7].includes(symm) || forced[4].value)
  },
  // 钉数和次数都封到 50:上游两个都没有上限(219、225)。50 钉平均要 36 次才
  // 猜得出来,50 次给到 1.4 倍富余;再往上提示点数不清(见 docs/params.md)。
  guess: (label, v) => (label === 'Pegs per guess' || label === 'Guesses') && v > 50,
  // Random 封到 30:上游对它没有上限(只要求 > 3),但生成是拒绝采样,长出来那片的
  // 面积恒为盘面的 57%,细长盘上够不到两头(50×10 两万次尝试零通过);见 docs/params.md。
  // Cross / Octagon 的表是上游自己的穷举,探针试的都被上游拒,不算收窄。
  pegs: (label, v, side, forced) => Number(forced[2].value) === 2 && v > 30,
  blackbox: (label, v, side) => label === 'No. of balls' && side === 'hi',
  // 窄盘上生成器回不来(「低一档解不出来」那道门永远过不去,而爬黑格比例的兜底封顶
  // 在 90),下限按对称 × 难度查表;黑格比例封 90(91 起不再爬升);见 docs/params.md。
  lightup: (label, v, side, forced) => {
    if (label === '%age of black squares') return v > 90
    const floor = [[2, 3, 4], [2, 4, 5], [2, 4, 5], [3, 4, 5], [3, 4, 5]]
    return v < (floor[Number(forced[3].value)]?.[Number(forced[4].value)] ?? 2)
  },
  // 宽高从 2 起(上游放行 1×n,生成时崩,见 docs/params.md 第四节);扩展因子的表是
  // 粒度 t = 0..1 换算出来的,顶到 base 缩成 2 那一点(e = 长边/2 − 1),再往上是同一局。
  rect: (label, v, side, forced) =>
    label === 'Expansion factor'
      ? v > Math.max(Number(forced[0].value), Number(forced[1].value)) / 2 - 1
      : v < 2,
  loopy: (label, v, side, forced) => {
    const w = Number(forced[0].value)
    const h = Number(forced[1].value)
    const type = Number(forced[2].value)
    // Penrose 两种网格在最小尺寸附近生成极慢或崩溃(见 docs/params.md 第四节)
    if (type === 11) return w < 4 || h < 4
    if (type === 12) return w < 5 || h < 5
    return false
  },
}

// ---------------------------------------------------------------- 主流程

const model = await loadModel()
const { GAMES, CAP } = model
const names = (only.length ? only : Object.keys(GAMES)).filter((n) => {
  if (GAMES[n]) return true
  console.log(`  FAIL 没有叫 ${n} 的游戏`)
  return false
})
const bins = buildOracles(names)

let failed = 0
for (const name of names) {
  const bin = bins[name]
  const params = GAMES[name].types.params
  const shape = describe(bin).controls
  const combos = fixedCombos(shape)
  const problems = []
  const fail = (...m) => problems.push(m.join(' '))
  const rng = mulberry32(7)

  // 1. 覆盖
  const strings = shape.filter((c) => c.kind === 'string')
  for (const c of strings)
    if (!params.some((p) => p.label === c.label)) fail(`string 控件「${c.label}」没有申报`)
  for (const p of params) {
    const c = shape.find((c) => c.label === p.label)
    if (!c) fail(`申报「${p.label}」认不到控件`)
    else if (c.kind !== 'string') fail(`申报「${p.label}」认到的不是 string 控件`)
  }
  if (problems.length) {
    failed++
    console.log(`  FAIL ${name}`)
    for (const p of problems) console.log(`         ${p}`)
    continue
  }

  const fresh = () => shape.map((c) => ({ kind: c.kind, label: c.label, value: c.initial }))
  const byLabel = (controls, label) => controls.find((c) => c.label === label)

  // 每条:送给 oracle 的一行、期望放行与否、说明;表外探针另带 label / value / side / forced。
  const queries = []
  let vectors = 0
  let probes = 0
  let empties = 0
  let unstable = 0
  const narrower = []

  for (const combo of combos) {
    const base = fresh()
    for (const [index, v] of combo) base[index].value = v
    const describeCombo = () =>
      combo.map(([index, v]) => `${shape[index].label}=${JSON.stringify(v)}`).join(' ')

    // 2. 健全:按申报顺序走表(深度优先,大表抽样)
    const walk = (depth, controls) => {
      if (depth === params.length) {
        const settled = controls.map((c) => ({ ...c }))
        if (model.settle(params, settled).length) {
          unstable++
          if (unstable <= 3)
            fail(`settle 动了表内的组合:${describeCombo()} ${line(controls)} → ${line(settled)}`)
        }
        queries.push({ line: line(controls), expectOk: true, why: describeCombo() })
        vectors++
        return
      }
      const p = params[depth]
      const c = byLabel(controls, p.label)
      const list = table(model, p, controls)
      if (list.length === 0) {
        empties++
        if (empties <= 3) fail(`「${p.label}」的表空了:${describeCombo()} 前面 ${line(controls)}`)
        return
      }
      // 3. 紧:表外一格,后面的参数按界面做法落定
      if (p.kind !== 'span') {
        const lo = list[0]
        const hi = list[list.length - 1]
        const unit = p.kind === 'float' ? 10 ** -p.digits : 1
        const outside = [lo - unit, hi + unit]
        if (p.kind === 'int') {
          const holes = []
          for (let v = lo + 1; v < hi && holes.length < 40; v++) if (!list.includes(v)) holes.push(v)
          outside.push(...sample(holes, rng))
        }
        for (const v of outside) {
          if (v < 0 || v > CAP) continue
          const forced = controls.map((c) => ({ ...c }))
          write(model, byLabel(forced, p.label), p, v)
          // 后面的参数照界面的做法落定;有空表 = 界面本来就到不了这里
          if (params.slice(depth + 1).some((q) => table(model, q, forced).length === 0)) continue
          model.settle(params.slice(depth + 1), forced)
          probes++
          queries.push({
            line: line(forced),
            expectOk: false,
            why: `${describeCombo()} 「${p.label}」=${v} 表外却放行`,
            label: p.label,
            value: v,
            forced,
          })
        }
      } else {
        const r = model.reader(controls)
        const los = p.lo(r)
        const his = p.hi(r, los[0])
        const c2 = () => controls.map((c) => ({ ...c }))
        const tries = [
          [los[0] - 1, los[0] - 1, 'lo'],
          [los[los.length - 1] + 1, los[los.length - 1] + 1, 'lo'],
          [los[0], his[his.length - 1] + 1, 'hi'],
        ]
        for (const [a, b, side] of tries) {
          if (a < 0 || b < 0) continue
          const forced = c2()
          write(model, byLabel(forced, p.label), p, [a, b])
          probes++
          queries.push({
            line: line(forced),
            expectOk: false,
            why: `${describeCombo()} 「${p.label}」=${a}-${b} 表外却放行`,
            label: p.label,
            value: b,
            side,
            forced,
          })
        }
      }
      if (p.kind === 'span') {
        const r = model.reader(controls)
        for (const lo of sample(list, rng))
          for (const hi of sample(p.hi(r, lo), rng)) {
            const next = controls.map((c) => ({ ...c }))
            write(model, byLabel(next, p.label), p, [lo, hi])
            walk(depth + 1, next)
          }
      } else {
        for (const v of sample(list, rng)) {
          const next = controls.map((c) => ({ ...c }))
          write(model, byLabel(next, p.label), p, v)
          walk(depth + 1, next)
        }
      }
    }
    walk(0, base)

    // 2b. 从乱值出发 settle,落定的组合必须放行
    for (let i = 0; i < 24; i++) {
      const messy = base.map((c) => ({ ...c }))
      for (const p of params) {
        const c = byLabel(messy, p.label)
        if (p.kind === 'int') c.value = String(Math.floor(rng() * (CAP + 2)))
        else if (p.kind === 'float') c.value = model.formatFloat(rng() * 7 - 1, p.digits)
        else c.value = model.formatSpan(Math.floor(rng() * CAP), Math.floor(rng() * CAP))
      }
      model.settle(params, messy)
      queries.push({ line: line(messy), expectOk: true, why: `乱值落定 ${describeCombo()}` })
      vectors++
    }
  }

  const answers = ask(bin, queries.map((q) => q.line))
  let rejected = 0
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]
    const a = answers[i]
    if (q.expectOk && !a.ok) {
      rejected++
      if (rejected <= 5) fail(`上游拒绝:${q.why} [${q.line.replace(/\t/g, ' ')}] → ${a.text}`)
    } else if (!q.expectOk && a.ok) {
      const expected = EXPECTED_NARROWER[name]?.(q.label, q.value, q.side, q.forced)
      narrower.push({ ...q, expected })
    }
  }
  const unexpected = narrower.filter((n) => !n.expected)
  for (const n of unexpected.slice(0, 5)) fail(`比上游窄:${n.why} [${n.line.replace(/\t/g, ' ')}]`)
  if (rejected > 5) fail(`……共 ${rejected} 个组合被拒`)
  if (unexpected.length > 5) fail(`……共 ${unexpected.length} 处比上游窄`)

  const summary =
    `combos=${combos.length} vectors=${vectors} probes=${probes}` +
    ` narrower=${narrower.length - unexpected.length}(expected)`
  if (problems.length) {
    failed++
    console.log(`  FAIL ${name}  ${summary}`)
    for (const p of problems) console.log(`         ${p}`)
  } else console.log(`  ok   ${name}  ${summary}`)
}

console.log(failed ? `\n${failed} 个游戏没过` : '\n全部通过')
process.exit(failed ? 1 : 0)
