// config box 协议:后端只有一个对话框(参数、偏好共用),打开了就必须有人
// 回答,答案归谁按打开的人算。三条路,onDialog 按这个顺序路由:borrowed(借用
// 不显示,答案在路过时被截下)、inline(嵌在 Types/Menu 里的自定义参数和偏好)、
// dialog(真正的模态,兜底)。
import { useCallback, useRef, useState } from 'react'
import type { DialogControl, DialogSpec, PuzzleApi } from '../../engine/types'
import type { DealResult } from './useDeal'

const CUSTOM_PRESET = -1

export type InlineKind = 'custom' | 'prefs'
export type Inline = { kind: InlineKind; spec: DialogSpec }

const values = (controls: readonly DialogControl[]) =>
  JSON.stringify(controls.map((c) => c.value))

const ask = (api: PuzzleApi, kind: InlineKind) =>
  kind === 'custom' ? api.selectPreset(CUSTOM_PRESET) : api.preferences()

export function useConfigBox(
  apiRef: React.RefObject<PuzzleApi | null>,
  acted: () => void,
  setPrefs: React.Dispatch<React.SetStateAction<readonly DialogControl[]>>,
  // 自定义参数的「确定」会发牌,所以它走镜像,不在主线程上 dialogOk。
  deal: (values: readonly (string | number | boolean)[]) => Promise<DealResult>,
) {
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [inline, setInline] = useState<Inline | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const inlinePending = useRef<InlineKind | null>(null)
  const inlineRef = useRef<Inline | null>(null)
  const inlineBaseline = useRef('')

  const borrowed = useRef<{ spec: DialogSpec | null; error: string | null } | null>(null)

  // onDialog 的全部路由。借用的 box 不显示,答案在路过这里时被截下。
  const tookDialog = useCallback(
    (spec: DialogSpec | null) => {
      if (spec && borrowed.current) {
        borrowed.current.spec = spec
        return
      }
      const kind = inlinePending.current
      if (spec && kind) {
        inlinePending.current = null
        inlineRef.current = { kind, spec }
        inlineBaseline.current = values(spec.controls)
        setInlineError(null)
        setInline({ kind, spec })
        if (kind === 'prefs') setPrefs(spec.controls)
        return
      }
      if (!spec && inlineRef.current) {
        inlineRef.current = null
        setInlineError(null)
        setInline(null)
        return
      }
      setDialog(spec)
    },
    [setPrefs],
  )

  // onError 里归 config box 的两条路;都不认时返回 false,调用方走自己的报错。
  const tookError = useCallback((message: string) => {
    if (borrowed.current) {
      borrowed.current.error = message
      return true
    }
    if (inlineRef.current) {
      setInlineError(message)
      return true
    }
    return false
  }, [])

  const openInline = useCallback(
    (kind: InlineKind) => {
      const api = apiRef.current
      if (!api || dialog || inlineRef.current) return
      // pending 标签先立好,说明这次要的是哪一个。
      inlinePending.current = kind
      ask(api, kind)
    },
    [apiRef, dialog],
  )

  // 没开着就不许发 cancel:C 侧 command(4) 不查 cfg 是不是 NULL,free_cfg 直接
  // 解引用 0 地址,wasm 当场 trap(memory access out of bounds),引擎就死了。
  const closeInline = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
  }, [apiRef])

  // 提交完 box 要是关上了就再开一次:面板一直挂在 Types/Menu 里,得有活的控件。
  const reopen = useCallback((api: PuzzleApi, kind: InlineKind) => {
    if (inlineRef.current) return
    inlinePending.current = kind
    ask(api, kind)
  }, [])

  const commitInline = useCallback(() => {
    const api = apiRef.current
    const open = inlineRef.current
    if (!api || !open) return
    // 改回基线值也算一次「再试」:上一次被拒的错误串不该留着。
    setInlineError(null)
    if (values(open.spec.controls) === inlineBaseline.current) return
    acted()

    if (open.kind === 'custom') {
      // 主线程这只 box 一直开着、一直没提交,所以参数非法时它原地等玩家改,
      // 和上游一样。只有镜像算出新的一局才轮到主线程接手。
      const wanted = open.spec.controls.map((control) => control.value)
      void deal(wanted).then((outcome) => {
        const live = apiRef.current
        if (!live) return
        if (outcome.status === 'failed') return setInlineError(outcome.error)
        // busy 说明还有一次发牌在路上,由它去收尾,这里动手会把它的现场掀了。
        if (outcome.status === 'busy') return
        if (outcome.status === 'unavailable') {
          live.dialogOk()
          return reopen(live, 'custom')
        }
        // done 和 cancelled 都要把玩家改过的那份 cfg 丢掉——它从没提交过。不丢的话
        // 取消之后框里留着一个改了却没生效的值,和引擎里的参数对不上,是会撒谎的界面。
        // 重开一份是问引擎现在的参数要的,两种情况显示的都是真话。
        live.dialogCancel()
        if (outcome.status === 'done') live.loadGame(outcome.save)
        reopen(live, 'custom')
      })
      return
    }

    api.dialogOk()
    reopen(api, open.kind)
  }, [acted, apiRef, deal, reopen])

  // 借一次偏好 box:拿到的 controls 是与 C 共享的活对象,use 就地改、返回改没改。
  // 改了走 dialogOk 提交(引擎顺手写回存档),没改就 cancel;两条路都把新值喂回视图。
  // C 侧只有一个 config box:嵌着的那个(类型面板的参数列表常驻)先让位,借完再
  // 要回来——不让位这一借会被静默丢掉,键区的偏好键就成了哑巴。
  const borrowPrefs = useCallback(
    (use: (controls: DialogControl[]) => boolean) => {
      const api = apiRef.current
      if (!api || dialog) return
      const held = inlineRef.current?.kind
      if (held) api.dialogCancel()
      borrowed.current = { spec: null, error: null }
      api.preferences()
      const { spec } = borrowed.current
      if (spec) {
        if (use(spec.controls)) {
          api.dialogOk()
          // 提交被引擎回绝时 box 还开着,补一刀关掉,不然整个 config box 卡死。
          if (borrowed.current.error) api.dialogCancel()
        } else {
          api.dialogCancel()
        }
      }
      borrowed.current = null
      if (held) {
        inlinePending.current = held
        ask(api, held)
      }
      if (spec)
        setPrefs((was) => (values(was) === values(spec.controls) ? was : spec.controls))
    },
    [apiRef, dialog, setPrefs],
  )

  const readPrefs = useCallback(() => borrowPrefs(() => false), [borrowPrefs])

  const writePrefs = useCallback(
    (use: (controls: DialogControl[]) => boolean) =>
      borrowPrefs((controls) => {
        if (!use(controls)) return false
        acted()
        return true
      }),
    [acted, borrowPrefs],
  )

  return {
    dialog,
    inline,
    inlineError,
    tookDialog,
    tookError,
    openInline,
    closeInline,
    commitInline,
    readPrefs,
    writePrefs,
  }
}
