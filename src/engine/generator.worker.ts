/// <reference lib="webworker" />
import { nullHost } from './nullHost'
import { CUSTOM_PRESET, type GenOp, type GenReply, type GenRequest } from './generate'
import type { DialogSpec, PuzzleApi } from './types'

// 生成物里 window 只出现在 requestAnimationFrame / cancelAnimationFrame /
// devicePixelRatio 这三处,worker 里没有 window,所以补桩——必须在 import 引擎之前
// 就位。rAF 故意永不回调:worker 只出题,让计时器跑起来纯属白烧一个核。
;(globalThis as unknown as { window: unknown }).window = {
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  devicePixelRatio: 1,
}

// 与 C 共享的活对象,规矩同 ConfigFields:必须原地赋值,拷贝或重建会让 dialogOk
// 读回初始值。
function fill(spec: DialogSpec | null, values: readonly unknown[]): void {
  if (!spec) throw new Error('config box did not open')
  values.forEach((value, i) => {
    const control = spec.controls[i]
    if (control) (control as { value: unknown }).value = value
  })
}

function apply(api: PuzzleApi, spec: () => DialogSpec | null, op: GenOp): void {
  switch (op.kind) {
    case 'new':
      api.newGame()
      return
    case 'preset':
      api.selectPreset(op.index)
      return
    case 'custom':
      api.selectPreset(CUSTOM_PRESET)
      fill(spec(), op.values)
      api.dialogOk()
      return
    case 'desc':
    case 'seed':
      if (op.kind === 'desc') api.enterGameId()
      else api.enterSeed()
      fill(spec(), [op.text])
      api.dialogOk()
      return
  }
}

self.onmessage = async (event: MessageEvent<GenRequest>) => {
  const { name, base, op } = event.data
  const post = (reply: GenReply) => self.postMessage(reply)
  try {
    const host = nullHost()
    const factory = (await import(/* @vite-ignore */ `/engine/${name}.js`)).default
    // 工厂 await 到底才回来,main() 连同它那一局默认参数的出题都已经跑完。
    await factory({ puzzle: host })
    const api = host.api
    if (!api) throw new Error('puzzle did not attach')

    // base 是主线程刚 saveGame 出来的,参数(尺寸、难度、自定义项)全在里面;
    // 靠它把 worker 这份 midend 摆到和主线程一样的起点上。
    api.loadGame(base)
    host.errors.length = 0

    apply(api, () => host.dialog, op)

    // 参数不合法时 emcc.c 的 cfg_end 只报错、不出题,配置框留在原地。
    const message = host.errors.at(-1)
    if (message) {
      post({ ok: false, message })
      return
    }
    post({ ok: true, save: api.saveGame() })
  } catch (error) {
    post({ ok: false, message: error instanceof Error ? error.message : String(error) })
  }
}
