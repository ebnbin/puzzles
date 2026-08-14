/*
 * 上游 emccpre.js 的替身(emcc --pre-js):不碰 DOM,只把请求转发给宿主对象。
 * MODULARIZE 下工厂以 var Module = moduleArg 开头,这里只能往 Module 上并东西;
 * 照上游那样整体赋值 var Module = {...} 会把调用者传入的宿主全丢掉。
 * 换这层绝不能影响 .wasm,build-games.sh 用 cmp 保证。
 */
var PZ = Module['puzzle'];

Module['noExitRuntime'] = true;
/* main() 只认 # 开头的 argv[1](它期待的是 URL fragment),空串 = 随机发牌。 */
Module['arguments'] = [PZ.gameId ? '#' + PZ.gameId : ''];

var command;
var timer_callback;
var dlg_return_sval, dlg_return_ival;
var prefs_load_callback;

var timer = null;
var timer_reference;

var preset_submenus = [[]];
var presets_removed = false;

var dlg_controls = null;
var dlg_return_funcs = null;

var savefile_read_callback = null;

function initPuzzle() {
    command = Module.cwrap('command', 'void', ['number']);
    timer_callback = Module.cwrap('timer_callback', 'void', ['number']);
    dlg_return_sval = Module.cwrap('dlg_return_sval', 'void',
                                   ['number', 'string']);
    dlg_return_ival = Module.cwrap('dlg_return_ival', 'void',
                                   ['number', 'number']);
    prefs_load_callback = Module.cwrap('prefs_load_callback', 'void',
                                       ['number', 'number']);

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

        tick: function(seconds) { timer_callback(seconds); },

        stopTimer: function() {
            if (timer !== null) window.cancelAnimationFrame(timer);
            timer = null;
        },
    });
}

function post_init() {
    PZ.onReady(presets_removed ? null : preset_submenus[0]);
}
