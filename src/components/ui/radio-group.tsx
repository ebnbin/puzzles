import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const RadioGroup = RadioGroupPrimitive.Root

/* 药丸形的单选项:整个丸子是 role=radio 的按钮,圈点画在里面。 */
function RadioGroupChip({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'group inline-flex min-h-9 items-center gap-[0.45rem] rounded-full bg-secondary px-3 text-left text-sm tabular-nums text-foreground transition-[background-color,color] data-[state=checked]:bg-primary-soft data-[state=checked]:font-semibold data-[state=checked]:text-primary-soft-foreground',
        className,
      )}
      {...props}
    >
      <span className="grid size-3.5 shrink-0 place-items-center rounded-full border-[1.5px] border-border-strong transition-[border-color] group-data-[state=checked]:border-current">
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-current" />
      </span>
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupChip }
