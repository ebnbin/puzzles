import { useEffect, useRef } from 'react'
import Icon from './Icon'
import { Notice } from '@/components/ui/notice'
import { cn } from '@/lib/utils'

export default function ErrorNote({
  text,
  floating = false,
}: {
  text: string
  floating?: boolean
}) {
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!floating) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [floating])

  return (
    <Notice
      tone="error"
      floating={floating}
      role="alert"
      ref={ref}
      className={cn(floating ? 'pointer-events-none' : 'mt-3 scroll-m-3')}
    >
      <Icon name="alert" size={16} />
      <span>{text}</span>
    </Notice>
  )
}
