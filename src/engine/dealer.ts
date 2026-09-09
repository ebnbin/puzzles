// 镜像发牌的主线程一侧。发牌一律走这里,不按「这次大概快不快」分流——快慢事先
// 判断不出来,分流就等于赌。取消只有 terminate 一条路:镜像正卡在同步的 C 循环
// 里,收不到消息,所以取消之后要重开一个;主线程那局全程没被碰过,取消即原地不动。
import type { DealAction, FromWorker, ToWorker } from './deal'

export type DealOutcome =
  | { status: 'done'; save: string }
  | { status: 'failed'; error: string }
  | { status: 'cancelled' }

const CANCELLED: DealOutcome = { status: 'cancelled' }
const BROKEN_LIMIT = 2

export class Dealer {
  private readonly name: string
  private readonly prefs: () => string | null
  private worker: Worker | null = null
  private pending = new Map<number, (outcome: DealOutcome) => void>()
  private next = 1
  // 起不来就别一直重开:模块 worker 太老的浏览器不支持,循环重开会把它烧穿。
  // 归零在每次成功发牌之后,所以偶发的一次崩溃不会把镜像永久关掉。
  private broken = 0

  constructor(name: string, prefs: () => string | null) {
    this.name = name
    this.prefs = prefs
    this.spawn()
  }

  // 镜像还在不在。不在就只能让调用方退回主线程自己发牌(会卡,但不会没得玩)。
  get live() {
    return this.worker !== null
  }

  // 挂载即开,不等第一次发牌:sw.js 对 /engine/** 是 stale-while-revalidate,晚开
  // 的镜像可能拿到刚刷新的新引擎,和主线程手里的旧引擎交换存档。
  private spawn() {
    if (this.broken >= BROKEN_LIMIT) return
    let worker: Worker
    try {
      worker = new Worker(new URL('./deal.worker.ts', import.meta.url), { type: 'module' })
    } catch (reason) {
      this.broken = BROKEN_LIMIT
      console.warn('could not start the dealing mirror', reason)
      return
    }
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const message = event.data
      const settle = this.pending.get(message.id)
      if (!settle) return
      this.pending.delete(message.id)
      this.broken = 0
      settle(
        message.type === 'done'
          ? { status: 'done', save: message.save }
          : { status: 'failed', error: message.error },
      )
    }
    const died = (event: Event) => {
      this.broken++
      console.warn('the dealing mirror died', event)
      this.restart()
    }
    worker.onerror = died
    worker.onmessageerror = died
    this.worker = worker
    this.send(worker, { type: 'init', name: this.name, prefs: this.prefs() })
  }

  private send(worker: Worker, message: ToWorker) {
    worker.postMessage(message)
  }

  private drain(outcome: DealOutcome) {
    const waiting = [...this.pending.values()]
    this.pending.clear()
    for (const settle of waiting) settle(outcome)
  }

  private restart() {
    this.worker?.terminate()
    this.worker = null
    this.drain(CANCELLED)
    this.spawn()
  }

  deal(save: string, action: DealAction): Promise<DealOutcome> {
    const worker = this.worker
    if (!worker) return Promise.resolve(CANCELLED)
    const id = this.next++
    const settled = new Promise<DealOutcome>((resolve) => this.pending.set(id, resolve))
    this.send(worker, { type: 'deal', id, save, action })
    return settled
  }

  cancel() {
    if (this.worker) this.restart()
  }

  dispose() {
    this.worker?.terminate()
    this.worker = null
    this.drain(CANCELLED)
  }
}
