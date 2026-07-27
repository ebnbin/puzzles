/*
 * puzzle-pre.js — our replacement for upstream's emccpre.js.
 *
 * Passed to emcc as --pre-js. Upstream's version finds its DOM by id, wires
 * the buttons and canvas events itself, and builds menus and dialogs out of
 * raw elements. This one owns no DOM at all: the embedder hands in a host
 * object and everything the C code wants to do to the page is forwarded to
 * it, so React can render the interface however it likes.
 *
 * Note we merge into Module rather than replacing it. Under MODULARIZE the
 * generated factory starts with `var Module = moduleArg`, so assigning a
 * fresh object here — as upstream does — would throw away everything the
 * caller passed in.
 *
 * The other half of this lives in puzzle-lib.js.
 */

// The host, supplied by the embedder as Module.puzzle. See src/engine/types.ts
// for what it must provide.
var PZ = Module['puzzle'];

Module['noExitRuntime'] = true;
// argv[1] is the game id to start from, the same slot upstream fills with the
// URL fragment. main() ignores it unless it begins with '#' — it is expecting
// a fragment, not an id — so put the marker back on. Empty means "generate a
// random one".
Module['arguments'] = [PZ.gameId ? '#' + PZ.gameId : ''];

// Filled in by initPuzzle() below, once the runtime can be called into.
var command;
var timer_callback;
var dlg_return_sval, dlg_return_ival;
var prefs_load_callback;

// Frame timer. Upstream lets its requestAnimationFrame chain run loose; we
// keep the handle so the host can stop it when the puzzle goes away.
var timer = null;
var timer_reference;

// Presets are accumulated as the C code declares them and handed over in one
// piece, rather than being appended to a live <ul> as they arrive.
// preset_submenus[0] is the top level; nested menus are pushed onto the end
// and referred to by index.
var preset_submenus = [[]];
var presets_removed = false;

// Dialog controls under construction, and the thunks that pass their values
// back to C when the dialog is accepted.
var dlg_controls = null;
var dlg_return_funcs = null;

// Set by the host while a save file is being read.
var savefile_read_callback = null;

/*
 * Called from C at the start of main(). The runtime is up by now, so this is
 * the first point at which we can cwrap.
 */
function initPuzzle() {
    command = Module.cwrap('command', 'void', ['number']);
    timer_callback = Module.cwrap('timer_callback', 'void', ['number']);
    dlg_return_sval = Module.cwrap('dlg_return_sval', 'void',
                                   ['number', 'string']);
    dlg_return_ival = Module.cwrap('dlg_return_ival', 'void',
                                   ['number', 'number']);
    prefs_load_callback = Module.cwrap('prefs_load_callback', 'void',
                                       ['number', 'number']);

    // Everything the host is allowed to call. Command numbers are upstream's,
    // from the switch in emcc.c.
    PZ.attach({
        mousedown: Module.cwrap('mousedown', 'boolean',
                                ['number', 'number', 'number']),
        mousemove: Module.cwrap('mousemove', 'boolean',
                                ['number', 'number', 'number']),
        mouseup: Module.cwrap('mouseup', 'boolean',
                              ['number', 'number', 'number']),
        key: Module.cwrap('key', 'boolean',
                          ['number', 'string', 'string',
                           'number', 'number', 'number']),
        resize: Module.cwrap('resize_puzzle', 'void', ['number', 'number']),
        restoreSize: Module.cwrap('restore_puzzle_size', 'void', []),
        rescale: Module.cwrap('rescale_puzzle', 'void', []),

        enterGameId: function() { command(0); },
        enterSeed: function() { command(1); },
        selectPreset: function(n) { PZ.selectedPreset = n; command(2); },
        newGame: function() { command(5); },
        restart: function() { command(6); },
        undo: function() { command(7); },
        redo: function() { command(8); },
        solve: function() { command(9); },
        preferences: function() { command(10); },

        dialogOk: function() {
            for (var i = 0; i < dlg_return_funcs.length; i++)
                dlg_return_funcs[i]();
            command(3);
        },
        dialogCancel: function() { command(4); },

        saveGame: function() {
            var ptr = Module.cwrap('get_save_file', 'number', [])();
            var text = UTF8ToString(ptr);
            Module.cwrap('free_save_file', 'void', ['number'])(ptr);
            return text;
        },
        loadGame: function(text) {
            var bytes = new TextEncoder().encode(text);
            var offset = 0;
            savefile_read_callback = function(buf, len) {
                if (offset + len > bytes.length) return false;
                HEAPU8.set(bytes.subarray(offset, offset + len), buf);
                offset += len;
                return true;
            };
            try {
                Module.cwrap('load_game', 'void', [])();
            } finally {
                savefile_read_callback = null;
            }
        },

        stopTimer: function() {
            if (timer !== null) window.cancelAnimationFrame(timer);
            timer = null;
        },
    });
}

/*
 * Called from C at the end of main(), once the first puzzle exists.
 */
function post_init() {
    PZ.onReady(presets_removed ? null : preset_submenus[0]);
}
