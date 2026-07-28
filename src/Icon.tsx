/**
 * The app's icons, drawn rather than downloaded.
 *
 * Fourteen glyphs is far less than any icon font weighs, and inlining them
 * means no extra request, no flash of missing icon, and `currentColor`
 * throughout. They are built from circles, straight lines and quarter turns on
 * a 24 grid — the same vocabulary the puzzles themselves are drawn in.
 *
 * Always `aria-hidden`: every icon here sits inside a button that already has
 * a name, either its own text or an `aria-label`. Announcing the glyph as well
 * would just say everything twice.
 */

export type IconName =
  | 'back'
  | 'undo'
  | 'redo'
  | 'fullscreen'
  | 'fullscreenExit'
  | 'menu'
  | 'add'
  | 'restart'
  | 'solve'
  | 'gameId'
  | 'seed'
  | 'prefs'
  | 'external'
  | 'check'
  | 'help'
  | 'share'

const PATHS: Record<IconName, React.ReactNode> = {
  back: (
    <>
      <path d="M19.5 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  undo: (
    <>
      <path d="M9.5 14 4.5 9l5-5" />
      <path d="M4.5 9H12a5.5 5.5 0 0 1 0 11H8" />
    </>
  ),
  redo: (
    <>
      <path d="M14.5 14l5-5-5-5" />
      <path d="M19.5 9H12a5.5 5.5 0 0 0 0 11h4" />
    </>
  ),
  fullscreen: (
    <>
      <path d="M4 9.5V4h5.5" />
      <path d="M20 9.5V4h-5.5" />
      <path d="M4 14.5V20h5.5" />
      <path d="M20 14.5V20h-5.5" />
    </>
  ),
  fullscreenExit: (
    <>
      <path d="M9.5 4v5.5H4" />
      <path d="M14.5 4v5.5H20" />
      <path d="M9.5 20v-5.5H4" />
      <path d="M14.5 20v-5.5H20" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  /* A circle left open at the top, with the tail and head of the arrow. */
  restart: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 7.5-7.5H7" />
      <path d="M10 1.5 6.5 4.5 10 7.5" />
    </>
  ),
  /* A bulb as the puzzles would draw one: a circle over a screw base. */
  solve: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9.5 15.8V18a1.6 1.6 0 0 0 1.6 1.6h1.8A1.6 1.6 0 0 0 14.5 18v-2.2" />
    </>
  ),
  gameId: (
    <>
      <path d="M9.8 3.5 7.8 20.5" />
      <path d="M16.6 3.5l-2 17" />
      <path d="M4.6 9h15" />
      <path d="M3.6 15h15" />
    </>
  ),
  /* Three pips on a die: a seed is a roll. */
  seed: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.6" cy="8.6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.4" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  prefs: (
    <>
      <path d="M4 8h2.4" />
      <path d="M11.6 8H20" />
      <circle cx="9" cy="8" r="2.6" />
      <path d="M4 16h9.4" />
      <path d="M18.6 16H20" />
      <circle cx="16" cy="16" r="2.6" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 8" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M9.5 9.4a2.6 2.6 0 1 1 4 2.2c-.9.6-1.5 1.1-1.5 2v.6" />
      <circle cx="12" cy="17.1" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  /* Three nodes and the lines between them — a network, like half the
     collection. */
  share: (
    <>
      <circle cx="17.5" cy="5.5" r="2.75" />
      <circle cx="6.5" cy="12" r="2.75" />
      <circle cx="17.5" cy="18.5" r="2.75" />
      <path d="m9 10.7 6-3.4" />
      <path d="m9 13.3 6 3.4" />
    </>
  ),
}

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
