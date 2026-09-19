// Solo 参数全集普查(第一轮):上游放行的每一个组合各跑一个随机种子,记录结局与耗时。
//
//   node scripts/solo-sweep/run.mjs [--cap 10] [--jobs 4] [--limit N] [--shuffle] [--out DIR]
//
// 要 gcc(和 check-params 同一套 oracle 机器,把 vendor/ 的 solo.c 编进 .build/,不动 vendor 一行)。
// 全量 9024 格、上限 10 秒、4 个工人,这台容器上约 2.7 小时。产物默认落在 .build/solo-sweep/。
//
// 预期:我们留下的组合应当 10 秒内生成成功;我们排除的组合应当失败或超过 10 秒。
// 不符预期的逐条记下来,交给第二轮。每一格的实测耗时都写进结果,所以 10 秒这条线
// 之后想挪到别的值,直接重算,不用重跑。
// 断点续跑:结果一行一行追加,重启时按 key 跳过已完成的。
import { spawn, execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { BUILD, VENDOR, loadModel, buildOracles } from '../lib/params-oracle.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? fallback : process.argv[i + 1]
}
const CAP = Number(arg('cap', 10))
const JOBS = Number(arg('jobs', execFileSync('nproc', { encoding: 'utf8' }).trim()))
const LIMIT = Number(arg('limit', 0))
const OUT = arg('out', join(BUILD, '..', 'solo-sweep', 'out'))
mkdirSync(OUT, { recursive: true })
const MANIFEST = join(OUT, 'manifest.tsv')
const RESULTS = join(OUT, `results-cap${CAP}.tsv`)

// 工人:和 oracle 同一个套路,把 vendor 的 solo.c 临时编出来,不进 vendor 也不进产物目录。
function worker() {
  const dir = join(BUILD, '..', 'solo-sweep')
  mkdirSync(dir, { recursive: true })
  const bin = join(dir, 'solo-sweep')
  const src = join(HERE, 'solo-sweep.c')
  const stale = !existsSync(bin) ||
    statSync(src).mtimeMs > statSync(bin).mtimeMs ||
    statSync(join(VENDOR, 'solo.c')).mtimeMs > statSync(bin).mtimeMs
  if (stale)
    execFileSync('gcc', [
      '-O1', '-w', `-I${VENDOR}`, '-DVER="sweep"', '-o', bin, src,
      join(VENDOR, 'nullfe.c'), join(BUILD, 'libcommon.a'), '-lm',
    ], { stdio: 'inherit' })
  return bin
}

// ---------------------------------------------------------------- 组合清单

if (!existsSync(MANIFEST)) {
  const model = await loadModel()
  const bin = buildOracles(['solo']).solo
  const params = model.GAMES.solo.types.params
  const mk = (c, r, x, k, symm, diff) => [
    { kind: 'string', label: 'Columns of sub-blocks', value: String(c) },
    { kind: 'string', label: 'Rows of sub-blocks', value: String(r) },
    { kind: 'boolean', label: '"X" (require every number in each main diagonal)', value: x },
    { kind: 'boolean', label: 'Jigsaw (irregularly shaped sub-blocks)', value: r === 1 },
    { kind: 'boolean', label: 'Killer (digit sums)', value: k },
    { kind: 'choices', label: 'Symmetry', value: symm, choices: new Array(8).fill('') },
    { kind: 'choices', label: 'Difficulty', value: diff, choices: new Array(6).fill('') },
  ]
  const rows = []
  const lines = []
  for (let c = 2; c <= 31; c++)
    for (let r = 1; r <= 15; r++)
      for (const x of [false, true])
        for (const k of [false, true])
          for (let symm = 0; symm < 8; symm++)
            for (let diff = 0; diff < 6; diff++) {
              rows.push({ c, r, x, k, symm, diff })
              lines.push([c, r, x ? 1 : 0, r === 1 ? 1 : 0, k ? 1 : 0, symm, diff].join('\t'))
            }
  const res = execFileSync(bin, [], { input: lines.join('\n') + '\n', encoding: 'utf8', maxBuffer: 1 << 30 })
    .split('\n').filter((l) => l !== '')
  const run = randomBytes(4).toString('hex')
  const out = [`# run\t${run}`, '# key\tspec\tkept\tseed\torder\tx\tkiller\tsymm\tdiff']
  let n = 0, keptN = 0
  for (let i = 0; i < res.length; i++) {
    const tab = res[i].indexOf('\t')
    if (res[i].slice(0, tab) !== 'ok') continue
    const spec = res[i].slice(tab + 1)
    const { c, r, x, k, symm, diff } = rows[i]
    const kept = model.settle(params, mk(c, r, x, k, symm, diff)).length === 0 ? 1 : 0
    keptN += kept
    n++
    out.push([`s${n}`, spec, kept, `${run}-${n}`, c * r, x ? 1 : 0, k ? 1 : 0, symm, diff].join('\t'))
  }
  writeFileSync(MANIFEST, out.join('\n') + '\n')
  console.log(`清单:${n} 个组合,留下 ${keptN},排除 ${n - keptN}`)
}

const manifest = readFileSync(MANIFEST, 'utf8').split('\n')
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const f = l.split('\t')
    return { key: f[0], spec: f[1], kept: f[2] === '1', seed: f[3] }
  })

// 大括号不能省:不加的话 else 会绑到循环体里那个 if 上,每读到一个空行就把结果文件清空。
const done = new Set()
if (existsSync(RESULTS)) {
  for (const l of readFileSync(RESULTS, 'utf8').split('\n')) {
    if (l && !l.startsWith('#')) done.add(l.split('\t')[0])
  }
} else {
  writeFileSync(RESULTS, '# key\tspec\tseed\tverdict\twall\tcpu\tclues\techo\n')
}

let queue = manifest.filter((m) => !done.has(m.key))
// 打乱:贵的格子在清单里是成片的(同一阶数连着一串),不打乱的话前半程全是便宜格、
// ETA 会一路骗人。种子固定,同一批次重跑顺序一样。
if (process.argv.includes('--shuffle')) {
  let seed = 20260918
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }
}
if (LIMIT) queue = queue.slice(0, LIMIT)
console.log(`待跑 ${queue.length} / 共 ${manifest.length}(已完成 ${done.size});CPU 上限 ${CAP} 秒,${JOBS} 个工人`)
if (!queue.length) process.exit(0)

const WORKER = worker()
const t0 = Date.now()
let at = 0
let finished = 0
const counts = { ok: 0, timeout: 0, crash: 0, reject: 0 }

const spawnWorker = () =>
  new Promise((resolve) => {
    const w = spawn(WORKER, [String(CAP)], {
      stdio: ['pipe', 'pipe', openSync(join(OUT, 'stderr.log'), 'a')],
    })
    const rl = createInterface({ input: w.stdout })
    const next = () => {
      if (at >= queue.length) { w.stdin.end(); return }
      const m = queue[at++]
      w.stdin.write(`${m.key}\t${m.spec}\t${m.seed}\n`)
    }
    rl.on('line', (line) => {
      appendFileSync(RESULTS, line + '\n')
      counts[line.split('\t')[3]] = (counts[line.split('\t')[3]] ?? 0) + 1
      finished++
      if (finished % 50 === 0 || finished === queue.length) {
        const secs = (Date.now() - t0) / 1000
        const rate = finished / secs
        const eta = (queue.length - finished) / rate
        console.log(
          `  ${finished}/${queue.length}  已用 ${(secs / 60).toFixed(1)} 分,` +
          `剩约 ${(eta / 60).toFixed(1)} 分  ` +
          `ok=${counts.ok ?? 0} timeout=${counts.timeout ?? 0} crash=${counts.crash ?? 0}`,
        )
      }
      next()
    })
    w.on('close', () => resolve())
    next()
  })

await Promise.all(Array.from({ length: JOBS }, spawnWorker))
console.log(`\n跑完:ok=${counts.ok ?? 0} timeout=${counts.timeout ?? 0} crash=${counts.crash ?? 0} reject=${counts.reject ?? 0}`)
console.log(`用时 ${((Date.now() - t0) / 60000).toFixed(1)} 分;结果在 ${RESULTS}`)
