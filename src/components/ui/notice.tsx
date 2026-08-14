import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const noticeVariants = cva(
  'flex items-start gap-[0.4rem] rounded-md px-[0.7rem] py-2 text-sm [&>svg]:mt-[0.15rem] [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        error: 'bg-destructive-soft text-destructive',
        raised: 'bg-raised text-foreground',
      },
      floating: {
        true: 'absolute inset-x-[0.6rem] top-[0.6rem] z-[2] animate-drop-in shadow-(--shadow-2)',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'error',
      floating: false,
    },
  },
)

function Notice({
  className,
  tone,
  floating,
  ...props
}: React.ComponentProps<'p'> & VariantProps<typeof noticeVariants>) {
  return (
    <p className={cn(noticeVariants({ tone, floating, className }))} {...props} />
  )
}

export { Notice }
