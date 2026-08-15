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

/* midend 指针:上游只在 js_load_prefs 这一处把它交给 JS(为的是让 JS 再传回
   prefs_load_callback)。下面几个 midend_* 直调都靠它,所以取值只能在调用那一刻,
   attach 的时候它还是 0。 */
var puzzle_me = 0;
var midend_status, midend_request_keys, free_keys, midend_freeze_timer;

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

    midend_status = Module.cwrap('midend_status', 'number', ['number']);
    midend_request_keys = Module.cwrap('midend_request_keys', 'number',
                                       ['number', 'number']);
    free_keys = Module.cwrap('free_keys', 'void', ['number', 'number']);
    midend_freeze_timer = Module.cwrap('midend_freeze_timer', 'void',
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

        status: function() { return midend_status(puzzle_me); },

        /* key_label 是 { char *label; int button; },label 在前;上游要求用
           free_keys 释放,不能自己 free。 */
        requestKeys: function() {
            var np = _malloc(4);
            var keys = midend_request_keys(puzzle_me, np);
            var n = getValue(np, 'i32');
            _free(np);
            if (!keys) return [];
            var out = [];
            for (var i = 0; i < n; i++) {
                var label = getValue(keys + i * 8, '*');
                out.push({
                    button: getValue(keys + i * 8 + 4, 'i32'),
                    label: label ? UTF8ToString(label) : null,
                });
            }
            free_keys(keys, n);
            return out;
        },

        freezeTimer: function(proportion) {
            midend_freeze_timer(puzzle_me, proportion);
        },

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
