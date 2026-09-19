// 把 run.mjs 的结果按预期对账,不符的逐条列进一份 markdown。
//
//   node scripts/solo-sweep/report.mjs [--out DIR] [--cap 10] [--limit 10] > docs/solo-sweep/round1.md
//
// --limit 是判定用的秒数(默认等于 --cap):留下的该在这个秒数内生成成功,排除的该失败或超时。
// 每格的实测耗时都在结果里,所以挪动这条线不用重跑。
//
// 排除的组合还要标注「是哪条规则排除的」:我们的规则里只有两条的理由是「生不出来/太慢」
// (难度分档上限、Jigsaw 上限),其余三条的理由是别的(Killer 钉对称是为了和上游预设对齐,
// Jigsaw 下限是面积与上游强制降难度,2×2 对称白名单是从简)。后三条本来就不该指望它失败,
// 混在一起看会把真信号淹掉。
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1] }
const OUT = arg('out', new URL('../../.build/solo-sweep/out', import.meta.url).pathname)
const CAP = Number(arg('cap', 10))
const LIMIT = Number(arg('limit', CAP))

const man = new Map()
for (const l of readFileSync(join(OUT, 'manifest.tsv'), 'utf8').split('\n')) {
  if (!l || l.startsWith('#')) continue
  const f = l.split('\t')
  man.set(f[0], {
    spec: f[1], kept: f[2] === '1', seed: f[3],
    order: +f[4], x: f[5] === '1', killer: f[6] === '1', symm: +f[7], diff: +f[8],
  })
}
const rows = []
const file = join(OUT, `results-cap${CAP}.tsv`)
if (!existsSync(file)) { console.error(`没有 ${file}`); process.exit(1) }
for (const l of readFileSync(file, 'utf8').split('\n')) {
  if (!l || l.startsWith('#')) continue
  const f = l.split('\t')
  const m = man.get(f[0])
  if (!m) continue
  rows.push({ ...m, key: f[0], verdict: f[3], wall: +f[4], cpu: +f[5], clues: +f[6] })
}

const DIFF = ['Trivial', 'Basic', 'Intermediate', 'Advanced', 'Extreme', 'Unreasonable']
const SYMM = ['无', '旋2', '旋4', '镜2', '对镜2', '镜4', '对镜4', '镜8']
const BY_DIFF = [30, 30, 25, 25, 16, 16]

// 这一格是被哪条规则排除的(可能不止一条)。理由分两种:'慢' = 规则的依据就是生成代价,
// '别的' = 依据不是生成代价,不该指望它失败。
function why(m) {
  const out = []
  const jig = m.order > 0 && m.spec.includes('j')
  if (m.killer && m.symm !== 0) out.push(['Killer 钉对称', '别的'])
  if (jig && m.order < 4) out.push(['Jigsaw 下限 4', '别的'])
  if (jig && m.order > (m.killer ? 9 : 12)) out.push(['Jigsaw 上限 12', '慢'])
  if (!jig && m.order === 4 && m.symm !== 0 && m.symm !== 1) out.push(['2×2 对称白名单', '别的'])
  if (!jig && !m.killer && m.order > BY_DIFF[m.diff]) out.push([`难度分档上限(${DIFF[m.diff]} ${BY_DIFF[m.diff]})`, '慢'])
  return out
}

const good = (r) => (r.kept ? r.verdict === 'ok' && r.cpu <= LIMIT : !(r.verdict === 'ok' && r.cpu <= LIMIT))
const badKept = rows.filter((r) => r.kept && !good(r))
const badDrop = rows.filter((r) => !r.kept && !good(r))
const keptN = rows.filter((r) => r.kept).length

const tag = (r) =>
  `${r.spec}` +
  `(阶 ${r.order}${r.x ? ' X' : ''}${r.killer ? ' Killer' : ''} ${SYMM[r.symm]} ${DIFF[r.diff]})`

const P = console.log
P(`# Solo 参数全集普查 · 第一轮(一格一个随机种子)\n`)
P(`- 判定线:生成 CPU 时间 ≤ ${LIMIT} 秒且成功 = 「跑得出来」。上限 ${CAP} 秒,超了记 timeout。`)
P(`- 跑完 ${rows.length} / ${man.size} 格(留下 ${keptN},排除 ${rows.length - keptN})。`)
P(`- 每格只跑一个种子,所以「跑得出来」不等于「总是跑得出来」,「超时」也不等于「永远超时」。这一轮只用来划范围,结论留给第二轮。`)
P(`- 这台机器比 owner 的慢 2–3 倍,且是 native gcc -O1、线上是 wasm,绝对秒数不能直接当线上标准。\n`)

P(`## 总账\n`)
P(`| | 符合预期 | 不符 |`)
P(`|---|---|---|`)
P(`| 留下(该 ≤ ${LIMIT} 秒生成成功) | ${keptN - badKept.length} | **${badKept.length}** |`)
P(`| 排除(该失败或 > ${LIMIT} 秒) | ${rows.length - keptN - badDrop.length} | **${badDrop.length}** |`)

// ---- 排除却跑得出来:按规则归因
P(`\n## 排除却跑得出来(${badDrop.length} 格)\n`)
const byRule = new Map()
for (const r of badDrop) {
  const ws = why(r)
  const k = ws.length ? ws.map((w) => w[0]).join(' + ') : '(没归到规则,查)'
  if (!byRule.has(k)) byRule.set(k, { kind: ws.every((w) => w[1] === '别的') ? '别的' : '慢', rows: [] })
  byRule.get(k).rows.push(r)
}
P(`| 被哪条规则排除 | 规则的理由 | 格数 | 中位耗时 |`)
P(`|---|---|---|---|`)
for (const [k, v] of [...byRule].sort((a, b) => b[1].rows.length - a[1].rows.length)) {
  const ts = v.rows.map((r) => r.cpu).sort((a, b) => a - b)
  P(`| ${k} | ${v.kind === '慢' ? '**生成代价**' : '别的(不该指望它失败)'} | ${v.rows.length} | ${ts[ts.length >> 1].toFixed(3)} 秒 |`)
}
for (const [k, v] of [...byRule].sort((a, b) => b[1].rows.length - a[1].rows.length)) {
  const signal = v.kind === '慢'
  P(`\n### ${k} —— ${v.rows.length} 格(${signal ? '规则依据是生成代价,能秒生成就是判错了' : '规则依据不是生成代价'})\n`)
  const list = v.rows.sort((a, b) => a.cpu - b.cpu)
  // 噪音类只列头十条:规则的依据本来就不是生成代价,全名单在 results-cap10.tsv 里。
  const show = signal ? list : list.slice(0, 10)
  P('```')
  for (const r of show) P(`${r.cpu.toFixed(3)}s  ${tag(r)}  seed=${r.seed}`)
  if (show.length < list.length) P(`…… 另 ${list.length - show.length} 格同类,全名单见 results-cap10.tsv`)
  P('```')
}

// ---- 留下却没跑出来
P(`\n## 留下却没跑出来(${badKept.length} 格)\n`)
const byV = new Map()
for (const r of badKept) {
  const k = r.verdict === 'ok' ? `超过 ${LIMIT} 秒但在 ${CAP} 秒内完成` : r.verdict
  if (!byV.has(k)) byV.set(k, [])
  byV.get(k).push(r)
}
for (const [k, list] of byV) {
  P(`\n### ${k} —— ${list.length} 格\n`)
  P('```')
  for (const r of list.sort((a, b) => b.cpu - a.cpu)) P(`${r.cpu.toFixed(3)}s  ${tag(r)}  seed=${r.seed}`)
  P('```')
}
if (badKept.length) {
  P(`\n**按难度分**\n`)
  P(`| 难度 | 不符格数 | 留下的总格数 |`)
  P(`|---|---|---|`)
  for (let d = 0; d < 6; d++) {
    const n = badKept.filter((r) => r.diff === d).length
    const t = rows.filter((r) => r.kept && r.diff === d).length
    if (t) P(`| ${DIFF[d]} | ${n} | ${t} |`)
  }
  P(`\n**按对称分**\n`)
  P(`| 对称 | 不符格数 | 留下的总格数 |`)
  P(`|---|---|---|`)
  for (let s = 0; s < 8; s++) {
    const n = badKept.filter((r) => r.symm === s).length
    const t = rows.filter((r) => r.kept && r.symm === s).length
    if (t) P(`| ${SYMM[s]} | ${n} | ${t} |`)
  }
  P(`\n**X 开关**\n`)
  P(`| X | 不符格数 | 留下的总格数 |`)
  P(`|---|---|---|`)
  for (const x of [false, true]) {
    const n = badKept.filter((r) => r.x === x).length
    const t = rows.filter((r) => r.kept && r.x === x).length
    P(`| ${x ? '开' : '关'} | ${n} | ${t} |`)
  }
}


// ---- 崩溃单列一节:留下的范围里出现崩溃是最要紧的
const crashes = rows.filter((r) => r.verdict === 'crash')
P(`\n## 崩溃(${crashes.length} 格)\n`)
P(`断言都在 \`solo.c:3414\` 的 \`assert(p - desc < space)\`:题面写不进 encode_puzzle_desc 的预算。`)
P(`崩溃是**概率性**的,同一格换个种子多半就过了,所以下面的格数是「一个种子撞上了」,不是「一定崩」。\n`)
const inKept = crashes.filter((r) => r.kept)
P(`**留在我们范围里的 ${inKept.length} 格**${inKept.length ? '(这是规则漏洞)' : ''}:\n`)
P('```')
for (const r of inKept) P(`${tag(r)}  seed=${r.seed}`)
if (!inKept.length) P('(无)')
P('```')
P(`\n已经被我们排除的 ${crashes.length - inKept.length} 格(规则挡住了):\n`)
P('```')
for (const r of crashes.filter((r) => !r.kept)) P(`${tag(r)}  seed=${r.seed}`)
P('```')
