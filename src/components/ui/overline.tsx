import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

/* 小节标题:sheet 的分组名、输入框的标签共用这一款 */
function Overline({
  asChild,
  className,
  ...props
}: React.ComponentProps<'h2'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'h2'
  return (
    <Comp
      className={cn(
        'mb-2 block text-2xs font-semibold uppercase tracking-[0.08em] text-faint',
        className,
      )}
      {...props}
    />
  )
}

export { Overline }
