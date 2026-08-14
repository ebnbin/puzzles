// 换屏幕和画廊收卡都走这里:feature test、reduced-motion、把 React 渲染塞进
// 被捕获帧的 flushSync,三样别在别处写第二遍。
import { flushSync } from 'react-dom'

type ViewTransition = { finished: Promise<void> }

type WithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition
}

export function canTransition(): boolean {
  return (
    typeof (document as WithViewTransition).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// 第二次 transition 会让浏览器放弃第一次,而被放弃那次的 finished 在新一次接管
// root 之后才 settle:live 计数防老 transition 的收尾把新一次的 data-transition 扒掉。
let live = 0

export function withViewTransition(
  update: () => void,
  kind?: string,
): ViewTransition | null {
  if (!canTransition()) {
    update()
    return null
  }
  const start = (document as WithViewTransition).startViewTransition!
  const root = document.documentElement
  const mine = ++live
  if (kind) root.dataset.transition = kind
  const transition = start.call(document, () => flushSync(update))
  if (kind) {
    const undress = () => {
      if (live === mine) delete root.dataset.transition
    }
    transition.finished.then(undress, undress)
  }
  return transition
}
