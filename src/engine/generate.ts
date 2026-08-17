// 出题(midend_new_game)可能跑几秒也可能跑几分钟,同一组参数两次都不一样,
// 事前估不出来。所以它不许待在主线程:worker 里出,回来的存档主线程 loadGame
// 一下就完事。取消只能是 terminate——C 的出题循环没有让出点,协作式取消不存在。

// 上游用负数表示「自定义」:js_get_selected_preset 返回 <0 时 emcc.c 开配置框。
export const CUSTOM_PRESET = -1

export type GenOp =
  | { kind: 'new' }
  | { kind: 'preset'; index: number }
  | { kind: 'custom'; values: readonly (string | number | boolean)[] }
  | { kind: 'desc'; text: string }
  | { kind: 'seed'; text: string }

export interface GenRequest {
  name: string
  base: string
  op: GenOp
}

export type GenReply =
  | { ok: true; save: string }
  // unavailable:worker 根本起不来(旧浏览器、CSP),调用方退回同步出题
  | { ok: false; message: string; unavailable?: boolean }

export class Generator {
  #name: string
  #worker: Worker | null = null
  #settle: ((reply: GenReply | null) => void) | null = null
  #token = 0

  constructor(name: string) {
    this.#name = name
  }

  // 解析成 null = 这次请求被后来的请求取代或被取消,调用方什么都别做(收尾归接班的)。
  run(base: string, op: GenOp): Promise<GenReply | null> {
    this.#stop()
    const token = ++this.#token

    let worker: Worker
    try {
      worker = new Worker(new URL('./generator.worker.ts', import.meta.url), {
        type: 'module',
      })
    } catch (error) {
      return Promise.resolve({
        ok: false,
        unavailable: true,
        message: String(error),
      })
    }
    this.#worker = worker

    return new Promise<GenReply | null>((resolve) => {
      this.#settle = resolve
      const done = (reply: GenReply) => {
        if (token !== this.#token) return
        this.#worker = null
        this.#settle = null
        worker.terminate()
        resolve(reply)
      }
      worker.onmessage = (event: MessageEvent<GenReply>) => done(event.data)
      // 模块 worker 不被支持时也走这里(type 被忽略 → 加载器读到 import 就报错)
      worker.onerror = (event) =>
        done({ ok: false, unavailable: true, message: event.message || 'worker failed' })
      worker.postMessage({ name: this.#name, base, op } satisfies GenRequest)
    })
  }

  cancel(): void {
    this.#stop()
    this.#token++
  }

  dispose(): void {
    this.cancel()
  }

  #stop(): void {
    this.#worker?.terminate()
    this.#worker = null
    this.#settle?.(null)
    this.#settle = null
  }
}
