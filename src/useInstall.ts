import { useSyncExternalStore } from 'react'

/**
 * Whether — and how — this visit can be put on the home screen.
 *
 * Chromium fires `beforeinstallprompt` when it judges the app installable;
 * the event is caught here at module load, before React exists, and held
 * until the button is pressed. iOS offers no event and no API at all: the
 * only way in is the share sheet, so there the button's job is to say so.
 * Already-installed visits (opened from the home screen) get no button.
 */

type Mode = 'none' | 'prompt' | 'ios' | 'installed'

/** The stashed Chromium event, which is also a one-shot handle to the dialog. */
type InstallPrompt = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPrompt | null = null

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS's own spelling of the same fact.
  (navigator as { standalone?: boolean }).standalone === true

const ios = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  // iPadOS calls itself a Mac, but Macs do not have five touch points.
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

function mode(): Mode {
  if (standalone()) return 'installed'
  if (deferred) return 'prompt'
  if (ios()) return 'ios'
  return 'none'
}

let current = mode()

const listeners = new Set<() => void>()

function refresh() {
  current = mode()
  for (const listener of listeners) listener()
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPrompt
  refresh()
})

window.addEventListener('appinstalled', () => {
  deferred = null
  refresh()
})

/** Open the browser's install dialog. Only meaningful in 'prompt' mode. */
export async function promptInstall() {
  const stashed = deferred
  if (!stashed) return
  await stashed.prompt()
  // Spent either way: the browser will not honour the same event twice.
  await stashed.userChoice
  deferred = null
  refresh()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => current

export function useInstall(): Mode {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
