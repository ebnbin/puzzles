// 自定义参数范围模型的契约测试:src/games/*.ts 的 types.params 对着上游源码逐值对账。
// 何时跑:改了 src/games/util/params.ts、任一游戏的 types.params,或升级 vendor/ 之后。
//
//   node scripts/check-params.mjs [game ...]
//
// 要 gcc:把 vendor/ 的 C 源码和 scripts/lib/params-oracle.c 编进 .build/params-oracle/
// (不动 vendor 一行),每个游戏一个 oracle,直接调 custom_params + validate_params(full)。
// 对账三件事,任一条不成立就 FAIL:
//   1. 覆盖:每个 string 控件都有申报,每条申报都能按 label 认到控件。
//   2. 健全:按申报顺序把每张表走一遍(大表抽样),走出来的每个组合上游都放行;
//      走的路上没有空表;settle 对这些组合是 no-op;从乱值出发 settle 之后上游放行。
//   3. 紧:表外一格(下界减一、上界加一、表中间的洞)按界面的做法钉住再落定后面的,
//      上游若放行就说明表比上游窄——除了文档里写明的几处故意收窄。
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, 'vendor', 'sgtpuzzles')
const BUILD = join(ROOT, '.build', 'params-oracle')
const CAP = 100

// vendor CMakeLists 的 common 库(core_obj + hat + spectre)。
const COMMON = [
  'combi', 'divvy', 'draw-poly', 'drawing', 'dsf', 'findloop', 'grid', 'latin',
  'laydomino', 'loopgen', 'malloc', 'matching', 'midend', 'misc', 'penrose',
  'penrose-legacy', 'ps', 'random', 'sort', 'tdq', 'tree234', 'version', 'hat', 'spectre',
]

const only = process.argv.slice(2)

// ---------------------------------------------------------------- 编译

const newer = (a, b) => !existsSync(b) || statSync(a).mtimeMs > statSync(b).mtimeMs

function gcc(args) {
  execFileSync('gcc', ['-O1', '-w', `-I${VENDOR}`, '-DVER="oracle"', ...args], { stdio: 'inherit' })
}

function buildOracles(names) {
  mkdirSync(BUILD, { recursive: true })
  const lib = join(BUILD, 'libcommon.a')
  const objs = []
  let dirty = false
  for (const c of COMMON) {
    const src = join(VENDOR, `${c}.c`)
    const obj = join(BUILD, `${c}.o`)
    if (newer(src, obj)) {
      gcc(['-c', src, '-o', obj])
      dirty = true
    }
    objs.push(obj)
  }
  if (dirty || !existsSync(lib)) execFileSync('ar', ['rcs', lib, ...objs])
  const harness = join(ROOT, 'scripts', 'lib', 'params-oracle.c')
  const bins = {}
  for (const name of names) {
    const src = join(VENDOR, `${name}.c`)
    const bin = join(BUILD, name)
    if (newer(src, bin) || newer(harness, bin) || newer(lib, bin))
      gcc(['-o', bin, harness, src, join(VENDOR, 'nullfe.c'), lib, '-lm'])
    bins[name] = bin
  }
  return bins
}

// 注册表和范围词汇都是 TS,用 vite 自带的 rolldown 打成一个 node 能 import 的文件。
async function loadModel() {
  mkdirSync(BUILD, { recursive: true })
  const entry = join(BUILD, 'entry.mjs')
  writeFileSync(
    entry,
    `export * from ${JSON.stringify(join(ROOT, 'src/games/util/params.ts'))}\n` +
      `export { GAMES } from ${JSON.stringify(join(ROOT, 'src/games/index.ts'))}\n`,
  )
  const out = join(BUILD, 'model.mjs')
  execFileSync(
    join(ROOT, 'node_modules', '.bin', 'rolldown'),
    [entry, '--format', 'esm', '--platform', 'node', '--file', out],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
  return import(pathToFileURL(out).href + `?t=${Date.now()}`)
}

// ---------------------------------------------------------------- oracle 往返

function describe(bin) {
  const out = execFileSync(bin, ['--describe'], { encoding: 'utf8' })
  const controls = []
  const presets = []
  for (const line of out.split('\n')) {
    const f = line.split('\t')
    if (f[0] === 'control') {
      const kind = f[2] === 'S' ? 'string' : f[2] === 'B' ? 'boolean' : 'choices'
      const c = { index: Number(f[1]), kind, label: f[3] }
      if (kind === 'string') c.initial = f[4]
      else if (kind === 'boolean') c.initial = f[4] === '1'
      else {
        c.initial = Number(f[4])
        c.choices = f[5].slice(1).split(f[5][0])
      }
      controls.push(c)
    } else if (f[0] === 'preset') presets.push({ name: f[2], params: f[3] })
  }
  return { controls, presets }
}

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

// 故意比上游窄的几处,文档 docs/params.md「与上游的出入」一节逐条对应。
const EXPECTED_NARROWER = {
  dominosa: (label, v) => label === 'Maximum number on dominoes' && v > CAP - 2,
  solo: (label, v) => label === 'Rows of sub-blocks' && v < 1,
  blackbox: (label) => label === 'No. of balls',
  rect: (label, v) => label === 'Expansion factor' && v > 5,
}

// ---------------------------------------------------------------- 主流程

const model = await loadModel()
const { GAMES } = model
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
  const { controls: shape } = describe(bin)
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

  const queries = [] // { line, expectOk, why }
  let vectors = 0
  let probes = 0
  let empties = 0
  let unstable = 0
  const narrower = []

  for (const combo of fixedCombos(shape)) {
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
          // 后面的参数能不能落定:空表 = 界面本来就到不了这里
          let complete = true
          for (let d = depth + 1; d < params.length; d++) {
            const q = params[d]
            const t = table(model, q, forced)
            if (t.length === 0) {
              complete = false
              break
            }
            const qc = byLabel(forced, q.label)
            if (q.kind === 'span') {
              const [a, b] = model.parseSpan(qc.value)
              const los = q.lo(model.reader(forced))
              const nlo = los.includes(a) ? a : model.snap(los, a)
              const his = q.hi(model.reader(forced), nlo)
              write(model, qc, q, [nlo, his.includes(b) ? b : model.snap(his, b)])
            } else {
              const cur = q.kind === 'int' ? parseInt(qc.value, 10) : parseFloat(qc.value)
              write(model, qc, q, t.includes(cur) ? cur : model.snap(t, cur))
            }
          }
          if (!complete) continue
          probes++
          queries.push({
            line: line(forced),
            expectOk: false,
            why: `${describeCombo()} 「${p.label}」=${v} 表外却放行`,
            label: p.label,
            value: v,
          })
        }
      } else {
        const r = model.reader(controls)
        const los = p.lo(r)
        const his = p.hi(r, los[0])
        const c2 = () => controls.map((c) => ({ ...c }))
        const tries = [
          [los[0] - 1, los[0] - 1],
          [los[los.length - 1] + 1, los[los.length - 1] + 1],
          [los[0], his[his.length - 1] + 1],
        ]
        for (const [a, b] of tries) {
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
      const expected = EXPECTED_NARROWER[name]?.(q.label, q.value)
      narrower.push({ ...q, expected })
    }
  }
  const unexpected = narrower.filter((n) => !n.expected)
  for (const n of unexpected.slice(0, 5)) fail(`比上游窄:${n.why} [${n.line.replace(/\t/g, ' ')}]`)
  if (rejected > 5) fail(`……共 ${rejected} 个组合被拒`)
  if (unexpected.length > 5) fail(`……共 ${unexpected.length} 处比上游窄`)

  const summary =
    `combos=${fixedCombos(shape).length} vectors=${vectors} probes=${probes}` +
    ` narrower=${narrower.length - unexpected.length}(expected)`
  if (problems.length) {
    failed++
    console.log(`  FAIL ${name}  ${summary}`)
    for (const p of problems) console.log(`         ${p}`)
  } else console.log(`  ok   ${name}  ${summary}`)
}

console.log(failed ? `\n${failed} 个游戏没过` : '\n全部通过')
process.exit(failed ? 1 : 0)
