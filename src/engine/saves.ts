// 这些 key 已经发布:改名 = 用户的存档、设置、隐藏列表全部作废。读取一律容忍
// 垃圾值,所以「加」是安全的,「改」和「删」不是。全表和各 key 的语义见 CLAUDE.md。
const PLAYING = 'puzzles.playing'
const RECENT = 'puzzles.recent'
const SCROLL = 'puzzles.scroll'
const INTRODUCED = 'puzzles.introduced'
const save = (name: string) => `puzzles.save.${name}`

const MAGIC = 'SAVEFILE'

const STATES = /^NSTATES\s*:\d+:(\d+)$/m

// 问 NSTATES>1,不能问 midend_can_undo(它跨局保留 undo,新发牌后也为真)。
// 读不懂的存档一律按「玩过」:代价不对称——多一次白写 vs 丢玩家一局。
export function isPlayed(game: string): boolean {
  const found = STATES.exec(game)
  return found ? Number(found[1]) > 1 : true
}

export function readSave(name: string): string | null {
  try {
    const text = window.localStorage.getItem(save(name))
    return text?.startsWith(MAGIC) ? text : null
  } catch {
    return null
  }
}

export function writeSave(name: string, text: string): void {
  try {
    window.localStorage.setItem(save(name), text)
  } catch {
  }
}

export function clearSave(name: string): void {
  try {
    window.localStorage.removeItem(save(name))
  } catch {
  }
}

export function readPlaying(): boolean {
  try {
    return !!window.localStorage.getItem(PLAYING)
  } catch {
    return false
  }
}

export function setPlaying(playing: boolean): void {
  try {
    if (playing) window.localStorage.setItem(PLAYING, '1')
    else window.localStorage.removeItem(PLAYING)
  } catch {
  }
}

export function readRecent(): string | null {
  try {
    return window.localStorage.getItem(RECENT)
  } catch {
    return null
  }
}

export function writeRecent(name: string): void {
  try {
    window.localStorage.setItem(RECENT, name)
  } catch {
  }
}

export function readScroll(): number | null {
  try {
    const text = window.localStorage.getItem(SCROLL)
    if (text === null) return null
    const y = Number(text)
    return Number.isFinite(y) ? Math.max(0, y) : null
  } catch {
    return null
  }
}

export function writeScroll(y: number): void {
  try {
    window.localStorage.setItem(SCROLL, String(Math.round(y)))
  } catch {
  }
}

// 内存副本不是优化:localStorage 被禁(隐私模式/配额)时读回永远是「没介绍过」,
// 会话内副本是介绍语不反复弹的唯一屏障。
let introduced: Set<string> | null = null

function read(): Set<string> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(INTRODUCED) ?? '[]')
    return new Set(
      Array.isArray(stored) ? stored.filter((n) => typeof n === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

export function owesIntroduction(name: string): boolean {
  introduced ??= read()
  return !introduced.has(name)
}

export function markIntroduced(name: string): void {
  introduced ??= read()
  if (introduced.has(name)) return
  introduced.add(name)
  try {
    window.localStorage.setItem(INTRODUCED, JSON.stringify([...introduced]))
  } catch {
  }
}

export function forgetEverything(): void {
  try {
    // 先收集完 key 再删:边枚举边 removeItem 会让 store.key(i) 实时重新编号,
    // 隔一个跳一个,「全部忘掉」只删一半。
    const store = window.localStorage
    const mine: string[] = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key?.startsWith('puzzles.')) mine.push(key)
    }
    for (const key of mine) store.removeItem(key)
  } catch {
  }
}
