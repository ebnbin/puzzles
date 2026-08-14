import { cn } from '@/lib/utils'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        // text-[1rem] ≥16px:再小 iOS 聚焦输入框时会缩放整页
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-surface px-2.5 text-[1rem] text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
