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

      // 报给后端的是封顶后的房间,不是真实面积:后端在 new game/换 preset/改偏好/
      // 读档后会自己重新量,答真实面积等于放那些路径越过 MAX_ZOOM。
      const w = Math.min(width, natural.current.w * MAX_ZOOM)
      const h = Math.min(height, natural.current.h * MAX_ZOOM)

      renderer.setAvailable(w, h)

      const key = `${Math.round(w)}x${Math.round(h)}`
      if (key === last) return
      last = key

      // rescale 不是笔误:正门 resize() 的守卫拿设备像素比逻辑像素,2x 屏且要到
      // 2 倍自然尺寸时恰好相等——midend_size 已跑而 canvas 没动,首次点击才局部重画。
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
