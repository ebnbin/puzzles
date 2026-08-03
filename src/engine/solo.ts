/**
 * What can still go in each square of a Solo board, worked out on this side.
 *
 * Upstream's `M` fills every empty square with every mark there is, for people
 * who play by starting from all of them and crossing out. This is the same
 * gesture with the crossing-out already done: each empty square ends up marked
 * with exactly the digits its row, its column and its block have not already
 * spent — and, on an X board, its diagonals.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ARITHMETIC IS HERE AND NOT IN THE C
 * ---------------------------------------------------------------------------
 *
 * solo.c has a far better solver than this one — naked and hidden subsets,
 * pointing pairs, set elimination, the lot — and none of it can be asked a
 * question. Its only exit is `solve_game`, which runs the solver to the end and
 * returns `S` followed by the whole answer. There is no call that says "what is
 * still possible here", so there is nothing to forward, and the elimination
 * below is written again rather than reached.
 *
 * Which is why it is deliberately the simplest rule there is. Everything harder
 * — a digit that is possible in only one square of its block, a pair that locks
 * two squares — is a deduction, and a deduction is the reader's to make. What
 * this removes is only what the board has already said out loud.
 *
 * Including where the board is wrong. A digit the reader has put in the wrong
 * square is still a digit in that row, and the marks around it are worked out
 * against it — so a mistake propagates into the marks, and correcting it and
 * pressing again clears up after it. That is the same answer the board itself
 * gives: solo.c draws a clashing digit red and goes on counting it.
 *
 * ---------------------------------------------------------------------------
 * HOW A MOVE GETS IN
 * ---------------------------------------------------------------------------
 *
 * Solo's move language is four strings (`execute_move`, solo.c): `R x,y,n` puts
 * a digit in a square, `P x,y,n` *toggles* one pencil mark, `M` fills them all,
 * `S` solves. So this is a run of `P`s — and because they toggle rather than
 * set, what to send cannot be known without knowing what is marked already.
 *
 * Nothing here synthesises keystrokes to produce them. `interpret_move` is the
 * only thing that turns input into a move string, and driving it means steering
 * `game_ui`'s cursor and pencil-mode flags from outside, one press at a time.
 * The save file is the other door: `midend_deserialise` hands each `MOVE` line
 * straight to `execute_move` (midend.c) without `interpret_move` anywhere in
 * the path. So the board is read out of a save, the moves are appended to it,
 * and the whole thing goes back in through `loadGame` — one round trip, one
 * redraw, and no dependence on where the cursor happens to be.
 *
 * The cost is the undo history: one mark is one move is one state, so filling
 * forty squares is forty steps back out. There is no batching to be had — a
 * move string does one thing, and `M` is the only bulk operation the C has.
 * Only what actually changes is sent, which is the least it can be.
 *
 * ---------------------------------------------------------------------------
 * WHEN IT REFUSES
 * ---------------------------------------------------------------------------
 *
 * A misread board is worse than no button: it would rub out marks the reader
 * put there and call digits impossible that are not. So every step below
 * returns null rather than guessing, and the caller shows nothing — the same
 * bargain keys.ts strikes when it cannot read a game id.
 *
 * Killer boards are read but their cages are not: the arithmetic is another
 * constraint entirely, and ignoring it can only leave a candidate in that a
 * cleverer reading would have removed. Erring that way is safe. Erring the
 * other way is the thing being avoided.
 */

/** Solo's own limit: `MAX_SYMBOLS` worth of digits, and no board is near it. */
const MAX_CR = 36

/**
 * The shape of the board: how big, which block each square belongs to, and
 * whether the diagonals count too.
 */
type Shape = {
  cr: number
  /** Block index per square, in reading order — solo.c's `whichblock`. */
  block: number[]
  xtype: boolean
}

/** One line of a save file: eight characters of key, a length, and the value. */
type Field = { key: string; value: string }

/**
 * Split a save file into its lines.
 *
 * Read by the length each line declares rather than by looking for newlines,
 * which is what the format asks for (midend.c's `wr`). Every value is printable
 * ASCII — the C asserts it on the way out — so a byte length is a character
 * length here, and a value can hold neither a newline nor anything JavaScript
 * would count differently.
 */
function fields(text: string): Field[] | null {
  const out: Field[] = []
  let at = 0
  while (at < text.length) {
    if (text[at + 8] !== ':') return null
    const key = text.slice(at, at + 8).trimEnd()
    at += 9
    const colon = text.indexOf(':', at)
    if (colon < 0) return null
    const length = Number(text.slice(at, colon))
    if (!Number.isInteger(length) || length < 0) return null
    at = colon + 1
    const value = text.slice(at, at + length)
    if (value.length !== length) return null
    at += length
    if (text[at] !== '\n') return null
    at += 1
    out.push({ key, value })
  }
  return out.length > 0 ? out : null
}

/** A line, written the way the C writes it. */
const line = (key: string, value: string) =>
  `${key.padEnd(8)}:${value.length}:${value}\n`

/**
 * The parameters, read the way solo.c's `decode_params` reads them.
 *
 * Two turns in it. The leading number is both dimensions unless an `x` supplies
 * the second; and a `j` collapses the blocks into one row of `c*r`, which is
 * how a jigsaw board says its blocks are not rectangles and live in the
 * description instead. `x` after the size is the diagonals, `k` is killer.
 *
 * Where the C eats an unknown character and carries on, this refuses. A
 * parameter string with something in it we have never seen is a board whose
 * rules we cannot claim to know.
 */
function params(text: string): { c: number; r: number; xtype: boolean } | null {
  const first = /^(\d+)/.exec(text)
  if (!first) return null
  let c = Number(first[1])
  let r = c
  let seenR = false
  let at = first[1].length

  if (text[at] === 'x') {
    const second = /^(\d+)/.exec(text.slice(at + 1))
    if (!second) return null
    r = Number(second[1])
    seenR = true
    at += 1 + second[1].length
  }

  let xtype = false
  while (at < text.length) {
    const ch = text[at]
    if (ch === 'j') {
      at += 1
      if (seenR) c *= r
      r = 1
    } else if (ch === 'x') {
      at += 1
      xtype = true
    } else if (ch === 'k') {
      at += 1
    } else if (ch === 'r' || ch === 'm' || ch === 'a') {
      // Symmetry, which says nothing about how the board is played.
      at += 1
      if (ch === 'm' && text[at] === 'd') at += 1
      while (at < text.length && text[at] >= '0' && text[at] <= '9') at += 1
    } else if (ch === 'd') {
      // Difficulty, likewise: it shaped the deal and is spent.
      at += 1
      if (!'tbiaeu'.includes(text[at])) return null
      at += 1
    } else {
      return null
    }
  }

  if (!Number.isInteger(c) || !Number.isInteger(r)) return null
  const cr = c * r
  if (cr < 1 || cr > MAX_CR) return null
  return { c, r, xtype }
}

/**
 * The clues, read off the front of the description — solo.c's `spec_to_grid`.
 *
 * A letter is that many empty squares, `a` for one; a number is a clue; `_`
 * separates two numbers that would otherwise run together, which is why the
 * grid of a board with more than nine digits is still readable.
 */
function grid(text: string, area: number): { grid: number[]; rest: string } | null {
  const out: number[] = []
  let at = 0
  while (at < text.length && text[at] !== ',') {
    const ch = text[at]
    if (ch >= 'a' && ch <= 'z') {
      for (let i = ch.charCodeAt(0) - 96; i > 0; i--) out.push(0)
      at += 1
    } else if (ch === '_') {
      at += 1
    } else if (ch >= '1' && ch <= '9') {
      const digits = /^\d+/.exec(text.slice(at))![0]
      out.push(Number(digits))
      at += digits.length
    } else {
      return null
    }
  }
  if (out.length !== area) return null
  return { grid: out, rest: text.slice(at) }
}

/**
 * A jigsaw board's blocks, read off the rest of the description — solo.c's
 * `spec_to_dsf`, followed by its `dsf_to_blocks`.
 *
 * What is written down is the dividing lines, not the blocks: the internal
 * vertical edges in reading order and then the horizontal ones transposed, as a
 * count of how many places in that walk are *not* a division before each one
 * that is. `_` is none, `a` is one, and `z` is the one that does not end with a
 * division, so a run longer than the alphabet can be spelled.
 *
 * Merging what is not divided leaves the blocks. That they came out the right
 * shape is checked by the caller, which is the only thing standing between a
 * misread description and a board marked to the wrong rules.
 */
function jigsawBlocks(text: string, cr: number): number[] | null {
  const area = cr * cr
  const parent = Array.from({ length: area }, (_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]]
    return i
  }

  const edges = 2 * cr * (cr - 1)
  let pos = 0
  for (const ch of text) {
    let count: number
    if (ch === '_') count = 0
    else if (ch >= 'a' && ch <= 'z') count = ch.charCodeAt(0) - 96
    else return null
    // `z` is the one that does not consume a dividing line, which is what lets
    // it be a prefix rather than a run of its own.
    const advance = count !== 26
    while (count-- > 0) {
      if (pos >= edges) return null
      let p0: number
      let p1: number
      if (pos < cr * (cr - 1)) {
        const y = Math.floor(pos / (cr - 1))
        const x = pos % (cr - 1)
        p0 = y * cr + x
        p1 = y * cr + x + 1
      } else {
        const x = Math.floor(pos / (cr - 1)) - cr
        const y = pos % (cr - 1)
        p0 = y * cr + x
        p1 = (y + 1) * cr + x
      }
      parent[find(p0)] = find(p1)
      pos += 1
    }
    if (advance) pos += 1
  }
  // One past the last edge, for the virtual one the encoder ends with.
  if (pos !== edges + 1) return null

  // Number the classes in the order they are first met, so a block index means
  // the same thing here as the rectangular case below.
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

/** Every block holds exactly `cr` squares, and there are exactly `cr` of them. */
function blocksAreSound(block: number[], cr: number): boolean {
  const counts = new Array<number>(cr).fill(0)
  for (const b of block) {
    if (!Number.isInteger(b) || b < 0 || b >= cr) return false
    counts[b] += 1
  }
  return counts.every((n) => n === cr)
}

/**
 * Replay the moves a save carries, to arrive at the position it describes.
 *
 * The save holds the deal and the moves made since, not the board — so the
 * digits and the marks have to be played forward the way `execute_move` plays
 * them, and only as far as `STATEPOS`, because everything past it is what the
 * reader has undone.
 *
 * `S` is upstream's solve, which fills the grid outright; `RESTART` re-deals
 * from a description and is refused, since re-deriving the clues from it is
 * work this does not need to do — a restarted game gets its marks on the next
 * press instead.
 */
function replay(
  moves: Field[],
  clues: number[],
  cr: number,
): { digits: number[]; marks: Set<number>[] } | null {
  const digits = [...clues]
  const marks = Array.from({ length: clues.length }, () => new Set<number>())

  for (const move of moves) {
    if (move.key === 'RESTART') return null
    const text = move.value
    if (text === 'M') {
      for (let i = 0; i < digits.length; i++)
        if (!digits[i]) for (let n = 1; n <= cr; n++) marks[i].add(n)
      continue
    }
    if (text[0] === 'S') {
      const answer = text.slice(1).split(',').map(Number)
      if (answer.length !== digits.length) return null
      for (let i = 0; i < digits.length; i++) {
        digits[i] = answer[i]
        marks[i].clear()
      }
      continue
    }
    const parsed = /^([PR])(\d+),(\d+),(\d+)$/.exec(text)
    if (!parsed) return null
    const [, kind, sx, sy, sn] = parsed
    const x = Number(sx)
    const y = Number(sy)
    const n = Number(sn)
    if (x >= cr || y >= cr || n > cr) return null
    const cell = y * cr + x
    if (kind === 'P' && n > 0) {
      if (!marks[cell].delete(n)) marks[cell].add(n)
    } else {
      digits[cell] = n
      marks[cell].clear()
    }
  }
  return { digits, marks }
}

/**
 * What each square could still hold, for the whole board at once.
 *
 * The digits already spent are gathered per row, per column, per block and —
 * on an X board — per diagonal, one pass for all of them. A square then asks
 * the groups it belongs to, rather than each of eighty-one sweeping the grid
 * again to find the others in its block.
 *
 * A square that is filled gets an empty set: it has no marks to hold, and
 * `execute_move` would refuse them anyway.
 */
function possibilities(digits: number[], shape: Shape): Set<number>[] {
  const { cr, block, xtype } = shape
  const area = cr * cr
  const rows = Array.from({ length: cr }, () => new Set<number>())
  const columns = Array.from({ length: cr }, () => new Set<number>())
  const blocks = Array.from({ length: cr }, () => new Set<number>())
  const down = new Set<number>()
  const up = new Set<number>()

  for (let cell = 0; cell < area; cell++) {
    const n = digits[cell]
    if (!n) continue
    const x = cell % cr
    const y = (cell - x) / cr
    rows[y].add(n)
    columns[x].add(n)
    blocks[block[cell]].add(n)
    if (x === y) down.add(n)
    if (x + y === cr - 1) up.add(n)
  }

  return Array.from({ length: area }, (_, cell) => {
    const out = new Set<number>()
    if (digits[cell]) return out
    const x = cell % cr
    const y = (cell - x) / cr
    for (let n = 1; n <= cr; n++) {
      if (rows[y].has(n) || columns[x].has(n) || blocks[block[cell]].has(n)) continue
      if (xtype && x === y && down.has(n)) continue
      if (xtype && x + y === cr - 1 && up.has(n)) continue
      out.add(n)
    }
    return out
  })
}

/**
 * A save with every empty square marked with exactly what can still go in it,
 * or null if this board could not be read with enough confidence to touch it.
 *
 * Null also when there is nothing to do — every square already says what it
 * can be — so that a second press is not a no-op that still costs a reload and
 * a state on the undo stack.
 */
export function fillPossible(save: string): string | null {
  const lines = fields(save)
  if (!lines) return null

  const find = (key: string) => lines.find((f) => f.key === key)?.value
  if (find('GAME') !== 'Solo') return null

  const shapeParams = params(find('CPARAMS') ?? find('PARAMS') ?? '')
  if (!shapeParams) return null
  const { c, r, xtype } = shapeParams
  const cr = c * r
  const area = cr * cr

  // The initial state is built from PRIVDESC where there is one, which is what
  // the midend does; Solo has never written one, and this costs a line.
  const described = grid(find('PRIVDESC') ?? find('DESC') ?? '', area)
  if (!described) return null

  let block: number[] | null
  if (r === 1) {
    if (described.rest[0] !== ',') return null
    // Up to the next comma: a killer board carries its cages after the blocks.
    block = jigsawBlocks(described.rest.slice(1).split(',')[0], cr)
  } else {
    block = Array.from({ length: area }, (_, i) => {
      const x = i % cr
      const y = Math.floor(i / cr)
      return Math.floor(y / c) * c + Math.floor(x / r)
    })
  }
  if (!block || !blocksAreSound(block, cr)) return null

  const statepos = Number(find('STATEPOS'))
  if (!Number.isInteger(statepos) || statepos < 1) return null
  /*
   * State one is the deal, so what has been played is the states before the
   * position — and the ones after it are what the reader has undone. Those are
   * dropped rather than kept, because making a move is what the midend does
   * with them too: `midend_purge_states` throws the redo list away the moment
   * anything new is played on top of it.
   */
  const played = lines.filter(
    (f) => f.key === 'MOVE' || f.key === 'SOLVE' || f.key === 'RESTART',
  )
  const done = played.slice(0, statepos - 1)
  if (done.length !== statepos - 1) return null

  const board = replay(done, described.grid, cr)
  if (!board) return null

  const should = possibilities(board.digits, { cr, block, xtype })
  const wanted: string[] = []
  for (let cell = 0; cell < area; cell++) {
    if (board.digits[cell]) continue
    const has = board.marks[cell]
    const x = cell % cr
    const y = (cell - x) / cr
    // A toggle apiece, and only where the two disagree — which is both the
    // least that can be sent and the only way to say it.
    for (let n = 1; n <= cr; n++)
      if (should[cell].has(n) !== has.has(n)) wanted.push(`P${x},${y},${n}`)
  }
  if (wanted.length === 0) return null

  // Everything the midend writes before the states, kept exactly as it was —
  // the description, the seed, the aux info the solver needs, whatever a later
  // version adds. Only the two counts and the list itself are ours to rewrite.
  const head = lines.findIndex((f) => f.key === 'NSTATES')
  if (head < 0) return null
  const states = statepos + wanted.length
  return (
    lines.slice(0, head).map((f) => line(f.key, f.value)).join('') +
    line('NSTATES', String(states)) +
    line('STATEPOS', String(states)) +
    done.map((f) => line(f.key, f.value)).join('') +
    wanted.map((m) => line('MOVE', m)).join('')
  )
}
