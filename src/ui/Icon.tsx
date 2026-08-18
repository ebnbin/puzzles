// 位图素材的名字(/art/<name>-<theme>.png);矢量字形一律走 IconName。
export type ImageName = 'ghost' | 'vampire' | 'zombie'

export type IconName =
  | 'clear'
  | 'marks'
  | 'hint'
  | 'jumble'
  | 'done'
  | 'lock'
  | 'back'
  | 'undo'
  | 'redo'
  | 'menu'
  | 'add'
  | 'restart'
  | 'solve'
  | 'type'
  | 'prefs'
  | 'external'
  | 'eye'
  | 'eyeOff'
  | 'close'
  | 'help'
  | 'alert'
  | 'caret'
  | 'sun'
  | 'moon'
  | 'trash'
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowLeft'
  | 'arrowRight'
  | 'arrowUpLeft'
  | 'arrowUpRight'
  | 'arrowDownLeft'
  | 'arrowDownRight'
  | 'sweepUp'
  | 'sweepDown'
  | 'sweepLeft'
  | 'sweepRight'
  | 'rotate'
  | 'turnLeft'
  | 'turnRight'
  | 'lock'
  | 'pencil'
  | 'black'
  | 'white'
  | 'grey'
  | 'primary'
  | 'secondary'
  | 'lockTile'
  | 'lockTileOn'
  | 'lockPlace'
  | 'lockPlaceOn'
  | 'pushUp'
  | 'pushDown'
  | 'pushLeft'
  | 'pushRight'
  | 'place'
  | 'hold'
  | 'flip'
  | 'select'
  | 'jump'
  | 'domino'
  | 'dominoOn'
  | 'line'
  | 'lineOn'
  | 'vertex'
  | 'cycle'
  | 'laser'
  | 'ball'
  | 'ballOn'
  | 'unlock'
  | 'slash'
  | 'backslash'
  | 'bareSquare'
  | 'emptyCell'
  | 'dotSquare'
  | 'circleSquare'
  | 'tent'
  | 'grass'
  | 'lamp'
  | 'plusSquare'
  | 'minusSquare'
  | 'crossSquare'
  | 'questionSquare'
  | 'track'
  | 'floodFill'
  | 'advance'
  | 'edge'
  | 'noEdge'
  | 'island'
  | 'islandDone'
  | 'linkFrom'
  | 'linkTo'
  | 'drawLine'
  | 'galaxyArrow'
  | 'stipple'
  | 'uncover'
  | 'chord'
  | 'flag'
  | 'mark'
  | 'erase'
  | 'cancel'
  | 'sweep'
  | 'bridge'
  | 'noBridge'
  | 'crossNext'
  | 'pencilHold'
  | 'numberPeg'
  | 'numberRegion'
  | 'numberBlack'
  | 'maybeBridge'
  | 'faintLine'
  | 'towersFlat'
  | 'towersTall'
  | 'asPicture'
  | 'asLetter'
  | 'countTotal'
  | 'countLeft'
  | 'countBoth'

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
  restart: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 7.5-7.5H7" />
      <path d="M10 1.5 6.5 4.5 10 7.5" />
    </>
  ),
  solve: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9.5 15.8V18a1.6 1.6 0 0 0 1.6 1.6h1.8A1.6 1.6 0 0 0 14.5 18v-2.2" />
    </>
  ),
  type: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3" />
      <path d="M3.6 9.2h16.8" />
      <path d="M3.6 14.8h16.8" />
      <path d="M9.2 3.6v16.8" />
      <path d="M14.8 3.6v16.8" />
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

  clear: (
    <>
      <path d="M20 5.5H9.2L3.4 12l5.8 6.5H20a1.6 1.6 0 0 0 1.6-1.6V7.1A1.6 1.6 0 0 0 20 5.5Z" />
      <path d="m12.4 9.6 5.2 4.8" />
      <path d="m17.6 9.6-5.2 4.8" />
    </>
  ),
  marks: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="8.4" cy="8.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="8.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="15.6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.6" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  hint: (
    <>
      <path d="M3.6 20.4 13.8 10.2" />
      <path d="m16.4 7.6 2.4-2.4" />
      <path d="M19.6 11.4v2.8" />
      <path d="M18.2 12.8h2.8" />
      <path d="M12.4 3.4v2.4" />
      <path d="M11.2 4.6h2.4" />
    </>
  ),

  jumble: (
    <>
      <path d="M3.4 7.4h3.8l9.6 9.2h3.8" />
      <path d="M3.4 16.6h3.8l9.6-9.2h3.8" />
      <path d="m17.8 4.2 3 3.2-3 3.2" />
      <path d="m17.8 13.4 3 3.2-3 3.2" />
    </>
  ),

  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M9.5 9.4a2.6 2.6 0 1 1 4 2.2c-.9.6-1.5 1.1-1.5 2v.6" />
      <circle cx="12" cy="17.1" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7.4v5.2" />
      <circle cx="12" cy="16.6" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  caret: <path d="m7.5 10 4.5 4.5 4.5-4.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2.2" />
      <path d="M12 19.2v2.2" />
      <path d="M2.6 12h2.2" />
      <path d="M19.2 12h2.2" />
      <path d="m5.3 5.3 1.6 1.6" />
      <path d="m17.1 17.1 1.6 1.6" />
      <path d="m18.7 5.3-1.6 1.6" />
      <path d="m6.9 17.1-1.6 1.6" />
    </>
  ),
  moon: <path d="M20.6 13.4A8.6 8.6 0 1 1 10.6 3.4 6.7 6.7 0 0 0 20.6 13.4Z" />,
  trash: (
    <>
      <path d="M4.5 6.8h15" />
      <path d="M9.2 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4v1.6" />
      <path d="M6.6 6.8 7.5 19a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l.9-12.2" />
      <path d="M10.4 10.4v6" />
      <path d="M13.6 10.4v6" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  arrowUpLeft: (
    <>
      <path d="M17.5 17.5 6.5 6.5" />
      <path d="M6.5 14.5v-8h8" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M9.5 6.5h8v8" />
    </>
  ),
  arrowDownLeft: (
    <>
      <path d="M17.5 6.5 6.5 17.5" />
      <path d="M14.5 17.5h-8v-8" />
    </>
  ),
  arrowDownRight: (
    <>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M17.5 9.5v8h-8" />
    </>
  ),
  sweepUp: (
    <>
      <path d="M12 16.4V5" />
      <path d="m6 11 6-6 6 6" />
      <rect x="9.2" y="16.6" width="5.6" height="5.6" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  sweepDown: (
    <>
      <path d="M12 7.6v11.4" />
      <path d="m6 13 6 6 6-6" />
      <rect x="9.2" y="1.8" width="5.6" height="5.6" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  sweepLeft: (
    <>
      <path d="M16.4 12H5" />
      <path d="m11 6-6 6 6 6" />
      <rect x="16.6" y="9.2" width="5.6" height="5.6" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  sweepRight: (
    <>
      <path d="M7.6 12h11.4" />
      <path d="m13 6 6 6-6 6" />
      <rect x="1.8" y="9.2" width="5.6" height="5.6" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  rotate: (
    <>
      <path d="M5.6 7.5a7.5 7.5 0 1 1-1.1 3.9" />
      <path d="m9.4 7.2-3.9.6-.6-3.9" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  black: (
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" fill="var(--cell-full)" />
  ),
  white: (
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" fill="var(--cell-empty)" />
  ),
  grey: (
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" fill="var(--cell-unknown)" />
  ),
  pencil: (
    <>
      <path d="M4.2 19.8 5.4 15.6 16.2 4.8a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L9 19.2Z" />
      <path d="m14.8 6.2 3 3" />
    </>
  ),
  // 「标数字」三兄弟共用同一个 1 的折线:圆=色钉(guess)、方=区域(map)、
  // 实心方里抠出来=涂黑的格子(singles,evenodd 把数字挖成洞)。
  numberPeg: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M13.3 8.2 13.3 16 11.6 16 11.6 10.2 10 10.9 10 9.3 11.7 8.2Z" fill="currentColor" stroke="none" />
    </>
  ),
  numberRegion: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M13.3 8.2 13.3 16 11.6 16 11.6 10.2 10 10.9 10 9.3 11.7 8.2Z" fill="currentColor" stroke="none" />
    </>
  ),
  numberBlack: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      stroke="none"
      d="M6 3.4h12a2.6 2.6 0 0 1 2.6 2.6v12a2.6 2.6 0 0 1-2.6 2.6H6A2.6 2.6 0 0 1 3.4 18V6A2.6 2.6 0 0 1 6 3.4Z M13.3 8.2 13.3 16 11.6 16 11.6 10.2 10 10.9 10 9.3 11.7 8.2Z"
    />
  ),
  // 一条被划掉、但仍旧淡淡画着的格线。
  faintLine: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 3.4v17.2" strokeDasharray="1.5 1.9" />
    </>
  ),
  // 同一排塔的两种画法:摊平成格子 / 立起来见高矮。towers 那个键的两张脸。
  towersFlat: (
    <>
      <rect x="3.2" y="9.4" width="5.2" height="5.2" rx="1.2" />
      <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.2" />
      <rect x="15.6" y="9.4" width="5.2" height="5.2" rx="1.2" />
    </>
  ),
  towersTall: (
    <>
      <path d="M5.8 20.2V15.4" strokeWidth="2.8" />
      <path d="M12 20.2V10.6" strokeWidth="2.8" />
      <path d="M18.2 20.2V5.8" strokeWidth="2.8" />
    </>
  ),
  // 怪物画成图 / 写成字母。undead 那个键的两张脸;字母那张就是 G(幽灵)。
  asPicture: (
    <>
      <path d="M6 20.4V9.6a6 6 0 0 1 12 0v10.8l-2.4-1.8-2.4 1.8-2.4-1.8-2.4 1.8z" />
      <circle cx="9.9" cy="10.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="10.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  asLetter: <path d="M16.9 9.2A5.6 5.6 0 1 0 16.9 14.8L16.9 12.4 13.2 12.4" />,
  // 计数怎么写:一个数 / 一个数还在往下走 / 两个数一道斜杠。三张脸一个键。
  countTotal: <rect x="9" y="7.6" width="6" height="8.8" rx="1.4" />,
  countLeft: (
    <>
      <rect x="3.8" y="7.6" width="6" height="8.8" rx="1.4" />
      <path d="M16.6 8.2v7.6" />
      <path d="m13.9 13.2 2.7 2.6 2.7-2.6" />
    </>
  ),
  countBoth: (
    <>
      <rect x="3.2" y="7.6" width="5.6" height="8.8" rx="1.4" />
      <rect x="15.2" y="7.6" width="5.6" height="8.8" rx="1.4" />
      <path d="M13.4 6.8 10.6 17.2" />
    </>
  ),
  // 虚线的桥 = 还架得上的地方;实线那根是 bridge,打叉那个是 noBridge。
  maybeBridge: (
    <>
      <circle cx="4.6" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="19.4" cy="12" r="3" fill="currentColor" stroke="none" />
      <path d="M8.2 12h7.6" strokeWidth="2.4" strokeDasharray="2.2 2.6" />
    </>
  ),
  // 四角框 = 那圈高亮,框里一支笔 = 铅笔标记。整方框那一族已经很挤,四角是空位。
  pencilHold: (
    <>
      <path d="M3.4 8.6V6A2.6 2.6 0 0 1 6 3.4h2.6" />
      <path d="M15.4 3.4H18A2.6 2.6 0 0 1 20.6 6v2.6" />
      <path d="M20.6 15.4V18a2.6 2.6 0 0 1-2.6 2.6h-2.6" />
      <path d="M8.6 20.6H6A2.6 2.6 0 0 1 3.4 18v-2.6" />
      <path d="m9 15 .6-2.4 4-4 1.8 1.8-4 4z" />
    </>
  ),
  turnLeft: (
    <>
      <path d="M5.6 7.5a7.5 7.5 0 1 1-1.1 3.9" />
      <path d="m9.4 7.2-3.9.6-.6-3.9" />
    </>
  ),
  turnRight: (
    <g transform="translate(24,0) scale(-1,1)">
      <path d="M5.6 7.5a7.5 7.5 0 1 1-1.1 3.9" />
      <path d="m9.4 7.2-3.9.6-.6-3.9" />
    </g>
  ),
  place: (
    <>
      <circle cx="12" cy="15.4" r="5.6" fill="currentColor" />
      <path d="M12 2.4v4.8" />
      <path d="m9 5 3 3 3-3" />
    </>
  ),
  hold: (
    <>
      <circle cx="12" cy="10.4" r="6.4" fill="currentColor" />
      <path d="M6.4 20.2h11.2" />
    </>
  ),
  flip: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path
        d="M20.6 3.4 3.4 20.6V6a2.6 2.6 0 0 1 2.6-2.6Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M20.6 3.4 3.4 20.6" />
    </>
  ),
  select: (
    <>
      <rect x="3.2" y="3.2" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <rect x="3.2" y="13.6" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <rect x="13.6" y="13.6" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
    </>
  ),
  jump: (
    <>
      <path d="M4.4 15a7.6 7.6 0 0 1 15.2 0" />
      <circle cx="4.4" cy="17.6" r="3" fill="currentColor" />
      <circle cx="12" cy="17.6" r="2" fill="currentColor" />
      <circle cx="19.6" cy="17.6" r="3" />
    </>
  ),
  domino: (
    <>
      <rect x="2.4" y="7" width="19.2" height="10" rx="2.4" />
      <path d="M12 7v10" />
    </>
  ),
  dominoOn: <rect x="2.4" y="7" width="19.2" height="10" rx="2.4" fill="currentColor" />,
  line: (
    <>
      <rect x="1.8" y="7" width="7.8" height="10" rx="2" />
      <rect x="14.4" y="7" width="7.8" height="10" rx="2" />
      <path d="M12 5.6v12.8" />
    </>
  ),
  lineOn: (
    <>
      <rect x="1.8" y="7" width="7.8" height="10" rx="2" />
      <rect x="14.4" y="7" width="7.8" height="10" rx="2" />
      <path d="M12 5.6v12.8" strokeWidth="3.4" />
    </>
  ),
  vertex: (
    <>
      <path d="M12 12 4 5.6" />
      <path d="M12 12 20.4 8" />
      <path d="M12 12 8.6 20.6" />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </>
  ),
  cycle: (
    <>
      <circle cx="12" cy="4.8" r="2.4" fill="currentColor" />
      <circle cx="19.2" cy="12" r="2.4" />
      <circle cx="12" cy="19.2" r="2.4" />
      <circle cx="4.8" cy="12" r="2.4" />
    </>
  ),
  laser: (
    <>
      <rect x="2.4" y="8.4" width="7.2" height="7.2" rx="1.6" fill="currentColor" />
      <path d="M12.4 12h9" />
      <path d="M12.8 7.6 20 5.4" />
      <path d="M12.8 16.4 20 18.6" />
    </>
  ),
  ball: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="4.4" />
    </>
  ),
  ballOn: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
    </>
  ),
  slash: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M7.4 16.6 16.6 7.4" />
    </>
  ),
  backslash: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="m7.4 7.4 9.2 9.2" />
    </>
  ),
  bareSquare: <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />,
  emptyCell: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M8.6 12h6.8" />
    </>
  ),
  dotSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </>
  ),
  circleSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="12" cy="12" r="4.6" />
    </>
  ),
  tent: (
    <>
      <path d="M12 4.4 3.6 19.6h16.8Z" />
      <path d="M12 4.4v15.2" />
    </>
  ),
  grass: (
    <>
      <path d="M4.6 20.4c0-5 1.4-8 3.4-9.6" />
      <path d="M12 20.4c0-6.4.8-10.4 0-14.8" />
      <path d="M19.4 20.4c0-5-1.4-8-3.4-9.6" />
    </>
  ),
  lamp: (
    <>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
      <path d="M12 2.6v2.6" />
      <path d="M12 18.8v2.6" />
      <path d="M2.6 12h2.6" />
      <path d="M18.8 12h2.6" />
      <path d="m5.4 5.4 1.8 1.8" />
      <path d="m16.8 16.8 1.8 1.8" />
      <path d="m18.6 5.4-1.8 1.8" />
      <path d="m7.2 16.8-1.8 1.8" />
    </>
  ),
  plusSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 7.6v8.8" />
      <path d="M7.6 12h8.8" />
    </>
  ),
  minusSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M7.6 12h8.8" />
    </>
  ),
  crossSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="m8.4 8.4 7.2 7.2" />
      <path d="m15.6 8.4-7.2 7.2" />
    </>
  ),
  questionSquare: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5" />
      <path d="M12 16.9v.1" />
    </>
  ),
  track: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M3.4 12h17.2" />
      <path d="M9 8.8v6.4" />
      <path d="M15 8.8v6.4" />
    </>
  ),
  floodFill: (
    <>
      <path d="M4.2 4.2h6.4v6.4H4.2Z" fill="currentColor" />
      <path d="M17 6.6c1.9 2.4 3 4.1 3 5.4a3 3 0 0 1-6 0c0-1.3 1.1-3 3-5.4Z" />
      <path d="M4.2 14.6v5.2h5.2" />
      <path d="M13.4 19.8h6.4" />
    </>
  ),
  advance: (
    <>
      <path d="M5 5.4 15 12 5 18.6Z" fill="currentColor" />
      <path d="M18.6 5.4v13.2" />
    </>
  ),
  edge: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 3.6v16.8" strokeWidth="3.4" />
    </>
  ),
  noEdge: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M12 3.6v4.4" />
      <path d="M12 16v4.4" />
      <path d="m9.4 9.4 5.2 5.2" />
      <path d="m14.6 9.4-5.2 5.2" />
    </>
  ),
  island: (
    <>
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <path d="M12 3.4v3.4" />
      <path d="M12 17.2v3.4" />
      <path d="M3.4 12h3.4" />
      <path d="M17.2 12h3.4" />
    </>
  ),
  islandDone: (
    <>
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <circle cx="12" cy="12" r="8.4" />
    </>
  ),
  bridge: (
    <>
      <circle cx="4.6" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="19.4" cy="12" r="3" fill="currentColor" stroke="none" />
      <path d="M8.2 12h7.6" strokeWidth="2.4" />
    </>
  ),
  noBridge: (
    <>
      <circle cx="4.6" cy="12" r="3" fill="currentColor" stroke="none" />
      <circle cx="19.4" cy="12" r="3" fill="currentColor" stroke="none" />
      <path d="M8.6 8.6 15.4 15.4" />
      <path d="M15.4 8.6 8.6 15.4" />
    </>
  ),
  crossNext: (
    <>
      <path d="M3.4 12h2.6" strokeWidth="3.4" />
      <path d="M18 12h2.6" strokeWidth="3.4" />
      <path d="m8 8 8 8" strokeWidth="2.2" />
      <path d="m16 8-8 8" strokeWidth="2.2" />
    </>
  ),
  linkFrom: (
    <>
      <rect x="2.4" y="8" width="8" height="8" rx="1.8" fill="currentColor" />
      <path d="M10.8 12h2.4" />
      <rect x="13.6" y="8" width="8" height="8" rx="1.8" />
    </>
  ),
  linkTo: (
    <>
      <rect x="2.4" y="8" width="8" height="8" rx="1.8" />
      <path d="M10.8 12h2.4" />
      <rect x="13.6" y="8" width="8" height="8" rx="1.8" fill="currentColor" />
    </>
  ),
  drawLine: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <path d="M3.6 12h4.8a3.6 3.6 0 0 1 3.6 3.6v4.8" />
    </>
  ),
  galaxyArrow: (
    <>
      <circle cx="17.6" cy="6.4" r="2.6" fill="currentColor" />
      <path d="M4.2 19.8 14.4 9.6" />
      <path d="M4.2 14.4v5.4h5.4" />
    </>
  ),
  sweep: (
    <>
      <rect x="1.8" y="9.2" width="5.6" height="5.6" rx="1" fill="currentColor" />
      <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1" fill="currentColor" />
      <rect x="16.6" y="9.2" width="5.6" height="5.6" rx="1" />
    </>
  ),
  stipple: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" />
      <circle cx="8.4" cy="8.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="8.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="15.6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="15.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  uncover: (
    <>
      <path d="M3.6 6.2a2.6 2.6 0 0 1 2.6-2.6h11.6a2.6 2.6 0 0 1 2.6 2.6v11.6a2.6 2.6 0 0 1-2.6 2.6H6.2a2.6 2.6 0 0 1-2.6-2.6Z" />
      <path d="M14.4 3.6v6.4h6" />
    </>
  ),
  chord: (
    <>
      <rect x="9" y="9" width="6" height="6" rx="1.3" fill="currentColor" />
      <circle cx="4.2" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="4.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="19.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="19.8" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  flag: (
    <>
      <path d="M6.4 20.6h11.2" />
      <path d="M8.6 20.6V3.8" />
      <path d="M8.6 4.6h9.2l-2.6 3.6 2.6 3.6H8.6" />
    </>
  ),
  lockTile: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.6-.9" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" fill="currentColor" />
    </>
  ),
  lockTileOn: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.8 0V11" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" fill="currentColor" />
    </>
  ),
  lockPlace: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.6-.9" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" />
    </>
  ),
  lockPlaceOn: (
    <>
      <rect x="5.4" y="11" width="13.2" height="9.6" rx="2.1" />
      <path d="M8.6 11V8.2a3.4 3.4 0 0 1 6.8 0V11" />
      <rect x="9.4" y="14.2" width="4.8" height="4.8" rx="1" />
    </>
  ),
  pushUp: (
    <>
      <rect x="8.2" y="2.6" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M12 21v-7.4" />
      <path d="m8.4 17.2 3.6-3.6 3.6 3.6" />
    </>
  ),
  pushDown: (
    <>
      <rect x="8.2" y="13.8" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M12 3v7.4" />
      <path d="m8.4 6.8 3.6 3.6 3.6-3.6" />
    </>
  ),
  pushLeft: (
    <>
      <rect x="2.6" y="8.2" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M21 12h-7.4" />
      <path d="m17.2 8.4-3.6 3.6 3.6 3.6" />
    </>
  ),
  pushRight: (
    <>
      <rect x="13.8" y="8.2" width="7.6" height="7.6" rx="1.6" fill="currentColor" />
      <path d="M3 12h7.4" />
      <path d="m6.8 8.4 3.6 3.6-3.6 3.6" />
    </>
  ),
  primary: <circle cx="12" cy="12" r="5.4" fill="currentColor" />,
  secondary: (
    <>
      <circle cx="7.1" cy="12" r="4.1" fill="currentColor" />
      <circle cx="16.9" cy="12" r="4.1" fill="currentColor" />
    </>
  ),
  mark: <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.6" />,
  erase: (
    <>
      <rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.6" />
      <path d="m9.4 9.6 5.2 4.8" />
      <path d="m14.6 9.6-5.2 4.8" />
    </>
  ),
  done: <path d="m4.6 12.4 5 5 9.8-11" />,
  cancel: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  lock: (
    <>
      <rect x="5.6" y="10.8" width="12.8" height="9" rx="2" />
      <path d="M8.6 10.8V7.8a3.4 3.4 0 0 1 6.8 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5.6" y="10.8" width="12.8" height="9" rx="2" />
      <path d="M8.6 10.8V7.8a3.4 3.4 0 0 1 6.8-.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4.4 7.4A16.6 16.6 0 0 0 2.8 12s3.4 6.2 9.2 6.2a8.6 8.6 0 0 0 3.6-.8" />
      <path d="M8.6 6.5A8.5 8.5 0 0 1 12 5.8c5.8 0 9.2 6.2 9.2 6.2a16.4 16.4 0 0 1-2.9 3.6" />
      <path d="M9.9 9.9a2.85 2.85 0 1 0 4.2 4.2" />
      <path d="m4 4 16 16" />
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
