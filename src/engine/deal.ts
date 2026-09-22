// 镜像发牌的协议。主线程和 worker 各持一个引擎实例,两边之间只流动整份存档,不是 Game ID:
// descriptive ID 会清掉 aux_info、丢掉 seedstr,参数段也是非全量编码。
export type DealAction =
  | { kind: 'newGame' }
  | { kind: 'preset'; index: number }
  // 自定义参数:控件值按 config box 的顺序原样带过去,由镜像开同一个框填进去。
  | { kind: 'custom'; values: readonly (string | number | boolean)[] }

export type ToWorker =
  | { type: 'init'; name: string; prefs: string | null }
  | { type: 'deal'; id: number; save: string; action: DealAction }

export type FromWorker =
  | { type: 'done'; id: number; save: string }
  | { type: 'failed'; id: number; error: string }
