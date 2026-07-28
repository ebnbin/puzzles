import { useEffect } from 'react'

/**
 * Stop a downward swipe from reloading the page while a puzzle is open.
 *
 * Android Chrome reloads on a pull-down from the top, and iOS Safari does the
 * same; either takes the position with it, since nothing is saved between
 * loads. That is a bad trade for a gesture nobody wants here — there is no
 * feed to refresh.
 *
 * It has to go on the root element: overscroll-behavior only reaches the
 * viewport from there, and it has to be `none` rather than `contain`, which
 * stops scroll chaining but leaves the refresh affordance in place.
 *
 * Only while playing. The launcher is a list with nothing to lose, and
 * refresh is what a pull-down is supposed to do on a page like that.
 */
export function useNoPullToRefresh() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('playing')
    return () => root.classList.remove('playing')
  }, [])
}
