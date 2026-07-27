/*
 * keys-shim.c — appended to a throwaway copy of emcc.c by
 * scripts/build-games.sh. vendor/ is not modified.
 *
 * Most puzzles tell the front end which keys they need, through
 * midend_request_keys(); Android and GTK use it to draw a keypad. The web
 * front end never had one, so upstream's emcc.c never calls it — and `me` is
 * static there, so nothing else can. This is the smallest thing that makes it
 * reachable: without it a touch device cannot enter a digit, and Solo, Keen,
 * Towers, Unequal and Undead are unplayable.
 *
 * EMSCRIPTEN_KEEPALIVE adds these to the exports without having to restate
 * upstream's EXPORTED_FUNCTIONS list on the link line.
 */

#include <emscripten.h>

/*
 * The keys the current puzzle wants, as "button<TAB>label" lines. The caller
 * frees it with free_key_labels(). Empty if the puzzle asks for nothing.
 */
EMSCRIPTEN_KEEPALIVE
char *get_key_labels(void)
{
    int nkeys = 0, i;
    key_label *keys = midend_request_keys(me, &nkeys);
    size_t len = 1;
    char *out, *p;

    for (i = 0; i < nkeys; i++)
        len += 16 + strlen(keys[i].label ? keys[i].label : "");

    out = snewn(len, char);
    p = out;
    *p = '\0';
    for (i = 0; i < nkeys; i++)
        p += sprintf(p, "%d\t%s\n", keys[i].button,
                     keys[i].label ? keys[i].label : "");

    if (keys)
        free_keys(keys, nkeys);
    return out;
}

EMSCRIPTEN_KEEPALIVE
void free_key_labels(char *p)
{
    sfree(p);
}

/*
 * Press one of those keys.
 *
 * key() cannot be used for this: it takes a DOM key name and translates it
 * into a midend button, and what get_key_labels() hands out is already a
 * midend button. Round-tripping it back through a key name loses the ones
 * with no DOM spelling — the cursor keys, and anything carrying
 * MOD_NUM_KEYPAD, which the 8-way puzzles need. This is the same two lines
 * key() runs once it has finished translating.
 */
EMSCRIPTEN_KEEPALIVE
bool press_key(int button)
{
    int result = midend_process_key(me, 0, 0, button);
    post_move();
    return result != PKR_UNUSED;
}
