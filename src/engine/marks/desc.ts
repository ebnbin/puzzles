/**
 * The two encodings the four puzzles write their descriptions in.
 *
 * Both are upstream's, and both are mirrored here from the *decoder* rather
 * than from the encoder beside it. That is deliberate: for a run longer than
 * the alphabet the two do not agree — solo.c and keen.c both emit `z` meaning
 * twenty-five, and both read it back as twenty-six — and the decoder is what
 * interprets the descriptions that exist. The disagreement has never bitten
 * because a run that long cannot occur at the sizes these puzzles ship: it
 * would need twenty-five consecutive cell pairs undivided, and the largest
 * block in the collection is nine squares.
 */

/**
 * A grid of clues, run-length encoded — solo.c's `spec_to_grid`, which
 * towers.c copies.
 *
 * A letter is that many empty squares, `a` for one; a number is a clue; `_`
 * separates two numbers that would otherwise run together, which is what keeps
 * a board of more than nine digits readable. Stops at a comma and says where
 * it got to, since two of the four carry more description after this one.
 */
export function runLengthGrid(
  text: string,
  area: number,
): { grid: number[]; rest: string } | null {
  const grid: number[] = []
  let at = 0
  while (at < text.length && text[at] !== ',') {
    const ch = text[at]
    if (ch >= 'a' && ch <= 'z') {
      for (let i = ch.charCodeAt(0) - 96; i > 0; i--) grid.push(0)
      at += 1
    } else if (ch === '_') {
      at += 1
    } else if (ch >= '1' && ch <= '9') {
      const digits = /^\d+/.exec(text.slice(at))![0]
      grid.push(Number(digits))
      at += digits.length
    } else {
      return null
    }
  }
  if (grid.length !== area) return null
  return { grid, rest: text.slice(at) }
}

/**
 * Blocks, read off a description of the lines *between* them — solo.c's
 * `spec_to_dsf`, and keen.c's `parse_block_structure`.
 *
 * What is written down is the dividing lines, not the blocks: the internal
 * vertical edges in reading order and then the horizontal ones transposed, as
 * a count of how many places in that walk are *not* a division before each one
 * that is. `_` is none, `a` is one, and one letter near the end of the alphabet
 * is the one that does not consume a division, so a run longer than twenty-six
 * can be spelled as a prefix.
 *
 * Which letter that is, is the one thing the two versions disagree on, and
 * Keen adds a repeat count after a letter — `a3` for three of them — which Solo
 * has no need of because its blocks are all the same size.
 *
 * Merging what is not divided leaves the blocks. Whether they came out a
 * sensible shape is the caller's to check, and is the only thing standing
 * between a misread description and a board marked to the wrong rules.
 */
export function dividerBlocks(
  text: string,
  size: number,
  options: { open: number; repeats: boolean },
): number[] | null {
  const area = size * size
  const parent = Array.from({ length: area }, (_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }

  const edges = 2 * size * (size - 1)
  let pos = 0
  let at = 0
  while (at < text.length) {
    const ch = text[at]
    let count: number
    if (ch === '_') count = 0
    else if (ch >= 'a' && ch <= 'z') count = ch.charCodeAt(0) - 96
    else return null
    at += 1

    let times = 1
    if (options.repeats) {
      const repeat = /^\d+/.exec(text.slice(at))
      if (repeat) {
        times = Number(repeat[0])
        at += repeat[0].length
        if (times < 1) return null
      }
    }

    // The letter that spells a run without ending it, so it can be a prefix.
    const advance = count !== options.open
    for (let t = 0; t < times; t++) {
      for (let c = count; c > 0; c--) {
        if (pos >= edges) return null
        let p0: number
        let p1: number
        if (pos < size * (size - 1)) {
          const y = Math.floor(pos / (size - 1))
          const x = pos % (size - 1)
          p0 = y * size + x
          p1 = y * size + x + 1
        } else {
          const x = Math.floor(pos / (size - 1)) - size
          const y = pos % (size - 1)
          p0 = y * size + x
          p1 = (y + 1) * size + x
        }
        parent[find(p0)] = find(p1)
        pos += 1
      }
      if (advance) pos += 1
    }
  }
  // One past the last edge, for the virtual one the encoder ends with.
  if (pos !== edges + 1) return null

  // Numbered in the order the cells are first met, so a block index is the
  // index of its lowest square — which is the order Keen lists its clues in.
  const numbered = new Map<number, number>()
  const block = new Array<number>(area)
  for (let i = 0; i < area; i++) {
    const root = find(i)
    let n = numbered.get(root)
    if (n === undefined) numbered.set(root, (n = numbered.size))
    block[i] = n
  }
  return block
}

/** The cells of each block, in block order. */
export function blockCells(block: number[]): number[][] {
  const out: number[][] = []
  for (let cell = 0; cell < block.length; cell++) {
    ;(out[block[cell]] ??= []).push(cell)
  }
  return out
}

/** Rows and columns: the groups every one of these four has. */
export function latinGroups(size: number): number[][] {
  const groups: number[][] = []
  for (let i = 0; i < size; i++) {
    groups.push(Array.from({ length: size }, (_, j) => i * size + j))
    groups.push(Array.from({ length: size }, (_, j) => j * size + i))
  }
  return groups
}

/** The leading number of a parameter string — the side of the grid, mostly. */
export function leadingNumber(text: string | undefined): number | null {
  const found = text ? /^(\d+)/.exec(text) : null
  if (!found) return null
  const n = Number(found[1])
  // Nothing in the collection is near this; a bigger one is a misread string.
  return n >= 1 && n <= 36 ? n : null
}
