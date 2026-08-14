import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui'
import { cn } from '@/lib/utils'
import { useSheetDrag } from '@/useSheetDrag'

/* 底部拉起的抽屉:手机贴底、可拖拽下滑关闭,≥48em 变居中卡片(断点和
   useSheetDrag 里的 DESKTOP 一致)。Escape、点 scrim、焦点圈由 Radix 管。 */
function Sheet({
  label,
  onClose,
  className,
  children,
}: {
  label: string
  onClose: () => void
  className?: string
  children: React.ReactNode
}) {
  const { ref, handlers } = useSheetDrag(onClose)
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-20 flex animate-fade-in items-end bg-scrim backdrop-blur-[3px] md:items-center md:justify-center">
          <DialogPrimitive.Content
            ref={ref}
            aria-describedby={undefined}
            className={cn(
              'w-full max-h-[85dvh] animate-rise-in overflow-y-auto overscroll-contain rounded-t-xl bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-(--shadow-3) outline-none will-change-transform md:w-[min(100%,34rem)] md:max-h-[80dvh] md:rounded-xl md:p-5',
              className,
            )}
            {...handlers}
          >
            <VisuallyHidden.Root asChild>
              <DialogPrimitive.Title>{label}</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div
              data-sheet-grip=""
              className="-mx-4 -mt-2 mb-1.5 grid h-7 cursor-grab touch-none place-items-center active:cursor-grabbing md:hidden"
              aria-hidden="true"
            >
              <div className="h-1 w-9 rounded-full bg-border-strong" />
            </div>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Sheet }
