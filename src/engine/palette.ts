/**
 * The same board, played on a dark surface.
 *
 * The back end names its colours once at startup and hands them over as hex
 * strings; every draw then refers to them by index. That makes the palette a
 * lookup table we own, and re-theming a matter of rewriting the table — the
 * wasm never learns anything happened.
 *
 * ---------------------------------------------------------------------------
 * THREE RULES, IN THE ORDER `forDarkBoard` APPLIES THEM
 * ---------------------------------------------------------------------------
 *
 * 1. `compress` — a grey whose being black or white is something the rules
 *    say. Kept the way up it started, only pulled into the dark board's
 *    range. Black stays black. See `SEMANTIC`; 26 of the 426.
 *
 * 2. `veil` — anything with a hue. Kept, but with black laid over it in
 *    proportion to how much light it throws, because upstream chose these
 *    against a white board and at full strength they are the brightest thing
 *    on a dark one. See `VEIL`; 200 of the 426.
 *
 * 3. `flip` — every other grey: the board, the shading, the ink, the lines.
 *    Turned over. See `FLOOR` and `CEILING`; the remaining 200.
 *
 * Behind them is one distinction. A puzzle's *structure* lives in its
 * neutrals and wants to be the other way up on a dark surface; its *meaning*
 * lives in its hues — Mines' digits, Map's regions, Tents' grass — and
 * inverting those would be a lie. Rule 1 exists because that line is not
 * quite where saturation puts it: Pearl's two circles carry meaning and have
 * no hue at all, and flipping them states the puzzle backwards.
 *
 * Then one correction, over the top of all three: a bevel's lit side must
 * come out the lighter of its pair. The three rules are about what a colour
 * *is*, and get that right; relief is about where the light *comes from*, and
 * a rule that only preserves differences cannot see it. See `BEVEL`.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS COMPUTED AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 *
 * No colour in this file is chosen. All 426 dark values are the output of the
 * three functions above, and nothing hand-picks a hex. The bevel correction
 * adds none either: it exchanges two values a rule already produced.
 *
 * Which rule a slot takes is computed too — from its saturation — for 400 of
 * them. The other 26 come from `SEMANTIC`, a table, because the fact that
 * *this* black is a rule and *that* black is a line is not in the colour: it
 * is in the game. `BEVEL` is a table for the same reason, and both were
 * assembled from evidence rather than taste — see their comments. They are the
 * knowledge here that no amount of arithmetic could have recovered.
 *
 * Five constants are tuned: `ACHROMATIC`, `FLOOR`, `CEILING`, `VEIL`,
 * `SEMANTIC_BOARD`. Each carries the measurement that fixed it.
 *
 * ---------------------------------------------------------------------------
 * WHAT HOLDS AFTERWARDS
 * ---------------------------------------------------------------------------
 *
 * The flip is monotonic in lightness, so every "is lighter than" in the
 * original survives as "is darker than" here — which keeps a game's shading
 * readable without knowing anything about what it draws. That is the right
 * trade everywhere except relief, which is what `BEVEL` is for: eleven pairs
 * across nine games are held the way up they were drawn, and ten of the
 * eleven needed it. Two slots the game drew differently must still be drawn
 * differently; the flipped greys land among the dimmed hues, so the collision
 * pass at the end is cheap insurance rather than an assumption. Measured over
 * all forty palettes: 426 colours, no collisions, every ordering preserved and
 * every bevel still lit from the top left.
 *
 * ---------------------------------------------------------------------------
 * THE TWO PIECES OF THIS STORY THAT ARE NOT IN THIS FILE
 * ---------------------------------------------------------------------------
 *
 * - `CanvasRenderer.defaultColour` in renderer.ts, which deliberately hands
 *   the back end *nothing* in either theme. That is why every light board is
 *   still exactly upstream's, and why the dark one has to come from here.
 * - `--board` in tokens.css, the grey the launcher's thumbnails sit on. It is
 *   the light board's value and stays constant across themes, because the
 *   thumbnails are rendered once, in light.
 */

/** Below this saturation a colour is carrying structure, not meaning. */
const ACHROMATIC = 0.15

/**
 * The range a grey is mapped into, held off pure black and pure white.
 * Upstream's own backgrounds sit near the top of the scale, and mapping them
 * to the very bottom would leave a game's shadows nowhere to go.
 *
 * The ceiling is not 1, and not near it. Black ink flipped to #f0f0f0 threw
 * more light than anything else on a dark board — twice the worst hue even
 * after that hue had been veiled — because it is the ink, the lines and the
 * text that were black to begin with, and all of them landed at the top of
 * the scale together. At 0.82 the same ink comes out #d1d1d1: a quarter less
 * light, still 9.8:1 against the board, and still unmistakably the light
 * thing drawn on it.
 */
const FLOOR = 0.06
const CEILING = 0.82

/**
 * Slots whose being black, or being white, is something the rules say.
 *
 * The flip is a photographic negative, and a negative is exactly wrong for a
 * puzzle played in black and white: Pearl's white circles would come out
 * black, and the chapter that tells you what a white circle means would be
 * describing a board you cannot see. So these are not flipped. They keep
 * their order — black stays the dark one — and are compressed into the same
 * range instead, which leaves black at #0f0f0f and white at #d1d1d1.
 *
 * The list is not a guess. Every entry is a game whose manual chapter states
 * the rule in terms of the colour ("black squares", "black and white
 * circles", "black or white respectively"), cross-referenced against the
 * `COL_*` enum in its C to find which slots those words are about.
 *
 * Deliberately not here: Mines' 7 and 8, which are black and grey only by
 * Minesweeper convention and are drawn on a cell that has itself turned over
 * — keeping them dark would put dark ink on a dark tile. And Guess's pegs
 * beyond the two markers, where light and dark are decoration and the manual
 * never appeals to them.
 *
 * Flip was in that sentence for a while, and it did not belong there: its
 * chapter opens "You have a grid of squares, some light and some dark. Your aim
 * is to light all the squares up at the same time", and its two slots are named
 * COL_RIGHT and COL_WRONG in the C. The test above was applied by searching the
 * chapters for "black" and "white", and Flip states the same fact in the other
 * pair of words — so the search missed the one game that names its goal by
 * lightness rather than by colour. Turned over, the board asked the reader to
 * make every square the darkest thing on the screen while the words above it
 * said light up. All forty chapters have since been read for light/dark wording
 * too; Flip is the only one it caught.
 *
 * Nor Galaxies, though it was for a while, and it is worth saying why: its
 * `COL_*` enum is full of the right words — WHITEBG, BLACKBG, WHITEDOT,
 * BLACKDOT — and every one of them fails the test above. Its chapter does not
 * contain the word "black", or "white"; the rules are about dots, regions and
 * 180-degree symmetry, and say nothing about colour. And `F_DOT_BLACK`, the
 * flag those slots exist to draw, is only ever set inside
 * `#ifdef STANDALONE_PICTURE_GENERATOR`: no dot in a game anybody plays is
 * black. The names were enough to get it listed, and the names were the only
 * evidence there was.
 *
 * Keeping it cost more than the mistake looked worth. WHITEBG marks a square
 * as claimed, which upstream draws as a whisper — #ffffff on a #d5d5d5 board.
 * Compressed to the top of the range on a board `needsRoom` had lifted, the
 * whisper became a shout: an 0.56 step where upstream has 0.165, so a solved
 * board was one bright slab. COL_EDGE — the region boundaries, which are the
 * answer — flipped to the top of the same range, collided with it, was nudged
 * aside, and came to rest a twelfth of a step from the fill it exists to
 * divide. The marks you make were the one thing you could not see. Flipped
 * instead, the claimed square goes dark by the same 0.125 everything else
 * moves by and the edges land at #d1d1d1 against it.
 */
const SEMANTIC: Record<string, readonly number[]> = {
  /* COL_EMPTY, COL_FULL, COL_UNKNOWN — "black or white", "grey" for unknown */
  pattern: [1, 2, 4],
  /*
   * COL_WRONG, COL_RIGHT — "some light and some dark", and the aim is to light
   * them all up — plus COL_GRID and COL_DIAG, which are one colour upstream and
   * the same kind of member as Pattern's grey above: the little diagram in every
   * square is drawn in it on both tones, so its job is to sit between them.
   * Flipped while the two tones are kept, it lands beside the dark one at 1.4:1
   * and the diagrams disappear from every unlit square; kept, it stays the mid
   * grey upstream chose, reading at about 2.4:1 either side.
   */
  flip: [1, 2, 3, 4],
  /* COL_BLACK, COL_WHITE — "black and white circles", different rules each */
  pearl: [3, 4],
  /* COL_0 and COL_1 with their bevels — "black and white squares" */
  unruly: [3, 4, 5, 6, 7, 8],
  /* COL_MARKED, COL_BLANK — "black or white respectively" */
  mosaic: [3, 4],
  /* COL_BLACK, COL_WHITE, COL_BLACKNUM — "white squares must all..." */
  singles: [3, 4, 5],
  /* One aliased slot: grid, black squares, text and your entries together */
  range: [1],
  /* COL_BLACK, COL_LIGHT — the C's own comments say black and white */
  lightup: [2, 3],
  /* COL_CORRECTPLACE, COL_CORRECTCOLOUR — Mastermind's black and white pegs */
  guess: [16, 17],
  /* COL_BALL — the manual calls them black circles */
  blackbox: [8],
}

/**
 * A circle whose rim has to be drawn in something other than its own fill,
 * and which slot to draw it in: `game: { fill: rim }`, both slot numbers.
 *
 * Only Pearl, and only on the dark board. Its clues are one call —
 * `draw_circle(dr, cx, cy, TILE_SIZE/4, c, COL_BLACK)` — where the fill is
 * COL_WHITE or COL_BLACK by the clue and the rim is always COL_BLACK. On
 * upstream's near-white board that one rim does everything asked of it: it is
 * what makes a white circle a circle at all, since white on #e6e6e6 is 1.25:1,
 * and on a black circle it is invisible and unmissed, because a black disc on a
 * near-white board needs no help at 16.8:1.
 *
 * Turn the board over and the same rim serves the same circle, which is now the
 * one that did not need it. The black clue falls to 1.91:1 and has nothing to
 * outline it, being its own rim. That is not a matter of tuning: #424242 is
 * 0.0545 in luminance, so *nothing* darker than it can reach even 2.1:1, and a
 * board pale enough to give the two clues equal contrast comes out at #6b6b6b,
 * which is no longer a dark board. Upstream met the same wall from the other
 * side and answered it with a rim on the clue that needed one. This is that
 * answer applied to the clue that needs one here.
 *
 * So the two clues ring each other: white filled and ringed in black going one
 * way, black filled and ringed in white going the other. Nothing is invented —
 * the rim is a colour the game already named, and both of these are slots whose
 * meaning `SEMANTIC` is already holding still. Pearl's chapter states its rules
 * in those words ("black and white circles", "A black circle in a square
 * indicates that that square is a corner"), which is why it is in that table
 * and why the two tones must stay the way up they are.
 *
 * Light boards never consult this: upstream's own rendering is what a light
 * board is, exactly, and it is right there already.
 */
export const RIM: Record<string, Readonly<Record<number, number>>> = {
  /* COL_BLACK ringed in COL_WHITE */
  pearl: { 3: 4 },
}

/**
 * Slots a game draws a picture with, rather than a board with.
 *
 * Undead's three monsters are little cartoons: a black outline, a coloured
 * skin, and whites — eyes, fangs, an open mouth — painted in the board's own
 * colour because on upstream's near-white board that is what white is. Turn the
 * board over and every one of those turns with it: the outlines go pale, the
 * whites go dark, and the vampire's black hair goes light grey. It is a
 * photographic negative of a drawing, which is not the same kind of thing as a
 * board seen the other way up. A negative of a grid is a grid; a negative of a
 * face is an odd face.
 *
 * The palette cannot answer it, because both of the slots involved do double
 * duty: COL_TEXT is the monsters' ink *and* the clue numbers, which have to go
 * pale to stay readable, and COL_BACKGROUND is their paper *and* the ground.
 * One colour each, two jobs each, pulling opposite ways.
 *
 * What separates the two jobs is not the slot but the call. Outside
 * `draw_monster`, Undead never hands COL_TEXT to anything but `draw_text`:
 * every circle, polygon and line that mentions it is part of a monster. So the
 * rule is drawn where the difference is — a shape, not a string — and the
 * renderer applies it. See `Renderer.ink`.
 *
 * All three kinds of shape, which took saying twice: the zombie's crossed eyes
 * and its mouth are lines, and while `line` was still reading the board's table
 * they stayed white on a face that had gone back to being drawn in black.
 *
 * Not `rect`, though, and that is the edge this rule balances on. COL_BACKGROUND
 * is in the list because it is the monsters' paper, and it is only safe there
 * because the ground is painted with `draw_rect` while the paper is circles and
 * polygons. Serve a rect its light value and the whole board turns over.
 *
 * The skins are here too, though nothing else uses them, because a figure
 * dimmed by the veil under an undimmed outline is half a negative rather than
 * none.
 */
export const FIGURE: Record<string, readonly number[]> = {
  /* COL_BACKGROUND, COL_TEXT, COL_GHOST, COL_ZOMBIE, COL_VAMPIRE */
  undead: [0, 2, 6, 7, 8],
}

/**
 * Where the board sits for those games.
 *
 * A two-tone puzzle needs a surface between its two tones. Upstream does not
 * need one — its board is near-white and sits beside the white half — but on
 * a dark board there is no room below the bottom of the scale, so leaving the
 * background where the flip puts it (0.13) would leave the black half of the
 * puzzle nowhere to be. A black pearl on that board comes to 1.18:1 — put
 * beside the same position on a raised one, it is a disc you can find if you
 * look for it rather than a black circle you read. The white pearls beside it
 * are at 12:1, so the two halves of the puzzle stop being each other's equal
 * and opposite, which is the whole of what the rules are about. #424242 has
 * #0f0f0f visibly below it and #d1d1d1 well above, and still reads as a dark
 * board.
 *
 * Applied only where it is needed, and whether it is needed is computed: see
 * `needsRoom`.
 *
 * Tried at the midpoint of the range too, which is the safe answer on paper
 * and the wrong one on screen: the board stops looking dark, and Guess loses
 * its empty peg holes into it. Lower is better as long as the black half
 * survives, and at this value it does.
 *
 * It is the price of the exception, and it is paid honestly: these boards are a
 * lighter grey than the other thirty.
 */
const SEMANTIC_BOARD = 0.26

/**
 * Where the board sits for the games whose white half *is* the board.
 *
 * `SEMANTIC_BOARD` assumes the game paints both halves of its pair and the
 * board is a third surface between them. Two games do not: Singles paints a
 * white square by painting nothing — `bg = COL_BACKGROUND`, and its COL_WHITE
 * is set in `game_colours` and then never used by any draw call — and Range has
 * no white slot at all, its white squares being the board with nothing on it.
 * Both chapters state the rules in those words all the same: "colour some of the
 * squares black", "the remaining white squares".
 *
 * So for those two the board is not a surface between the tones; it is one of
 * them, and standing it at 0.26 stood the white half almost on top of the black.
 * Everything drawn came to 1.91:1 — the clue numbers included, and in Range the
 * numbers, the grid, your own entries and the black squares are one aliased
 * slot, so that was the whole board. Measured over a dealt position, every pixel
 * of both boards was within 2:1 of the surface it was drawn on.
 *
 * This is where black ink clears 4.5:1 against it, which is what a number has to
 * clear to be read: #0f0f0f on #7d7d7d is 4.66:1, where 0.48 would be 4.47 and
 * miss. It is no longer a dark board, and saying otherwise would be a fiction —
 * it is paper, dimmed as far as paper can be dimmed while the ink on it stays
 * ink.
 */
const PAPER_BOARD = 0.49

/**
 * The games that board belongs to — the ones where nothing is painted white
 * because the paper is the white. Declared rather than computed: whether a slot
 * is ever drawn is a fact about the C, not about the colour in it, and Singles'
 * unused COL_WHITE is exactly the case that would fool a test on colours alone.
 */
const BOARD_IS_PAPER = new Set(['singles', 'range'])

/**
 * Slots a game measures out from its own background rather than choosing.
 *
 * `ret[COL_GRID] = ret[COL_BACKGROUND] * 0.9F` is not a grey the game picked. It
 * is a statement — this line is a tenth of a step off the board it is drawn on —
 * and Loopy says it in words where it does the same thing: "we want
 * COL_LINEUNKNOWN to be a yellow which is a bit darker than the background".
 * A bit darker is the whole of what that colour means.
 *
 * So these keep their distance from the board rather than their own value: the
 * contrast upstream gave them, the other way round, because a dark board is the
 * negative of a light one. Every other rule in this file decides what a colour
 * *is*; this one decides what it is *next to*, which for a shade of the board is
 * all it was ever about.
 *
 * Two ways it had gone wrong, and they are the same way wrong:
 *
 * - Blackbox's border of laser squares is drawn straight on the board with a
 *   COL_GRID line between each pair, and where `needsRoom` lifts the board that
 *   line was left at the height the board used to be: 1.03:1 against the very
 *   surface it divides, so you could not see where one laser square ended and
 *   the next began.
 * - Palisade's and Loopy's yellow is every border you have not decided about,
 *   and it has a hue, so it took the veil — kept its own luminance while the
 *   board went out from under it. A whisper at 1.34:1 on upstream's board became
 *   a shout at 6.05:1 on ours, and the wall you had drawn, black and the loudest
 *   thing on a light board, came out white at 1.72:1 from the yellow it has to be
 *   told apart from. Which of those two a line is *is* the state of the game.
 *
 * Not a guess: every entry is a line in that game's `game_colours` that
 * multiplies or divides `ret[COL_BACKGROUND]`.
 */
const DERIVED: Record<string, readonly number[]> = {
  /* COL_COVER, COL_LOCK, COL_GRID — background times 0.5, 0.7 and 0.9 */
  blackbox: [1, 2, 7],
  /* COL_GRID, COL_CURSOR — background over 1.5 and over 2 */
  lightup: [1, 6],
  /* COL_LINEUNKNOWN — background times 0.9, with the blue taken out */
  loopy: [2],
  /* COL_LINE_MAYBE the same, and COL_LINE_NO the same without the tint */
  palisade: [3, 4],
}

/**
 * The pairs of slots a game draws relief with: the lit side, then the shaded.
 *
 * Relief is the one thing in a palette that is not a relative fact. Every
 * other ordering here can be turned over and still be read, because what it
 * carries is a difference: two greys the game drew apart stay apart, and
 * which of them is the lighter is only a convention that the dark board is
 * free to reverse. A bevel is not that. It says *this face is turned towards
 * the light*, and the light does not move when the theme does — it comes from
 * the top left, in every toolkit anyone has ever drawn a button in. Turn the
 * pair over and the tile does not become a dark tile. It becomes a hole.
 *
 * For six of these games that is merely wrong to look at: Fifteen, Sixteen,
 * Twiddle, Samegame, Flood and Blackbox bevel everything alike, so inverting
 * it inverts figure and ground together — Fifteen's fifteen tiles read as
 * fifteen pits, and the one gap between them becomes the only thing standing
 * up, which is precisely the opposite of what it is.
 *
 * For three it states something false, because there the relief *is* the
 * state:
 *
 *   - Mines. The C's own comment at the bevel is "Draw highlights to indicate
 *     the square is covered", and a square already dug gets the shade along
 *     its top and left instead — sunken. Invert the pair and the two states
 *     swap appearances: covered squares read as dug, dug ones as covered.
 *   - Pegs, whose board is a raised surface with holes cut into it. "First
 *     pass: draw the full relief square," says the C. Inverted, the holes
 *     become bumps.
 *   - Inertia, where only a wall is bevelled. Inverted, the walls become the
 *     pits and the floor becomes solid.
 *
 * Which slots those are is not in the colours — it is in each game's `COL_*`
 * enum, so this is a table, read out of the C the same way `SEMANTIC` was.
 * Only pairs actually drawn as opposed faces are here: Signpost derives a
 * highlight and a lowlight and never draws with either, and the lone
 * `COL_HIGHLIGHT` that Solo, Keen, Towers, Undead, Unequal and Filling use to
 * tint a selected cell is no bevel at all — in four of those it is *darker*
 * than the board it sits on.
 *
 * Two of the eleven pairs listed need nothing done to them, and they are here
 * to be checked rather than changed: Twiddle's cursor pair is a red, so it is
 * veiled rather than flipped and keeps its order, and Unruly's two pairs are
 * already spared by `SEMANTIC`. A rule that names the pairs and states what
 * must be true of them covers those for free; a rule that just swapped them
 * would have broken both.
 */
const BEVEL: Record<string, readonly (readonly [number, number])[]> = {
  /* COL_HIGHLIGHT, COL_LOWLIGHT — the tile, and the cursor's own outline */
  fifteen: [[2, 3]],
  sixteen: [[2, 3]],
  /* ...the tile, the gentler pair the rotating block is shaded with, and the
     cursor's, which is a red and comes out right on its own */
  twiddle: [
    [2, 4],
    [3, 5],
    [6, 7],
  ],
  mines: [[16, 17]],
  samegame: [[12, 13]],
  pegs: [[1, 2]],
  blackbox: [[5, 6]],
  inertia: [[2, 3]],
  flood: [[12, 13]],
  /* COL_0 and COL_1 each with their own bevel; kept in order by SEMANTIC */
  unruly: [
    [4, 5],
    [7, 8],
  ],
}

/** Every game names its background first. */
export const BACKGROUND = 0

/**
 * How far to nudge a colour that would otherwise duplicate another.
 *
 * Downwards first, and never outside [FLOOR, CEILING]. A nudge upwards from
 * the top of the range is how Pattern's text ended up at #e8e8e8 — brighter
 * than the ceiling exists to allow — after the white cells had already
 * claimed #d1d1d1.
 */
const NUDGES = [-0.09, 0.09, -0.17, 0.17, -0.25, 0.25, -0.33, 0.33]

/**
 * How opaque the veil over a hue gets at its brightest.
 *
 * Not a flat percentage. A single opacity for every colour has to be chosen
 * for the worst offender, and by the time it tames Guess's yellow it has also
 * taken Mines' navy — already the darkest thing on the board — down with it.
 * Measured over all 200 hues: a flat 35% pushes 33 of them under 1.5:1
 * against their own background, where scaling by brightness reaches the same
 * peak with 10.
 *
 * So the opacity is the colour's own luminance times this. Yellow ends up
 * under a 32% veil, cyan 28%, pure red 7%, pure blue 3%: the ones that glare
 * are pressed down, and the ones that were never the problem are left where
 * upstream put them.
 *
 * The value is where the two measurements cross. Raising it stops buying much
 * — the brightest hue in the collection falls from 0.93 to 0.39 by here and
 * only to 0.30 by 0.45 — while the cost keeps accruing, because a veil scaled
 * by brightness pulls a bright colour further than a dark one and so closes
 * the gap between them. Past this point that gap starts to matter: at 0.45,
 * five games have two hues within a just-noticeable distance of each other,
 * against three both here and before any of this.
 */
const VEIL = 0.35

type Colour = { h: number; s: number; l: number; r: number; g: number; b: number }

/** The back end always sends `#rrggbb`; anything else is left alone. */
function parse(css: string): Colour | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css)
  if (!m) return null
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l, r, g, b }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    (max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4) / 6
  return { h, s, l, r, g, b }
}

/**
 * How much light a colour actually throws, which is not its lightness: at the
 * same HSL lightness, yellow is thirteen times the luminance of blue, and it
 * is yellow that hurts on a dark board. sRGB relative luminance, as WCAG
 * defines it.
 */
function luminance({ r, g, b }: Colour): number {
  const linear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG's contrast between two luminances, whichever way round they come. */
function ratio(a: number, b: number): number {
  const [x, y] = a > b ? [a, b] : [b, a]
  return (x + 0.05) / (y + 0.05)
}

/**
 * Black at `VEIL x luminance`, composited over the colour. Since the veil is
 * pure black, that composite is one multiplication per channel — which scales
 * lightness and leaves hue and saturation exactly where they were. The colour
 * still means what it meant; there is just less of it.
 */
function veil(colour: Colour): string {
  const keep = 1 - VEIL * luminance(colour)
  const channel = (v: number) =>
    Math.round(v * keep * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(colour.r)}${channel(colour.g)}${channel(colour.b)}`
}

function format({ h, s, l }: { h: number; s: number; l: number }): string {
  const bounded = Math.min(1, Math.max(0, l))
  const channel = (t: number) => {
    const q = bounded < 0.5 ? bounded * (1 + s) : bounded + s - bounded * s
    const p = 2 * bounded - q
    const x = (t + 1) % 1
    const v =
      x < 1 / 6
        ? p + (q - p) * 6 * x
        : x < 1 / 2
          ? q
          : x < 2 / 3
            ? p + (q - p) * (2 / 3 - x) * 6
            : p
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(h + 1 / 3)}${channel(h)}${channel(h - 1 / 3)}`
}

/** Where the flip would put a lightness — the ordinary case. */
const flip = (l: number) => FLOOR + (1 - l) * (CEILING - FLOOR)

/** Where a kept colour goes: same range, same direction as it started. */
const compress = (l: number) => FLOOR + l * (CEILING - FLOOR)

export function forDarkBoard(light: readonly string[], game = ''): string[] {
  const semantic = SEMANTIC[game]

  /*
   * Whether this game's board has to move, worked out rather than asserted:
   * it does if anything the rules call black would end up below the board the
   * flip would otherwise give it, because then there is nothing to see it
   * against. That is the answer to "why can these boards not just stay as dark
   * as the rest?" — a game whose darkest kept colour still cleared the board
   * would keep it, and eight of the nine cannot.
   *
   * Pearl is the ninth, and it was the reason the exception was written: a
   * black pearl on an unlifted board came to 1.18:1, which is a disc you can
   * find rather than a circle you read. It has a rim now, and a rim is
   * something to see it against — the very thing the test above is asking
   * after. So a slot `RIM` covers does not ask for room, and Pearl's board
   * comes back down to the #2f2f2f the other thirty share.
   */
  const board = parse(light[BACKGROUND])
  const rimmed = RIM[game] ?? {}
  const needsRoom =
    !!semantic &&
    !!board &&
    semantic.some((i) => {
      if (i in rimmed) return false
      const kept = parse(light[i])
      return !!kept && compress(kept.l) < flip(board.l)
    })

  /* Where a board that has to move goes, which is not the same place for a
     board that is a surface between the two tones and one that is one of them. */
  const raised = BOARD_IS_PAPER.has(game) ? PAPER_BOARD : SEMANTIC_BOARD

  const flipped = light.map((css, index) => {
    const colour = parse(css)
    if (!colour) return css
    if (semantic) {
      if (index === BACKGROUND && needsRoom)
        return format({ ...colour, l: raised })
      // Compressed, not inverted: same range as the flip, same direction as
      // the original.
      if (semantic.includes(index))
        return format({ ...colour, l: compress(colour.l) })
    }
    if (colour.s >= ACHROMATIC) return veil(colour)
    return format({ ...colour, l: flip(colour.l) })
  })

  /*
   * How far `needsRoom` moved the board out from under its own relief.
   *
   * A bevel is not free-standing: `game_mkhighlight` builds it by walking a
   * fixed distance either side of the background, so it means nothing except
   * as a pair of steps up and down from that surface. The flip carries both
   * ends of that arrangement across together — but where the board is then
   * lifted to make room for a black the rules need, the bevel is left behind
   * at the height the board used to be, and the step up from the board to its
   * own lit edge is most of what is lost. Blackbox's came to 0.047 where the
   * eight games with an unmoved board all have about 0.12: a frame you could
   * find rather than one you could see.
   *
   * So the pair goes wherever the board went. Nothing is chosen here either —
   * the distance is the one the board itself was moved by.
   */
  const lift = needsRoom && board ? raised - flip(board.l) : 0

  /** Move a slot the distance the board moved, staying inside the range. */
  const carry = (index: number) => {
    if (!lift || semantic?.includes(index)) return
    const colour = parse(flipped[index])
    if (colour)
      flipped[index] = format({
        ...colour,
        l: Math.min(CEILING, Math.max(FLOOR, colour.l + lift)),
      })
  }

  /*
   * The shades measured out from the background stand off it by what they
   * always stood off it — see `DERIVED`. Upstream drew each of these darker
   * than its board; a dark board is the negative of a light one, so each comes
   * out lighter than ours by the same contrast.
   *
   * Bisected rather than solved: with the hue and the saturation held, contrast
   * against a fixed board rises monotonically with lightness above it, so twenty
   * halvings put it within a thousandth. The alternative is the inverse of the
   * sRGB transfer function through the luminance of three channels, which is a
   * page of algebra for a number a loop finds exactly.
   */
  const darkBoard = parse(flipped[BACKGROUND])
  for (const index of DERIVED[game] ?? []) {
    const was = parse(light[index])
    const now = parse(flipped[index])
    if (!was || !now || !board || !darkBoard) continue
    const want = ratio(luminance(board), luminance(was))
    const ground = luminance(darkBoard)
    let lo = darkBoard.l
    let hi = CEILING
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      const at = parse(format({ ...now, l: mid }))
      if (at && ratio(ground, luminance(at)) < want) lo = mid
      else hi = mid
    }
    flipped[index] = format({ ...now, l: (lo + hi) / 2 })
  }

  /*
   * Keep the light where it was: of each bevel pair, the lit side takes the
   * lighter of the two values.
   *
   * Stated as the thing that must be true rather than as the fix, which is
   * what makes it safe to apply to every pair in the table. The flip reverses
   * a grey pair and this exchanges it back; a veiled pair or a compressed one
   * came through in order already, and the same line leaves it alone. The
   * exchange introduces no colour — the pair keeps both of the values it had,
   * and only which slot holds which changes.
   *
   * It does move which slot a value belongs to, though, and that is not free:
   * see the loop below it.
   */
  for (const [lit, shade] of BEVEL[game] ?? []) {
    // Only a pair the flip turned over is drawn on the board and follows it.
    // Unruly's are kept by `SEMANTIC` and stand on their own tone instead —
    // a white square's highlight belongs to the white square, wherever the
    // board beneath the two of them has gone.
    if (!semantic?.includes(lit) && !semantic?.includes(shade))
      for (const index of [lit, shade]) carry(index)

    const a = parse(flipped[lit])
    const b = parse(flipped[shade])
    if (!a || !b || a.l >= b.l) continue
    ;[flipped[lit], flipped[shade]] = [flipped[shade], flipped[lit]]
  }

  /*
   * Two slots the game drew in one colour must still be one colour.
   *
   * That is the other half of the invariant the collision pass keeps, and the
   * exchange above is the only thing in this file that can break it: every
   * rule maps a colour to a colour, so equal inputs give equal outputs, but
   * moving a value between two slots does not care what a third slot holds.
   *
   * Samegame is where it showed. `game_mkhighlight` saturates its highlight to
   * white, and Samegame independently paints a selected tile white too, so the
   * two slots arrive here identical; the exchange then separated them, the
   * collision pass had to push the lowlight off its step to keep it clear of
   * the tile it no longer matched, and the bevel lost most of its shaded side
   * — down to a thirty-fifth of the board's lightness against the hundred and
   * twenty-fifth every other game gets. Carrying the new value across to the
   * slots that shared the old one costs nothing and pays twice: the pair keeps
   * its full step, and the outline Samegame draws round a selected tile — the
   * lowlight, chosen precisely because the tile is the highlight's colour —
   * gets the contrast upstream was reaching for rather than the remains of it.
   */
  for (const index of BEVEL[game]?.flat() ?? [])
    light.forEach((css, other) => {
      if (other !== index && css === light[index]) flipped[other] = flipped[index]
    })

  // Two indices the game drew differently must still be drawn differently.
  // Semantic slots claim their value first: if a bevel and a black pearl land
  // on the same grey, it is the bevel that should move.
  const taken = new Map<string, number>()
  for (const index of semantic ?? []) taken.set(flipped[index], index)

  /*
   * And where one has to move, the slots that shared its colour move with it.
   *
   * A slot that is nudged aside no longer holds the value its twin holds, and
   * the twin will be nudged by a different step or not at all, so the two come
   * apart. Guess draws its frame and its cursor in the same black; both wanted
   * the light grey the white peg had already claimed, and they landed two steps
   * apart from each other for no reason either of them states. Following the
   * first one's destination keeps them together and costs nothing — the value
   * is already reserved, by the twin.
   *
   * `SEMANTIC` slots are exempt, and that exemption is the whole point of the
   * table: Pattern's two blacks *are* meant to come apart, one being a rule
   * and one being a line.
   */
  const settled = new Map<string, string>()

  return flipped.map((css, index) => {
    if (semantic?.includes(index)) return css
    const twin = settled.get(light[index])
    if (twin !== undefined) return twin

    const keep = (value: string) => {
      settled.set(light[index], value)
      return value
    }
    const held = taken.get(css)
    if (held === undefined || light[held] === light[index]) {
      taken.set(css, index)
      return keep(css)
    }
    const hsl = parse(css)
    for (const nudge of hsl ? NUDGES : []) {
      const l = hsl!.l + nudge
      if (l < FLOOR || l > CEILING) continue
      const moved = format({ ...hsl!, l })
      if (!taken.has(moved)) {
        taken.set(moved, index)
        return keep(moved)
      }
    }
    return keep(css)
  })
}
