import { useEffect, useRef } from 'react'
import Icon from './Icon'

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
    <p
      className={
        floating ? 'notice notice-error is-floating' : 'notice notice-error'
      }
      role="alert"
      ref={ref}
    >
      <Icon name="alert" size={16} />
      <span>{text}</span>
    </p>
  )
}
