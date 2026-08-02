/*
 * The invariants palette.ts states about its own tables but cannot enforce.
 *
 * Everything else in that file is arithmetic, and arithmetic checks itself: a
 * wrong constant shows up on screen. These are different — they are claims
 * about which games are in which table, and a table can quietly stop being
 * true when a game moves between them. Each one below is a claim the file's
 * comments make in prose; this is where the prose is held to it.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/*
 * palette.ts keeps its tables private, which is right — nothing outside needs
 * them. So read a copy with the `const`s exported rather than widening the
 * real file for the sake of a test.
 */
const tmp = mkdtempSync(join(tmpdir(), 'palette-check-'))
const copy = join(tmp, 'palette.ts')
writeFileSync(
  copy,
  readFileSync(join(ROOT, 'src/engine/palette.ts'), 'utf8').replace(/^(const|function) /gm, 'export $1 '),
)
const P = await import(copy)
rmSync(tmp, { recursive: true, force: true })

let failures = 0
const check = (name, ok, detail) => {
  if (ok) return console.log(`  ok  ${name}`)
  console.log(`FAIL  ${name}\n      ${detail}`)
  failures++
}

/*
 * A board that moves leaves its own relief behind: a bevel is a fixed step
 * either side of the board, so moving one without the other flattens it.
 * There used to be a pass that carried the pair along, written for Black Box,
 * which was in both tables while its ball was black. It is gone, because the
 * three boards that turn to paper cannot have a bevel — Light Up has no such
 * slots, and Singles and Range ask `game_mkhighlight` for one side only.
 * If that stops being true the pass has to come back, and this says so.
 */
const both = [...P.BOARD_IS_PAPER].filter((game) => P.BEVEL[game])
check(
  'no game both turns to paper and has a bevel',
  both.length === 0,
  `${both.join(', ')} is in BOARD_IS_PAPER and BEVEL. A moved board leaves its ` +
    `relief behind — restore the carry pass, or explain why this one does not need it.`,
)

/*
 * `RIM` exists for a shape that is its own outline *and* cannot stand on its
 * own — which only happens when the fill is held by `SEMANTIC` rather than
 * flipped. Galaxies draws the identical call and needs nothing, because its
 * black dot flips. An entry that does not meet all three is either unnecessary
 * or hiding a different problem.
 */
for (const [game, map] of Object.entries(P.RIM)) {
  for (const [fill, rim] of Object.entries(map).map(([k, v]) => [Number(k), v])) {
    check(
      `RIM ${game}[${fill}] is a slot SEMANTIC holds`,
      P.SEMANTIC[game]?.includes(fill) ?? false,
      `it is flipped, so it comes out light and needs no borrowed rim`,
    )
    check(
      `RIM ${game}[${fill}] borrows a slot that exists`,
      P.SEMANTIC[game]?.includes(rim) ?? false,
      `slot ${rim} is not held by SEMANTIC, so what it lends is not stable`,
    )
  }
}

/*
 * `FIGURE` admits a drawing, not a slot, and it admits it for one reason: the
 * drawing's paper is the background itself, so the table has no second cell to
 * give. Both halves of that are checkable here — the paper must be BACKGROUND,
 * or the entry is resting on some other reason that has not been written down;
 * and there must be ink alongside it, because paper served alone leaves the
 * outlines flipped over the paper at 1.22:1 and the drawing loses its lines.
 */
for (const [game, slots] of Object.entries(P.FIGURE)) {
  check(
    `FIGURE ${game} includes the background`,
    slots.includes(P.BACKGROUND),
    `the entry criterion is that the drawing's paper is the ground; without slot ` +
      `${P.BACKGROUND} this entry is here for some other reason, and that reason is not stated`,
  )
  check(
    `FIGURE ${game} carries ink as well as paper`,
    slots.length >= 2,
    `paper alone is half a negative: the ink flips over it and the drawing loses its lines`,
  )
}

/*
 * The other direction of the same claim: `SEMANTIC` is the list of slots that
 * must not be turned over, so none of them may come out as its own flip.
 */
const games = JSON.parse(readFileSync(join(ROOT, 'src/games.json'), 'utf8'))
check(
  'games.json and SEMANTIC agree on which games exist',
  Object.keys(P.SEMANTIC).every((g) => games.some((x) => x.name === g)),
  `SEMANTIC names a game that is not in games.json`,
)

console.log(failures ? `\n${failures} failed` : '\nall good')
process.exit(failures ? 1 : 0)
