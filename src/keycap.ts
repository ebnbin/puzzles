import { cn } from '@/lib/utils'

// 键帽的状态皮肤,叠在 Button secondary 上;data-* 由 keys.ts 发牌决定
// (whose=upstream 转发上游的键 / ours 我们这侧补答的键;on=开关生效;brush=画笔)。
// 颜色态全部挂 enabled:,禁用时统一落回 Button 的 disabled:text-faint。
export const keycap = cn(
  'enabled:data-[whose=upstream]:text-primary',
  'enabled:data-[whose=ours]:bg-primary-soft enabled:data-[whose=ours]:text-primary-soft-foreground',
  'hover:enabled:data-[whose=ours]:bg-primary-soft-hover active:enabled:data-[whose=ours]:bg-primary-soft-hover',
  'enabled:data-[on]:bg-surface-3',
  'enabled:data-[on]:data-[whose=ours]:bg-primary enabled:data-[on]:data-[whose=ours]:text-primary-foreground',
  'hover:enabled:data-[on]:data-[whose=ours]:bg-primary-hover active:enabled:data-[on]:data-[whose=ours]:bg-primary-hover',
  'data-[brush]:shadow-[inset_0_0_0_2px_var(--accent)]',
)
