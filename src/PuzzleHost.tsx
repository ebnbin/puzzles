import { usePuzzleEngine } from './puzzleEngine'

/**
 * The smallest markup upstream's compiled puzzle will run in, laid out by us
 * instead of by its own HTML page.
 *
 * Four things are not ours to choose. `#puzzlecanvas`, `#gamemenu` and
 * `#puzzle` are dereferenced without a null check, `#gamemenu` must be a form
 * because the preset radios are read back through `form.elements`, and
 * `#statusbar` is required by every puzzle that has one.
 *
 * Note what is deliberately absent. `#puzzlecanvascontain` is optional, and
 * supplying it would make the module size the puzzle to that element instead
 * of using the size the C code picks — upstream's own page leaves it out, so
 * we do too, and the board comes out the same size as the original.
 *
 * Everything else is ours. The action buttons sit *outside* the form on
 * purpose: ids are looked up document-wide, so the module still wires them
 * up, but the form's keydown handler — which assumes upstream's nested ul/li
 * menus and throws on anything else — never sees them. That leaves the
 * controls free for React to lay out and, later, to replace.
 */
export default function PuzzleHost({ name }: { name: string }) {
  const status = usePuzzleEngine(name)

  return (
    <div className="host" id="puzzle" data-status={status}>
      {status === 'error' && (
        <p className="host-error">Could not start the puzzle. See the console.</p>
      )}

      <canvas id="puzzlecanvas" tabIndex={0} />
      <div id="statusbar" />

      {/* The module appends the preset radios here, and reads them back
          through the form. React renders it empty and never touches it. */}
      <form id="gamemenu">
        <ul>
          <li>
            <ul id="gametype" />
          </li>
        </ul>
      </form>

      <div className="host-controls">
        <button type="button" id="new">New game</button>
        <button type="button" id="restart">Restart</button>
        <button type="button" id="undo">Undo</button>
        <button type="button" id="redo">Redo</button>
        <button type="button" id="solve">Solve</button>
        <button type="button" id="specific">Enter game ID…</button>
      </div>
    </div>
  )
}
