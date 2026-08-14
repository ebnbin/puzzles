import { Dialog as DialogPrimitive } from 'radix-ui'
import Icon from '@/Icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogClose = DialogPrimitive.Close

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      {/* overlay 自己滚动 + grid 居中:矮屏上超高的卡片也能滚到底;卡片另设
          max-height,高个子在卡内滚。 */}
      <DialogPrimitive.Overlay className="fixed inset-0 z-30 grid animate-fade-in place-items-center overflow-y-auto overscroll-contain bg-scrim p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]">
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'w-full max-w-[26rem] max-h-[85dvh] animate-rise-in overflow-y-auto overscroll-contain rounded-xl bg-card p-5 shadow-(--shadow-3) outline-none',
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold tracking-[-0.015em]', className)}
      {...props}
    />
  )
}

function DialogHead({
  title,
  close,
  className,
}: {
  title: string
  close: string
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-2', className)}>
      <DialogTitle>{title}</DialogTitle>
      <DialogClose asChild>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2.5 -mt-2.5"
          aria-label={close}
        >
          <Icon name="close" size={20} />
        </Button>
      </DialogClose>
    </div>
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mt-6 flex gap-2 md:justify-end', className)} {...props} />
  )
}

export { Dialog, DialogClose, DialogContent, DialogFooter, DialogHead, DialogTitle }
