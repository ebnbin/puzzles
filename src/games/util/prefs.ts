// 偏好面板的文案:上游 get_prefs 报出来的 label 和选项原文对应到词条。翻译表按原文做
// 键——翻译的是文案,不是 id(flash-type 一个 kw 在两个游戏里是两句不同的话);键集由
// facts 的联合类型钉死,缺一条 tsc 就红。裸字母快捷键那条不在这里:它归全局设置,面板
// 里不画。
import type { Word } from './custom'
import type { PrefLabel, PrefOption, ShortcutsLabel } from './upstream'

export const PREF_WORDS: Readonly<Record<Exclude<PrefLabel, ShortcutsLabel>, Word>> = {
  'Show possible bridge locations': 'bridgeHints',
  'Sense of arrow keys': 'arrowSense',
  'Label colours with numbers': 'labelColours',
  'Keep mouse highlight after changing a pencil mark': 'keepHighlight',
  'Draw non-light marks even when lit': 'litMarks',
  'Draw excluded grid lines faintly': 'faintLines',
  'Auto-follow unique paths of edges': 'autoFollow',
  'Victory flash effect': 'flashEffect',
  'Number regions': 'numberRegions',
  'Display style for stipple marks': 'stippleStyle',
  'Highlight loops involving unlocked squares': 'unlockedLoops',
  'Cursor mode': 'cursorMode',
  'Automatically clear edges in completed regions': 'clearComplete',
  'Puzzle appearance': 'appearance',
  'Mouse button order': 'mouseOrder',
  'Victory rotation effect': 'rotationEffect',
  'Show numbers on black squares': 'blackNumbers',
  'Fade grounded components': 'fadeGrounded',
  'Monster representation': 'monsterStyle',
  'Monster count display': 'monsterCount',
  'Snap points to a grid': 'snapPoints',
  'Show edges that cross another edge': 'crossedEdges',
  'Display style for vertices': 'vertexStyle',
}

export const OPTION_WORDS: Readonly<Record<PrefOption, Word>> = {
  'Move the tile': 'moveTile',
  'Move the gap': 'moveGap',
  No: 'no',
  'Based on grid only': 'followGridOnly',
  'Based on grid and game state': 'followState',
  Cyclic: 'cyclic',
  'Each to white': 'eachWhite',
  'All to white': 'allWhite',
  Small: 'small',
  Large: 'large',
  'Half-grid': 'halfGrid',
  'Full-grid': 'fullGrid',
  Traditional: 'traditional',
  'Loopy-style': 'loopyStyle',
  '2D': 'flat',
  '3D': 'solid3d',
  'Left to fill, right to dot': 'leftFill',
  'Left to dot, right to fill': 'leftDot',
  'Left \\, right /': 'leftBackslash',
  'Left /, right \\': 'leftSlash',
  Unidirectional: 'unidirectional',
  'Meshing gears': 'gears',
  Pictures: 'pictures',
  Letters: 'letters',
  Total: 'total',
  Remaining: 'remaining',
  'Placed/Total': 'placedTotal',
  Circles: 'circles',
  Numbers: 'numbers',
}
