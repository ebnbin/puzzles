// config box 协议:后端只有一个对话框(game ID、参数、偏好共用),打开了就
// 必须有人回答,答案归谁按打开的人算。三条路,onDialog 按这个顺序路由:
// borrowed(借用不显示,答案在路过时被截下)、inline(嵌在 Types/Menu 里的
// 自定义参数和偏好)、dialog(真正的模态,兜底)。
import { useCallback, useRef, useState } from 'react'
import type { DialogControl, DialogSpec, PuzzleApi } from '../../engine/types'

const CUSTOM_PRESET = -1

export type InlineKind = 'custom' | 'prefs'
export type Inline = { kind: InlineKind; spec: DialogSpec }

export type TextKind = 'desc' | 'seed'

const values = (controls: readonly DialogControl[]) =>
  JSON.stringify(controls.map((c) => c.value))

const ask = (api: PuzzleApi, kind: InlineKind) =>
  kind === 'custom' ? api.selectPreset(CUSTOM_PRESET) : api.preferences()

export function useConfigBox(
  apiRef: React.RefObject<PuzzleApi | null>,
  acted: () => void,
  setPrefs: React.Dispatch<React.SetStateAction<readonly DialogControl[]>>,
) {
  const [dialog, setDialog] = useState<DialogSpec | null>(null)
  const [inline, setInline] = useState<Inline | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const inlinePending = useRef<InlineKind | null>(null)
  const inlineRef = useRef<Inline | null>(null)
  const inlineBaseline = useRef('')

  const borrowed = useRef<{ spec: DialogSpec | null; error: string | null } | null>(null)
  const [textError, setTextError] = useState<{ kind: TextKind; message: string } | null>(null)

  // onDialog 的全部路由。game ID 和 seed 也是 config box,但只有一个字段、
  // 值早已在手:借用而不显示,box 的答案在路过这里时被截下。
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

  const closeInline = useCallback(() => {
    apiRef.current?.dialogCancel()
  }, [apiRef])

  const commitInline = useCallback(() => {
    const api = apiRef.current
    const open = inlineRef.current
    if (!api || !open) return
    if (values(open.spec.controls) === inlineBaseline.current) return
    acted()
    setInlineError(null)
    api.dialogOk()
    if (!inlineRef.current) {
      inlinePending.current = open.kind
      ask(api, open.kind)
    }
  }, [acted, apiRef])

  const submitText = useCallback(
    (kind: TextKind, text: string) => {
      const api = apiRef.current
      if (!api) return
      acted()
      const resume = inlineRef.current?.kind ?? null
      if (resume) api.dialogCancel()

      borrowed.current = { spec: null, error: null }
      if (kind === 'desc') api.enterGameId()
      else api.enterSeed()
      const { spec } = borrowed.current
      if (spec) {
        spec.controls[0].value = text
        api.dialogOk()
        if (borrowed.current.error) api.dialogCancel()
      }
      const message = borrowed.current.error
      borrowed.current = null
      setTextError(message ? { kind, message } : null)

      if (resume) {
        inlinePending.current = resume
        ask(api, resume)
      }
    },
    [acted, apiRef],
  )

  const readPrefs = useCallback(() => {
    const api = apiRef.current
    if (!api || dialog || inlineRef.current) return
    borrowed.current = { spec: null, error: null }
    api.preferences()
    const { spec } = borrowed.current
    if (spec) api.dialogCancel()
    borrowed.current = null
    if (spec)
      setPrefs((was) => (values(was) === values(spec.controls) ? was : spec.controls))
  }, [apiRef, dialog, setPrefs])

  // Types/Menu 收起时把挂着的 inline 一并退掉。
  const abandonInline = useCallback(() => {
    if (inlineRef.current) apiRef.current?.dialogCancel()
  }, [apiRef])

  const clearTextError = useCallback(() => setTextError(null), [])

  return {
    dialog,
    inline,
    inlineError,
    textError,
    tookDialog,
    tookError,
    openInline,
    closeInline,
    commitInline,
    submitText,
    readPrefs,
    abandonInline,
    clearTextError,
  }
}
