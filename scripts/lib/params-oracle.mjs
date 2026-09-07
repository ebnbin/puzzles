// check-params.mjs 与 build-params-doc.mjs 共用的 oracle 机器:把 vendor/ 的 C 源码和
// scripts/lib/params-oracle.c 用 gcc 编进 .build/params-oracle/(不动 vendor 一行),把
// TS 的注册表和范围词汇用 vite 自带的 rolldown 打成 node 能 import 的一个文件。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const VENDOR = join(ROOT, 'vendor', 'sgtpuzzles')
export const BUILD = join(ROOT, '.build', 'params-oracle')

// vendor CMakeLists 的 common 库(core_obj + hat + spectre)。
const COMMON = [
  'combi', 'divvy', 'draw-poly', 'drawing', 'dsf', 'findloop', 'grid', 'latin',
  'laydomino', 'loopgen', 'malloc', 'matching', 'midend', 'misc', 'penrose',
  'penrose-legacy', 'ps', 'random', 'sort', 'tdq', 'tree234', 'version', 'hat', 'spectre',
]

const newer = (a, b) => !existsSync(b) || statSync(a).mtimeMs > statSync(b).mtimeMs

function gcc(args) {
  execFileSync('gcc', ['-O1', '-w', `-I${VENDOR}`, '-DVER="oracle"', ...args], { stdio: 'inherit' })
}

export function buildOracles(names) {
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

export async function loadModel() {
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

// config box 的控件表:index / kind / label / initial(choices 另带选项名);另给默认参数
// 的编码串和预设表(文档要)。
export function describe(bin) {
  const out = execFileSync(bin, ['--describe'], { encoding: 'utf8' })
  const controls = []
  const presets = []
  let params = ''
  for (const line of out.split('\n')) {
    const f = line.split('\t')
    if (f[0] === 'default') params = f[1]
    else if (f[0] === 'control') {
      const kind = f[2] === 'S' ? 'string' : f[2] === 'B' ? 'boolean' : 'choices'
      const c = { index: Number(f[1]), kind, label: f[3] }
      if (kind === 'string') c.initial = f[4]
      else if (kind === 'boolean') c.initial = f[4] === '1'
      else {
        c.initial = Number(f[4])
        c.choices = f[5].slice(1).split(f[5][0])
      }
      controls.push(c)
    } else if (f[0] === 'preset' && f[3]) presets.push({ name: f[2], params: f[3] })
  }
  return { controls, presets, params }
}
