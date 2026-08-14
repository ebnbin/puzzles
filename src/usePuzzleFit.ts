import { useEffect, useRef } from 'react'
import type { CanvasRenderer } from './engine/renderer'
import type { PuzzleApi } from './engine/types'

const MAX_ZOOM = 2

function contentBox(element: HTMLElement) {
  const style = getComputedStyle(element)
  return {
    width:
      element.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height:
      element.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom),
  }
}

function naturalSize(api: PuzzleApi, renderer: CanvasRenderer) {
  renderer.forgetAvailable()
  api.restoreSize()
  return renderer.cssSize()
}

export function usePuzzleFit(
  areaRef: React.RefObject<HTMLElement | null>,
  apiRef: React.RefObject<PuzzleApi | null>,
  rendererRef: React.RefObject<CanvasRenderer | null>,
  enabled: boolean,
  params: string,
) {
  const natural = useRef<{ w: number; h: number } | null>(null)

  useEffect(() => {
    natural.current = null
  }, [params])

  useEffect(() => {
    const area = areaRef.current
    if (!area || !enabled) return

    let last = ''
    let frame = 0

    const fit = () => {
      const api = apiRef.current
      const renderer = rendererRef.current
      if (!api || !renderer) return
      const { width, height } = contentBox(area)
      if (width < 1 || height < 1) return

      if (!natural.current) natural.current = naturalSize(api, renderer)

      const w = Math.min(width, natural.current.w * MAX_ZOOM)
      const h = Math.min(height, natural.current.h * MAX_ZOOM)

      renderer.setAvailable(w, h)

      const key = `${Math.round(w)}x${Math.round(h)}`
      if (key === last) return
      last = key

      api.rescale()
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    }

    const observer = new ResizeObserver(schedule)
    observer.observe(area)
    schedule()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [areaRef, apiRef, rendererRef, enabled, params])
}
