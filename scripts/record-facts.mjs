// 从编好的引擎(public/engine/**)录每个游戏的静态事实,写成 src/games/facts.ts:默认参数串、预设、
// 自定义参数的控件、偏好控件及其 kw / 选项 kw、request_keys、调色板、能否求解。build-games.sh 装完
// 引擎就跑它;单独跑:node scripts/record-facts.mjs。
// 偏好的 kw 对话框里拿不到(emcc.c 只传 name),靠 js_save_prefs 写出的 kw=value 行按序拉链;选项的
// kw 逐个选中再存一遍读出来。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENGINE = join(ROOT, 'public/engine')
const OUT = join(ROOT, 'src/games/facts.ts')

// 胶水按 ENVIRONMENT_IS_WEB 编的,只会 fetch:这里把 wasm 从磁盘喂给 instantiateWasm,画布和计时器
// 全用空桩。
globalThis.window = {
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  devicePixelRatio: 1,
}

const noop = () => {}

async function boot(name) {
  const colours = []
  const draw = {
    defaultColour: () => null,
    setColour: (n, css) => {
      colours[n] = css
    },
    startDraw: noop,
    drawUpdate: noop,
    endDraw: noop,
    rect: noop,
    clip: noop,
    unclip: noop,
    line: noop,
    poly: noop,
    circle: noop,
    fontMidpoint: () => 0,
    text: noop,
    newBlitter: noop,
    freeBlitter: noop,
    blitterSave: noop,
    blitterLoad: noop,
    preferredSize: () => null,
    setSize: noop,
  }
  const seen = { api: null, presets: undefined, dialog: null, prefs: null, solvable: true, colours }
  const host = {
    gameId: '',
    draw,
    selectedPreset: 0,
    attach: (api) => {
      seen.api = api
    },
    onReady: (presets) => {
      seen.presets = presets
    },
    onError: (message) => {
      throw new Error(`${name}: ${message}`)
    },
    onStatus: noop,
    onUndoRedo: noop,
    onKeyLabels: noop,
    onPermalinks: noop,
    onPresetSelected: noop,
    onSolveRemoved: () => {
      seen.solvable = false
    },
    onDialog: (dialog) => {
      seen.dialog = dialog
    },
    onTimer: noop,
    focusCanvas: noop,
    loadPrefs: () => null,
    savePrefs: (text) => {
      seen.prefs = text
    },
  }
  const wasm = readFileSync(join(ENGINE, `${name}.wasm`))
  const factory = (await import(pathToFileURL(join(ENGINE, `${name}.js`)).href)).default
  await factory({
    puzzle: host,
    instantiateWasm: (imports, receive) => {
      WebAssembly.instantiate(wasm, imports).then((result) => receive(result.instance))
      return {}
    },
  })
  if (!seen.api) throw new Error(`${name}: engine never attached`)
  return seen
}

const control = (c) =>
  c.kind === 'choices'
    ? { kind: c.kind, label: c.label, options: c.choices, initial: c.value }
    : { kind: c.kind, label: c.label, initial: c.value }

// kw=value 行,顺序就是偏好控件的顺序(midend_save_prefs 遍历同一个数组)。
const kwLines = (text) =>
  text
    .split('\n')
    .filter((line) => line.length)
    .map((line) => {
      const eq = line.indexOf('=')
      return { kw: line.slice(0, eq), value: line.slice(eq + 1) }
    })

async function record(name) {
  const game = await boot(name)
  const { api } = game

  api.selectPreset(-1)
  const configure = game.dialog ? game.dialog.controls.map(control) : null
  if (game.dialog) api.dialogCancel()

  api.preferences()
  const dialog = game.dialog
  if (!dialog) throw new Error(`${name}: no preferences dialog`)
  api.dialogOk()
  const lines = kwLines(game.prefs)
  if (lines.length !== dialog.controls.length)
    throw new Error(`${name}: ${dialog.controls.length} pref controls but ${lines.length} kw lines`)
  const prefs = []
  for (let i = 0; i < dialog.controls.length; i++) {
    const c = dialog.controls[i]
    const entry = { kw: lines[i].kw, ...control(c) }
    if (c.kind === 'choices') {
      entry.optionKws = []
      for (let j = 0; j < c.choices.length; j++) {
        api.preferences()
        game.dialog.controls[i].value = j
        api.dialogOk()
        entry.optionKws.push(kwLines(game.prefs)[i].value)
      }
      api.preferences()
      game.dialog.controls[i].value = c.value
      api.dialogOk()
    }
    prefs.push(entry)
  }

  // 默认那一局的参数串(存档 PARAMS 行):构建期拿它算一次 keypad,核 request_keys 覆盖。
  const save = api.saveGame()
  const at = save.indexOf('PARAMS')
  const m = /^PARAMS\s*:(\d+):/.exec(save.slice(at))
  if (!m) throw new Error(`${name}: no PARAMS line in save`)
  const params = save.slice(at + m[0].length, at + m[0].length + Number(m[1]))

  return {
    params,
    presets: game.presets,
    configure,
    prefs,
    keys: api.requestKeys(),
    colours: game.colours,
    solvable: game.solvable,
  }
}

// 单引号、不加引号的键、尾逗号:和手写 TS 一个样子,diff 才读得下去。
const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : quote(k))
function emit(value, indent) {
  const pad = '  '.repeat(indent)
  const inner = '  '.repeat(indent + 1)
  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value !== 'object') return String(value)
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const flat = value.every((v) => typeof v !== 'object' || v === null)
    if (flat) return `[${value.map((v) => emit(v, indent)).join(', ')}]`
    return `[\n${value.map((v) => `${inner}${emit(v, indent + 1)},`).join('\n')}\n${pad}]`
  }
  const entries = Object.entries(value)
  if (!entries.length) return '{}'
  const flat = entries.every(([, v]) => typeof v !== 'object' || v === null)
  if (flat) return `{ ${entries.map(([k, v]) => `${key(k)}: ${emit(v, indent)}`).join(', ')} }`
  return `{\n${entries.map(([k, v]) => `${inner}${key(k)}: ${emit(v, indent + 1)},`).join('\n')}\n${pad}}`
}

const names = JSON.parse(readFileSync(join(ROOT, 'src/games.json'), 'utf8')).map((g) => g.name)
const facts = {}
for (const name of names) {
  facts[name] = await record(name)
  console.log(`  ${name}: ${facts[name].configure?.length ?? '-'} controls, ${facts[name].prefs.length} prefs, ${facts[name].keys.length} keys, ${facts[name].colours.length} colours`)
}

writeFileSync(
  OUT,
  `// 生成物:scripts/record-facts.mjs 从 public/engine/** 录的,升级 vendor 或重编引擎后重录,
// 不手改。每个游戏引擎运行时报出来的静态事实,申报(各 src/games/*.ts)对着它核。
export const facts = ${emit(facts, 0)} as const
`,
)
console.log(`wrote ${OUT}`)
