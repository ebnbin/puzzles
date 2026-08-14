import { useReducer } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { DialogControl } from './engine/types'

// row:sheet 里的紧凑行(左标签右控件,行间分隔线);stack:居中弹窗里的竖排大字段。
const ROW =
  'flex min-h-11 items-center justify-between gap-4 border-t border-border py-[0.35rem] text-sm'

export default function ConfigFields({
  controls,
  autoFocus = false,
  onCommit,
  layout = 'row',
}: {
  controls: DialogControl[]
  autoFocus?: boolean
  onCommit?: () => void
  layout?: 'row' | 'stack'
}) {
  // controls 是与 C 共享的活对象,后端 accept 时直接从这些对象上读 value:
  // 编辑必须原地赋值 + 手动 redraw,拷进 React state 会让对话框永远提交初始值。
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const row = layout === 'row'

  return (
    <>
      {controls.map((control, i) =>
        control.kind === 'boolean' ? (
          <label
            key={i}
            className={
              row ? ROW : 'mb-1 flex min-h-11 items-center gap-3 text-foreground'
            }
          >
            <span className={row ? 'min-w-0 flex-1' : undefined}>
              {control.label}
            </span>
            <Switch
              checked={control.value}
              onCheckedChange={(checked) => {
                control.value = checked
                redraw()
                onCommit?.()
              }}
            />
          </label>
        ) : control.kind === 'choices' ? (
          <label
            key={i}
            className={row ? ROW : 'mb-3 block text-sm text-muted-foreground'}
          >
            <span className={row ? 'min-w-0 flex-1' : 'mb-1.5 block'}>
              {control.label}
            </span>
            <Select
              value={String(control.value)}
              onValueChange={(value) => {
                control.value = Number(value)
                redraw()
                onCommit?.()
              }}
            >
              <SelectTrigger
                className={
                  row ? 'max-w-[62%] shrink-0' : 'h-11 w-full text-foreground'
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {control.choices.map((choice, index) => (
                  <SelectItem key={index} value={String(index)}>
                    {choice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : (
          <label
            key={i}
            className={row ? ROW : 'mb-3 block text-sm text-muted-foreground'}
          >
            <span className={row ? 'min-w-0 flex-1' : 'mb-1.5 block'}>
              {control.label}
            </span>
            {/* text 只在落定时(blur/Enter)commit,不在 onChange:宽度从 5 改到
                12 的路上会经过 1,没人想要 1;switch/select 每次 change 即落定。 */}
            <Input
              autoFocus={autoFocus && i === 0}
              value={control.value}
              onChange={(e) => {
                control.value = e.target.value
                redraw()
              }}
              onBlur={onCommit}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                onCommit?.()
              }}
              className={
                row
                  ? 'w-28 shrink-0 text-right tabular-nums'
                  : 'mt-1.5 h-11 bg-background text-foreground'
              }
            />
          </label>
        ),
      )}
    </>
  )
}
