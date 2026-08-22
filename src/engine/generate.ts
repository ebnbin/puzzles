// 后台发牌:把一次生成交给 worker,主线程只等结果,等不动了可以取消。
// 一次请求一个 worker——冷启动(建 worker + 实例化 wasm + 生成小局)实测 13–44 ms,
// 不值得为省这点去维护常驻实例的状态同步;用完就扔,取消没有残留。
//
// 结果按整份存档交接(主线程 loadGame),不按 game ID:存档带着 SEED 和 AUXINFO,
// game ID 两个都丢——AUXINFO 是求解器要的,丢了 Net、Rect 这类就解不开。实测
// loadGame 4–72 ms,game ID 那条路反而要 103–426 ms。
import type { Ask, Deal, Told } from './generate.worker'

export type { Deal }

export class Cancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'Cancelled'
  }
}

export type Dealt = { save: string; params: string; desc: string }

const field = (save: string, key: string) =>
  new RegExp(`^${key}\\s*:\\d+:(.*)$`, 'm').exec(save)?.[1] ?? ''

export function generate(name: string, deal: Deal, signal?: AbortSignal): Promise<Dealt> {
  return new Promise<Dealt>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Cancelled())
      return
    }
    const worker = new Worker(new URL('./generate.worker.ts', import.meta.url), {
      type: 'module',
    })
    const done = () => {
      signal?.removeEventListener('abort', stop)
      worker.terminate()
    }
    const stop = () => {
      done()
      reject(new Cancelled())
    }
    signal?.addEventListener('abort', stop, { once: true })
    worker.onmessage = (event: MessageEvent<Told>) => {
      done()
      if ('failed' in event.data) {
        reject(new Error(event.data.failed))
        return
      }
      const { save } = event.data
      resolve({ save, params: field(save, 'CPARAMS') || field(save, 'PARAMS'), desc: field(save, 'DESC') })
    }
    worker.onerror = (event) => {
      done()
      reject(new Error(event.message || 'generation worker failed'))
    }
    worker.postMessage({ name, deal } satisfies Ask)
  })
}
