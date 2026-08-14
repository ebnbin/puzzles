import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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

const both = [...P.BOARD_IS_PAPER].filter((game) => P.BEVEL[game])
check(
  'no game both turns to paper and has a bevel',
  both.length === 0,
  `${both.join(', ')} is in BOARD_IS_PAPER and BEVEL. A moved board leaves its ` +
    `relief behind — restore the carry pass, or explain why this one does not need it.`,
)

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

const games = JSON.parse(readFileSync(join(ROOT, 'src/games.json'), 'utf8'))
check(
  'games.json and SEMANTIC agree on which games exist',
  Object.keys(P.SEMANTIC).every((g) => games.some((x) => x.name === g)),
  `SEMANTIC names a game that is not in games.json`,
)

console.log(failures ? `\n${failures} failed` : '\nall good')
process.exit(failures ? 1 : 0)
