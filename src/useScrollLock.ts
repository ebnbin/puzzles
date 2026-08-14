import { useLayoutEffect } from 'react'

export function useScrollLock(y: number) {
  useLayoutEffect(() => {
    const body = document.body
    const gutter = window.innerWidth - document.documentElement.clientWidth
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      pad: body.style.paddingRight,
    }
    body.style.position = 'fixed'
    body.style.top = `${-y}px`
    body.style.width = '100%'
    if (gutter > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${current + gutter}px`
    }
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.paddingRight = prev.pad
      window.scrollTo(0, y)
    }
  }, [y])
}
