// 镜像引擎:和主线程同一份 wasm 的第二个实例,只发牌、不画画。发牌是引擎里唯一
// 会跑成几十秒的同步循环(new_desc 的「造盘→验难度→重来」),放在这里主线程才
// 有空画加载态;取消只能靠 terminate 整个 worker,同步的 C 循环没有别的打断口。
import type { DealAction, FromWorker, ToWorker } from './deal'
import type { DialogControl, DialogSpec, PuzzleApi } from './types'

// wasm 胶水以为自己在页面里,但它只碰 window 的这三个属性、一个 document 都不碰
// (public/engine/*.js 里可验证)。这份桩必须在 import 引擎模块之前就位。
Object.defineProperty(globalThis, 'window', {
  value: {
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    devicePixelRatio: 1,
  },
  configurable: true,
})

const ctx = self as unknown as {
  postMessage(message: FromWorker): void
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null
}

// 画布桩。preferredSize 必须答 null 而不是编一个尺寸:emcc 的 resize() 拿到 false
// 就用游戏自己的默认尺寸,而一个算不出来的尺寸会让 keen 在 draw_tile 里断言。
const draw = new Proxy(
  {},
  {
    get(_target, key) {
      if (key === 'preferredSize' || key === 'defaultColour') return () => null
      if (key === 'fontMidpoint') return () => 0
      return () => undefined
    },
  },
)

let api: PuzzleApi | null = null
let dialog: DialogSpec | null = null
let complaint: string | null = null
let booted: Promise<void> | null = null

// 经函数读,不直接读变量:引擎的回调是同步回灌的,TypeScript 的窄化看不见这件事,
// 直接读会被窄成赋值那一刻的类型。
const openDialog = () => dialog
const lastComplaint = () => complaint

function boot(name: string, prefs: string | null): Promise<void> {
  const host = {
    gameId: '',
    draw,
    selectedPreset: 0,
    attach(bound: PuzzleApi) {
      api = bound
    },
    onReady: () => {},
    onError: (message: string) => {
      complaint = message
    },
    onStatus: () => {},
    onUndoRedo: () => {},
    onKeyLabels: () => {},
    onPermalinks: () => {},
    onPresetSelected: () => {},
    onSolveRemoved: () => {},
    onDialog: (spec: DialogSpec | null) => {
      dialog = spec
    },
    onTimer: () => {},
    focusCanvas: () => {},
    // 偏好影响不了发牌(new_desc 看不见 game_ui),同步过来是为了 encode_ui:
    // 它跑在 apply_prefs 之后,上游哪天往里塞一个偏好值就会盖掉主线程那份。
    loadPrefs: () => prefs,
    savePrefs: () => {},
  }
  return import(/* @vite-ignore */ `/engine/${name}.js`).then((module) =>
    module.default({ puzzle: host }),
  )
}

function fill(control: DialogControl, value: string | number | boolean) {
  if (control.kind === 'boolean') control.value = !!value
  else if (control.kind === 'choices') control.value = Number(value)
  else control.value = String(value)
}

// 自定义参数:开同一个框、按序填值、提交。控件是与 C 共享的活对象,只能原地赋值。
function submit(bound: PuzzleApi, values: readonly (string | number | boolean)[]) {
  dialog = null
  bound.selectPreset(-1)
  const spec = openDialog()
  if (!spec || spec.controls.length !== values.length) {
    throw new Error('the parameter box did not match')
  }
  spec.controls.forEach((control, i) => fill(control, values[i]))
  bound.dialogOk()
  // 提交被回绝时框还开着,补一刀关掉,不然下一次发牌开不出新的框。
  if (openDialog()) bound.dialogCancel()
}

function run(bound: PuzzleApi, action: DealAction) {
  if (action.kind === 'newGame') bound.newGame()
  else if (action.kind === 'preset') bound.selectPreset(action.index)
  else submit(bound, action.values)
}

ctx.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data
  if (message.type === 'init') {
    booted ??= boot(message.name, message.prefs)
    return
  }

  const { id, save, action } = message
  const ready = booted ?? Promise.reject(new Error('the mirror was never initialised'))
  ready
    .then(() => {
      const bound = api
      if (!bound) throw new Error('the mirror did not attach')
      complaint = null
      // 每次发牌前先装一遍主线程的存档:参数由它对齐,镜像不必自己跟踪主线程
      // 走到了哪一步,也就没有漂开的余地。
      bound.loadGame(save)
      const stale = lastComplaint()
      if (stale !== null) throw new Error(stale)
      run(bound, action)
      const refused = lastComplaint()
      if (refused !== null) throw new Error(refused)
      ctx.postMessage({ type: 'done', id, save: bound.saveGame() })
    })
    .catch((reason: unknown) => {
      const error = reason instanceof Error ? reason.message : String(reason)
      ctx.postMessage({ type: 'failed', id, error })
    })
}
