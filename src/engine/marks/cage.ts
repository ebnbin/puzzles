const LIMIT = 200_000

export type CageOp = 'a' | 'm' | 's' | 'd'

// 返回 null 的意思是「这个 cage 放着别动」(枚举超限或无解都是),调用方
// continue,不是整盘拒绝——无解只说明玩家棋盘已矛盾,清空该 cage 的候选同样
// 是错的方向:标记多了只是不整洁,少了就是错。
export function cageDigits(
  cells: number[],
  value: number,
  op: CageOp,
  size: number,
  candidates: Set<number>[],
  digits: number[],
  // Killer 传 true(cage 内数字不得重复是上游明文规则,且 cage 不保证同行同列,
  // 从 groups 推不出来);Keen 传 false(cage 内允许重复,只受拉丁方限制)。
  // 两个布尔不能「统一」,统一哪边都会写错标记。
  distinct: boolean,
): Set<number>[] | null {
  const count = cells.length
  const options = cells.map((cell) =>
    digits[cell] ? [digits[cell]] : [...candidates[cell]].sort((a, b) => a - b),
  )
  if (options.some((list) => list.length === 0)) return null

  const seen = cells.map(() => new Set<number>())

  if (op === 's' || op === 'd') {
    if (count !== 2) return null
    let any = false
    for (const a of options[0]) {
      for (const b of options[1]) {
        if (clash(cells, size, distinct, 0, 1, a, b)) continue
        const fits =
          op === 's' ? Math.abs(a - b) === value : a === b * value || b === a * value
        if (!fits) continue
        seen[0].add(a)
        seen[1].add(b)
        any = true
      }
    }
    return any ? seen : null
  }

  const chosen = new Array<number>(count)
  let visited = 0
  let stopped = false
  let any = false

  const walk = (at: number, acc: number) => {
    if (stopped) return
    if (++visited > LIMIT) {
      stopped = true
      return
    }
    if (at === count) {
      if (acc !== value) return
      for (let i = 0; i < count; i++) seen[i].add(chosen[i])
      any = true
      return
    }
    for (const n of options[at]) {
      let bad = false
      for (let j = 0; j < at && !bad; j++)
        if (chosen[j] === n) bad = clash(cells, size, distinct, at, j, n, n)
      if (bad) continue

      const next = op === 'a' ? acc + n : acc * n
      if (op === 'a') {
        if (next + (count - at - 1) > value) break
      } else if (value % next !== 0) {
        continue
      }
      chosen[at] = n
      walk(at + 1, next)
      if (stopped) return
    }
  }
  walk(0, op === 'a' ? 0 : 1)

  return stopped || !any ? null : seen
}

function clash(
  cells: number[],
  size: number,
  distinct: boolean,
  i: number,
  j: number,
  a: number,
  b: number,
): boolean {
  if (a !== b) return false
  if (distinct) return true
  const one = cells[i]
  const two = cells[j]
  return one % size === two % size || Math.floor(one / size) === Math.floor(two / size)
}
