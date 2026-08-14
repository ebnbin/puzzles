import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-[0.45rem] whitespace-nowrap rounded-md font-medium transition-[background-color,color,transform,box-shadow] active:enabled:scale-[0.96] disabled:text-faint [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary font-semibold text-primary-foreground hover:enabled:bg-primary-hover active:enabled:bg-primary-hover',
        secondary:
          'bg-secondary text-secondary-foreground hover:enabled:bg-surface-3 active:enabled:bg-surface-3',
        soft: 'bg-primary-soft text-primary-soft-foreground hover:enabled:bg-primary-soft-hover active:enabled:bg-primary-soft-hover',
        ghost:
          'text-muted-foreground hover:enabled:bg-secondary hover:enabled:text-foreground active:enabled:bg-surface-3',
        outline:
          'border border-input bg-surface text-foreground hover:enabled:bg-secondary active:enabled:bg-surface-3',
        destructive: 'bg-destructive-soft text-destructive',
        link: 'gap-1 text-primary underline-offset-2 hover:enabled:underline active:enabled:scale-100',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-sm',
        icon: 'size-10 rounded-full active:enabled:scale-[0.92]',
        iconBar: 'h-9 w-10 rounded-full active:enabled:scale-[0.92]',
        bare: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
