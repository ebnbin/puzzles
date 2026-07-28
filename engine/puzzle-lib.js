/*
 * puzzle-lib.js — our replacement for upstream's emcclib.js.
 *
 * Passed to emcc as --js-library. This is the whole of the interface the
 * compiled C calls out through: 48 functions, unchanged in name and
 * signature, because the C side is not ours to alter.
 *
 * What changed is what they do. Upstream's versions build and mutate DOM
 * directly — creating <li>s for presets, setting textContent on a status bar,
 * assembling dialogs out of elements. These ones decode the arguments out of
 * wasm memory and hand plain JavaScript values to the host, which is React.
 * Drawing goes to a renderer we own in TypeScript rather than straight to a
 * 2D context.
 *
 * PZ and the shared state come from puzzle-pre.js.
 */

mergeInto(LibraryManager.library, {
    /* ----------------------------------------------------------------
     * Lifecycle.
     */
    js_init_puzzle: function() {
        initPuzzle();
    },

    js_post_init: function() {
        post_init();
    },

    js_debug: function(ptr) {
        console.log(UTF8ToString(ptr));
    },

    js_error_box: function(ptr) {
        PZ.onError(UTF8ToString(ptr));
    },

    /* ----------------------------------------------------------------
     * Presets and menu state. Upstream appends elements to a live <ul> as
     * these arrive; we collect them and hand the finished tree to the host
     * in post_init, so React can render it as data.
     */
    js_remove_type_dropdown: function() {
        presets_removed = true;
    },

    js_remove_solve_button: function() {
        PZ.onSolveRemoved();
    },

    js_add_preset: function(menuid, ptr, value) {
        preset_submenus[menuid].push({
            name: UTF8ToString(ptr),
            value: value,
        });
    },

    js_add_preset_submenu: function(menuid, ptr, value) {
        var submenu = [];
        preset_submenus[menuid].push({
            name: UTF8ToString(ptr),
            value: null,
            submenu: submenu,
        });
        return preset_submenus.push(submenu) - 1;
    },

    js_get_selected_preset: function() {
        return PZ.selectedPreset;
    },

    js_select_preset: function(n) {
        PZ.selectedPreset = n;
        PZ.onPresetSelected(n);
    },

    js_enable_undo_redo: function(undo, redo) {
        PZ.onUndoRedo(undo != 0, redo != 0);
    },

    js_update_key_labels: function(lsk_ptr, csk_ptr) {
        var lsk = UTF8ToString(lsk_ptr);
        var csk = UTF8ToString(csk_ptr);
        PZ.onKeyLabels(lsk === csk ? '' : lsk, csk);
    },

    js_update_permalinks: function(desc, seed) {
        PZ.onPermalinks(
            encodeURI(UTF8ToString(desc)).replace(/#/g, '%23'),
            seed == 0 ? null : encodeURI(UTF8ToString(seed)).replace(/#/g, '%23'));
    },

    /* ----------------------------------------------------------------
     * Colours. The back end names its colours once at startup; the first is
     * also the page background, which upstream publishes as a CSS variable.
     */
    js_default_colour: function(output) {
        var rgb = PZ.draw.defaultColour();
        if (rgb) {
            setValue(output, rgb[0], 'float');
            setValue(output + 4, rgb[1], 'float');
            setValue(output + 8, rgb[2], 'float');
        }
    },

    js_set_colour: function(colour_number, colour_string) {
        PZ.draw.setColour(colour_number, UTF8ToString(colour_string));
    },

    js_get_date_64: function(ptr) {
        setValue(ptr, new Date().valueOf(), 'i64');
    },

    /* ----------------------------------------------------------------
     * Frame timer. The chain is the same as upstream's, but the handle is
     * kept where the host can cancel it on teardown.
     */
    js_activate_timer: function() {
        PZ.onTimer(true);
        timer_reference = performance.now();
        var frame = function(now) {
            timer = window.requestAnimationFrame(frame);
            // This may call js_deactivate_timer below.
            timer_callback((now - timer_reference) / 1000.0);
            timer_reference = now;
        };
        timer = window.requestAnimationFrame(frame);
    },

    js_deactivate_timer: function() {
        if (timer !== null) window.cancelAnimationFrame(timer);
        timer = null;
        PZ.onTimer(false);
    },

    /* ----------------------------------------------------------------
     * Drawing. Every one of these is a straight forward to the renderer,
     * after pulling strings and point arrays out of wasm memory.
     */
    js_canvas_start_draw: function(dr) {
        PZ.draw.startDraw();
    },

    js_canvas_draw_update: function(dr, x, y, w, h) {
        PZ.draw.drawUpdate(x, y, w, h);
    },

    js_canvas_end_draw: function(dr) {
        PZ.draw.endDraw();
    },

    js_canvas_draw_rect: function(dr, x, y, w, h, colour) {
        PZ.draw.rect(x, y, w, h, colour);
    },

    js_canvas_clip: function(dr, x, y, w, h) {
        PZ.draw.clip(x, y, w, h);
    },

    js_canvas_unclip: function(dr) {
        PZ.draw.unclip();
    },

    js_canvas_draw_line: function(x1, y1, x2, y2, width, colour) {
        PZ.draw.line(x1, y1, x2, y2, width, colour);
    },

    js_canvas_draw_poly: function(dr, pointptr, npoints, fill, outline) {
        var points = new Array(npoints * 2);
        for (var i = 0; i < npoints; i++) {
            points[2 * i] = getValue(pointptr + 8 * i, 'i32');
            points[2 * i + 1] = getValue(pointptr + 8 * i + 4, 'i32');
        }
        PZ.draw.poly(points, fill, outline);
    },

    js_canvas_draw_circle: function(dr, x, y, r, fill, outline) {
        PZ.draw.circle(x, y, r, fill, outline);
    },

    js_canvas_find_font_midpoint: function(height, monospaced) {
        return PZ.draw.fontMidpoint(height, !!monospaced);
    },

    js_canvas_draw_text: function(x, y, halign, colour, fontsize, monospaced,
                                  text) {
        PZ.draw.text(x, y, halign, colour, fontsize, !!monospaced,
                     UTF8ToString(text));
    },

    js_canvas_new_blitter: function(bl, w, h) {
        PZ.draw.newBlitter(bl, w, h);
    },

    js_canvas_free_blitter: function(bl) {
        PZ.draw.freeBlitter(bl);
    },

    js_canvas_blitter_save: function(dr, bl, x, y) {
        PZ.draw.blitterSave(bl, x, y);
    },

    js_canvas_blitter_load: function(dr, bl, x, y) {
        PZ.draw.blitterLoad(bl, x, y);
    },

    js_canvas_get_preferred_size: function(wp, hp) {
        var size = PZ.draw.preferredSize();
        if (!size) return false;
        setValue(wp, size.w, 'i32');
        setValue(hp, size.h, 'i32');
        return true;
    },

    js_canvas_set_size: function(w, h, new_fe_scale) {
        PZ.draw.setSize(w, h, new_fe_scale);
    },

    js_get_device_pixel_ratio: function() {
        return window.devicePixelRatio || 1;
    },

    /* ----------------------------------------------------------------
     * Status bar.
     */
    js_canvas_remove_statusbar: function() {
        PZ.onStatus(null);
    },

    js_canvas_status_bar: function(dr, ptr) {
        PZ.onStatus(UTF8ToString(ptr));
    },

    /* ----------------------------------------------------------------
     * Dialogs. Upstream builds the controls as elements; we describe them and
     * let the host render them, keeping a thunk per control to read the value
     * back when the dialog is accepted.
     */
    js_dialog_init: function(titletext) {
        dlg_controls = [];
        dlg_return_funcs = [];
        PZ.dialogTitle = UTF8ToString(titletext);
    },

    js_dialog_string: function(index, title, initialtext) {
        var control = {
            kind: 'string',
            label: UTF8ToString(title),
            value: UTF8ToString(initialtext),
        };
        dlg_controls.push(control);
        dlg_return_funcs.push(function() {
            dlg_return_sval(index, String(control.value));
        });
    },

    js_dialog_choices: function(index, title, choicelist, initvalue) {
        // The back end packs the choices into one string whose first
        // character is the separator.
        var packed = UTF8ToString(choicelist);
        var control = {
            kind: 'choices',
            label: UTF8ToString(title),
            choices: packed.slice(1).split(packed[0]),
            value: initvalue,
        };
        dlg_controls.push(control);
        dlg_return_funcs.push(function() {
            dlg_return_ival(index, Number(control.value));
        });
    },

    js_dialog_boolean: function(index, title, initvalue) {
        var control = {
            kind: 'boolean',
            label: UTF8ToString(title),
            value: initvalue != 0,
        };
        dlg_controls.push(control);
        dlg_return_funcs.push(function() {
            dlg_return_ival(index, control.value ? 1 : 0);
        });
    },

    js_dialog_launch: function() {
        PZ.onDialog({ title: PZ.dialogTitle, controls: dlg_controls });
    },

    js_dialog_cleanup: function() {
        dlg_controls = null;
        dlg_return_funcs = null;
        PZ.onDialog(null);
    },

    js_focus_canvas: function() {
        PZ.focusCanvas();
    },

    /* ----------------------------------------------------------------
     * Saved games and preferences.
     */
    js_savefile_read: function(buf, len) {
        return savefile_read_callback ? savefile_read_callback(buf, len) : false;
    },

    js_save_prefs: function(buf) {
        PZ.savePrefs(UTF8ToString(buf));
    },

    js_load_prefs: function(me) {
        var prefsdata = PZ.loadPrefs();
        if (prefsdata === undefined || prefsdata === null) return;
        var lenbytes = lengthBytesUTF8(prefsdata) + 1;
        var dest = _malloc(lenbytes);
        if (dest == 0) return;
        stringToUTF8(prefsdata, dest, lenbytes);
        prefs_load_callback(me, dest);
        _free(dest);
    }
});
