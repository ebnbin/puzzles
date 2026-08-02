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
 * 2. `veil` — anything with a hue. Kept, and stood off the dark board by what
 *    it stood off the light one. Which way that goes depends on the hue: one
 *    with light to spare has black laid over it in proportion to how much it
 *    throws, because upstream chose these against a white board and at full
 *    strength they are the brightest thing on a dark one; one with none — ink
 *    chosen to be dark on white paper, `#000080` and its like — is instead
 *    lifted until it stands as far off. Multiplying by at most 1 can only ever
 *    do the first. See `VEIL`; 198 of the 426.
 *
 * 3. `flip` — every other grey: the board, the shading, the ink, the lines.
 *    Turned over. See `FLOOR` and `CEILING`; 194 of them.
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
 * rules above, and nothing hand-picks a hex. The bevel correction adds none
 * either: it exchanges two values a rule already produced. Nor does either
 * search — both aim at a contrast upstream itself drew, and stop there.
 *
 * Which rule a slot takes is computed too — from its saturation — for 396 of
 * them. The other 30 come from `SEMANTIC`, a table, because the fact that
 * *this* black is a rule and *that* black is a line is not in the colour: it
 * is in the game. `BEVEL` is a table for the same reason, and
 * all of them were assembled from evidence rather than taste — see their
 * comments. They are the knowledge here that no amount of arithmetic could
 * have recovered.
 *
 * Five constants are tuned: `ACHROMATIC`, `FLOOR`, `CEILING`, `VEIL`,
 * `PAPER_BOARD`. Each carries the measurement that fixed it.
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
 * How far the veil's lifting half may climb.
 *
 * Not `CEILING`, which is where flipped black ink lands: a hue raised that far
 * has spent most of its colour getting there. Raising HSL lightness with the
 * saturation held walks the other two channels up towards the first, so what a
 * hue loses on the way up is the gap between its channels — the only thing that
 * makes it that hue rather than a grey. Measured as max channel minus min, pure
 * blue keeps 0.37 of that gap at `CEILING`, 0.60 at 0.70, 0.68 here, 0.76 at
 * 0.62.
 *
 * 0.66 is where it sits, and 0.70 is where it sat. #6666ff was described here
 * as "still plainly blue" and it is not: at 0.60 of the gap, two fifths of the
 * way to grey, it reads as lavender, and the same arithmetic had #800000
 * arriving as a pink #ff6666 rather than a dark red. #5252ff and #ff5252 are
 * the same colours the game chose, dimmer. That is what this constant is for.
 *
 * The price is paid against the board and it is real: that blue goes from
 * 3.13:1 to 2.56:1 on a #2f2f2f board, the whole lifted set from 3.69 to 3.42
 * on average, and two more slots come to rest on the ceiling instead of on
 * their target — 24 rather than 22 — so a little more of the collapse this
 * ceiling causes.
 *
 * The two are one dial and this is a reading of it, not a solved value. 0.62
 * was tried and taken back: #3d3dff and #ff3d3d hold more of their colour, at
 * 2.11:1 and with 28 slots on the ceiling. Below that it stops being a trade —
 * at 0.58 Mines' #000080 arrives at #0000fa and is back under 2:1 against its
 * own board, which is the "in effect, not drawn" this whole lifting half exists
 * to prevent.
 *
 * So: the point past which a hue stops being worth the contrast. The lift takes
 * what it can get below it and stops, even where the board is owed more. Only
 * slots that would have overshot are touched — anything that reaches its target
 * below this height lands on the target and does not read this number at all.
 */
const LIFT_CEILING = 0.66

/**
 * Everything that has to be read against a tone the rules name.
 *
 * The flip is a photographic negative, and a negative is exactly wrong for a
 * puzzle played in black and white: Pearl's white circles would come out
 * black, and the chapter that tells you what a white circle means would be
 * describing a board you cannot see. So these are not flipped. They keep
 * their order — black stays the dark one — and are compressed into the same
 * range instead, which leaves black at #0f0f0f and white at #d1d1d1.
 *
 * A hue is never at risk here. `veil` composites pure black, which scales the
 * channels and leaves hue and saturation exactly where they were; blue comes
 * out blue. A neutral is the only thing this file ever turns over, and turning
 * a black into a white is the one edit that can make a rule read backwards. So
 * this is the table that guards against that, and it wants one criterion:
 *
 *     A slot is kept — never flipped — if and only if it has to be read
 *     *against* one of the tones the manual's rules name.
 *
 * That comes out in three shapes, all of them the same criterion:
 *
 *   1. It is one of those tones. Pattern's black and white squares, Pearl's two
 *      circles, Guess's two markers.
 *   2. It is the third tone standing between them — the undecided square, drawn
 *      as a cell beside both. Pattern's COL_UNKNOWN and Unruly's COL_EMPTY.
 *      Flip's COL_GRID and COL_DIAG belong here too: the little diagram in
 *      every square is drawn in them on *both* tones, so their job is to sit
 *      between. Flipped while the tones are kept, they land beside the dark one
 *      at 1.4:1 and vanish from every unlit square.
 *   3. It is drawn *on* those tones — the ink written on them, the relief built
 *      out of them, the line that separates them. Singles' number on a black
 *      square, Light Up's number on a black wall, Unruly's four bevel edges
 *      (which the C measures out of COL_0 and COL_1 by `game_mkhighlight_specific`),
 *      Mosaic's solved clue, and the grids of Pattern, Unruly and Singles.
 *
 * Shape 3 is where the reasoning is easiest to get wrong, and the test is the
 * same every time: upstream draws each of these nearer one tone than the other,
 * and flipping it while the tones stay put *mirrors* that. Pattern's grid is
 * 2.48:1 from its black and 8.45:1 from its white, so black regions read as
 * solid blocks and the grid shows between white ones; flipped it becomes
 * 6.56:1 and 1.91:1 and the picture inverts. Kept, 2.16:1 and 5.80:1 — the
 * arrangement upstream drew.
 *
 * Out, uniformly: cursors, error highlights and victory flashes. They are
 * interaction and animation rather than anything the puzzle is made of, and no
 * chapter states a rule in terms of them.
 *
 * The list is not a guess. Every game here has a manual chapter that states the
 * rule in terms of the colour ("black squares", "black and white circles",
 * "black or white respectively"), cross-referenced against the `COL_*` enum in
 * its C to find which slots those words are about, and then against each game's
 * drawing code to find what else is read against them.
 *
 * Deliberately not here: Mines' 7 and 8, which are black and grey only by
 * Minesweeper convention and are drawn on a cell that has itself turned over
 * — keeping them dark would put dark ink on a dark tile. And Guess's pegs
 * beyond the two markers, where light and dark are decoration and the manual
 * never appeals to them.
 *
 * Black Box's COL_BALL was here on the strength of one sentence, and the
 * sentence is in the wrong chapter: "left-click within the arena and a black
 * circle will appear marking the guess" is under *controls*, describing what
 * the interface does, where every other entry here is quoted from a statement
 * of the rules. Black Box has no white ball to be the other half of a pair —
 * a square either holds one or does not, and the thing a ball is told apart
 * from is the red of a missed one. Held dark it came to 1.91:1 at the reveal,
 * which is the one moment the game asks you to look at the balls rather than
 * deduce them; flipped it is 8.77:1, the negative of the 14.31:1 upstream
 * draws. The board it was holding up came down with it: see `BOARD_IS_PAPER`.
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
  /* (1) COL_EMPTY, COL_FULL  (2) COL_UNKNOWN  (3) COL_GRID, between the two */
  pattern: [1, 2, 4, 5],
  /* (1) COL_WRONG, COL_RIGHT — "some light and some dark", and the aim is to
     light them all up  (2) COL_GRID and COL_DIAG, one colour upstream */
  flip: [1, 2, 3, 4],
  /* (1) COL_BLACK, COL_WHITE — "black and white circles", different rules each */
  pearl: [3, 4],
  /* (3) COL_GRID  (2) COL_EMPTY  (1) COL_0, COL_1 with (3) their four bevel
     edges, which `game_mkhighlight_specific` measures out of the two stones */
  unruly: [1, 2, 3, 4, 5, 6, 7, 8],
  /* (1) COL_MARKED, COL_BLANK  (3) COL_TEXT_SOLVED, written on both */
  mosaic: [3, 4, 5],
  /* (1) COL_BLACK, COL_WHITE  (3) COL_BLACKNUM on the black square, COL_GRID
     between it and the white half, which here is the board itself */
  singles: [3, 4, 5, 6],
  /* (1) One aliased slot: grid, black squares, text and your entries together */
  range: [1],
  /* (1) COL_BLACK  (3) COL_LIGHT, the number written on a black wall */
  lightup: [2, 3],
  /* (1) COL_CORRECTPLACE, COL_CORRECTCOLOUR — Mastermind's black and white pegs */
  guess: [16, 17],
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
 * Where a moved board goes. There is one height, and this is it.
 *
 * A board only ever moves for one reason — a black the rules keep would
 * otherwise be darker than the surface it is read against — so what the move
 * has to buy is always the same thing: room under the board for that black.
 * Leaving the background where the flip puts it (0.13) leaves none, there being
 * no room below the bottom of the scale; a kept black on it comes to 1.20:1,
 * which is a shape you can find if you look for it rather than one you read.
 *
 * This is where black ink clears 4.5:1 against it, which is what a number has to
 * clear to be read: #0f0f0f on #7d7d7d is 4.66:1, where 0.48 would be 4.47 and
 * miss. It is no longer a dark board, and saying otherwise would be a fiction —
 * it is paper, dimmed as far as paper can be dimmed while the ink on it stays
 * ink.
 *
 * Two heights lived here for a while — 0.26 for a board that is a third surface
 * between a game's two tones, 0.49 for a board that *is* the white tone — and
 * the split did not survive being looked at. Light Up was the one game on the
 * lower shelf, and it is the case the shelf was supposed to fit: its walls are
 * painted black and the board is the unlit square between them. But 0.26 is
 * measured for a black you can *locate*, and Light Up writes clue numbers on
 * those walls, so it needed the reading contrast too. Measured against upstream
 * rather than against itself, every ratio that matters moves toward the original
 * at 0.49 and away from it at 0.26: the wall 16.83 upstream, 1.91 at 0.26, 4.66
 * here; the bulb 1.25 / 6.58 / 2.70; a lit square 1.16 / 4.14 / 1.70. The lower
 * shelf was not a gentler version of this one, it was an overshoot in the other
 * direction — the board had gone so dark that white-on-board was louder than
 * upstream by as much as black-on-board was quieter.
 *
 * So the exception is now a single number applied to a set, rather than a scale
 * with two stops on it, and it is paid for honestly either way: these three
 * boards are a lighter grey than the other thirty-seven.
 */
const PAPER_BOARD = 0.49

/**
 * The games whose board has to move at all.
 *
 * Moving a board is the most expensive thing in this file: everything drawn on
 * it loses the contrast the board gained, and these boards end up a lighter
 * grey than the other thirty-seven. It buys exactly one thing — a kept black
 * that would otherwise be darker than the surface it is *read against*. So the
 * question is not whether a game has such a black. It is whether that black is
 * read against the board at all.
 *
 * For four games it is not, because they paint every cell they draw on:
 * Pattern's squares are COL_EMPTY or COL_FULL, Unruly's are COL_0 or COL_1,
 * Mosaic's are one of its three tones — none of the three ever fills a cell
 * with COL_BACKGROUND in any state — and Guess draws its black marker on the
 * board but draws it `draw_circle(..., col, COL_FRAME)`, rimming it in the
 * game's own C, which is the same thing `rimmed` below exempts Pearl for.
 * Measured: with the board left where the flip put it, every within-game
 * contrast in those four is unchanged to the digit, because `compress` and
 * `flip` do not read the board. All that changed was the margin — and
 * Pattern's clue numbers, which were paying 8.20:1 down to 5.18:1 for a raise
 * that bought them nothing.
 *
 * The three below fail that test:
 *
 *   - Light Up. An unlit square *is* COL_BACKGROUND, so a wall is black on the
 *     board. Unraised it comes to 1.20:1, and the clue numbers are written on
 *     the walls, so they go with it.
 *   - Singles, and Range. Their white half is the board: Singles paints a white
 *     square by painting nothing, and its COL_WHITE is set in `game_colours`
 *     and never used by any draw call; Range has no white slot at all. Both
 *     chapters say it in those words — "colour some of the squares black", "the
 *     remaining white squares". Unraised, both boards go almost entirely to
 *     1.20:1 and stop being legible at all.
 *
 * All three go to the same place, because all three are asking for the same
 * thing. Their light boards happen to be the same #e6e6e6 as well, so the three
 * dark boards come out identical — but that is the tables agreeing, not a rule:
 * `PAPER_BOARD` is an absolute height and would land them together whatever
 * their originals were.
 *
 * Black Box was here, and the way it left is worth keeping. Its arena is
 * COL_COVER for the whole game and its balls sit on that at #9d9d9d — but
 * `bg = (gs->reveal ? COL_BACKGROUND : ... COL_COVER)`, so at the reveal the
 * arena is repainted in the board and every ball is drawn straight onto it. A
 * black ball there was 1.43:1 unraised, so the board went up to give it
 * 1.91:1. The better answer was to stop insisting the ball is black: nothing
 * in the rules says it is, and flipped it reads at 8.77:1 on a board that
 * never had to move. See the note in `SEMANTIC`. A raise is what you reach for
 * when a colour has to stay where it is; it is worth asking first whether it
 * does.
 *
 * Declared rather than computed, because whether a cell is painted — and in
 * which of a game's states — is a fact about its drawing code and not about
 * the colours in its palette. Singles' unused COL_WHITE would fool a test on
 * colours alone, and Black Box's reveal would fool a test on one screenshot.
 */
const BOARD_IS_PAPER: ReadonlySet<string> = new Set(['lightup', 'singles', 'range'])


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
   * Whether this game's board has to move. `BOARD_IS_PAPER` says which games
   * draw a kept black *on* the board — a fact about drawing code, not about
   * colours, so it has to be declared. The rest is worked out: the move is
   * only warranted if such a black would in fact end up below the board the
   * flip would otherwise give it, because that is the only thing being bought.
   * A game whose darkest kept colour already cleared its flipped board would
   * keep that board even if it were listed.
   *
   * Which is not hypothetical — it is how Pearl left. A black pearl on an
   * unlifted board came to 1.18:1, a disc you can find rather than a circle
   * you read, and that was the case the exception was first written for. It
   * has a rim now, and a rim is something to see it against — the very thing
   * this test is asking after. So a slot `RIM` covers does not ask for room,
   * and Pearl's board came back down to #2f2f2f — where the flip puts a
   * #d5d5d5 board, which is what fourteen other games have.
   */
  const board = parse(light[BACKGROUND])
  const rimmed = RIM[game] ?? {}
  const needsRoom =
    BOARD_IS_PAPER.has(game) &&
    !!semantic &&
    !!board &&
    semantic.some((i) => {
      if (i in rimmed) return false
      const kept = parse(light[i])
      return !!kept && compress(kept.l) < flip(board.l)
    })

  const flipped = light.map((css, index) => {
    const colour = parse(css)
    if (!colour) return css
    if (semantic) {
      if (index === BACKGROUND && needsRoom)
        return format({ ...colour, l: PAPER_BOARD })
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
  const lift = needsRoom && board ? PAPER_BOARD - flip(board.l) : 0

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
   * The board the veil's lifting half measures against: not the flip of the
   * light board but whatever this game's board actually became, so a board that
   * turned to paper is what its hues are held up against.
   */
  const darkBoard = parse(flipped[BACKGROUND])

  /**
   * The lightness at which `colour` stands `want` off `ground`, searched
   * between `from` and `ceiling`. Hue and saturation are held, so this only
   * ever returns a paler version of the colour it was given.
   *
   * Bisected rather than solved: with the hue and the saturation held, contrast
   * against a fixed board rises monotonically with lightness above it, so twenty
   * halvings put it within a thousandth. The alternative is the inverse of the
   * sRGB transfer function through the luminance of three channels, which is a
   * page of algebra for a number a loop finds exactly.
   */
  const standOff = (
    colour: Colour, ground: number, want: number, from: number, ceiling: number,
  ) => {
    let lo = from
    let hi = ceiling
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      const at = parse(format({ ...colour, l: mid }))
      if (at && ratio(ground, luminance(at)) < want) lo = mid
      else hi = mid
    }
    return format({ ...colour, l: (lo + hi) / 2 })
  }

  /*
   * The other half of the veil.
   *
   * `veil` lays black over a hue in proportion to the light it throws, because
   * upstream chose these against a white board and at full strength they are
   * the brightest thing on a dark one. That is true of a bright hue and exactly
   * backwards for a dark one: `#000080` is ink chosen to be dark on white
   * paper, and multiplying it by anything at most 1 cannot do to it what the
   * dark board needs. Mines' 4 came out at 1.01:1 against its own board — three
   * of that puzzle's numerals were, in effect, not drawn.
   *
   * So the rule is said in full: a hue stands off the dark board by what it
   * stood off the light one. Veiling is what that means for a hue with light to
   * spare; this is what it means for one with none. Both keep the colour and
   * change only how much of it there is against the ground, and neither picks a
   * number — the target is the contrast upstream itself drew.
   *
   * Which is why the condition is a comparison and not a threshold: a hue that
   * already stands off the dark board as far as it did off the light one is
   * left exactly where the veil put it. Mines' 3 is 3.20:1 upstream and 3.46:1
   * here, and does not move.
   */
  for (let index = 0; index < light.length; index++) {
    if (index === BACKGROUND) continue
    if (semantic?.includes(index)) continue
    const was = parse(light[index])
    const now = parse(flipped[index])
    if (!was || !now || !board || !darkBoard) continue
    if (was.s < ACHROMATIC) continue
    const ground = luminance(darkBoard)
    const want = ratio(luminance(board), luminance(was))
    if (ratio(ground, luminance(now)) >= want) continue
    flipped[index] = standOff(now, ground, want, now.l, LIFT_CEILING)
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
  /*
   * The last pass, and the only invariant left that is about two slots rather
   * than one: two slots the game drew in the same colour are drawn in the same
   * colour here too.
   *
   * Every rule above maps a colour to a colour, so equal inputs already give
   * equal outputs. The bevel exchange is the one thing in this file that can
   * break that, because moving a value between two slots does not care what a
   * third slot holds — so the pairs it touched are seeded first, and the slots
   * that shared their light colour follow them rather than the other way round.
   *
   * Samegame is the case. `game_mkhighlight` saturates its highlight to white,
   * and Samegame independently paints a selected tile white too, so the two
   * arrive here identical; without this the exchange separates them and the
   * outline drawn round a selected tile — the lowlight, chosen precisely
   * because the tile is the highlight's colour — loses most of its step.
   *
   * `SEMANTIC` slots are exempt, and that exemption is the whole point of the
   * table: Pattern's two blacks *are* meant to come apart, one being a rule and
   * one being a line.
   *
   * A collision pass used to live here as well: where two slots the game drew
   * *differently* landed on the same value, it pushed one aside by a step from
   * a `NUDGES` table. It is gone, and what it was patching is worth naming,
   * because both causes are still here. Six of its seven slots were a flipped
   * black meeting a compressed white — `flip` and `compress` share `FLOOR` and
   * `CEILING` and run opposite ways, so the ends coincide exactly, and any game
   * holding both lands them on one value. The seventh was two blues that both
   * ran out of room at `LIFT_CEILING`. Removing the pass lets those meet:
   * Mines draws its 1 and its 4 in one blue, Pattern writes its clues in the
   * colour of an empty square, Pearl flashes in the colour of a black pearl.
   * That was measured and rendered before it was taken out.
   */
  const settled = new Map<string, string>()
  for (const index of BEVEL[game]?.flat() ?? [])
    if (!semantic?.includes(index)) settled.set(light[index], flipped[index])

  return flipped.map((css, index) => {
    if (semantic?.includes(index)) return css
    const twin = settled.get(light[index])
    if (twin !== undefined) return twin
    settled.set(light[index], css)
    return css
  })
}
