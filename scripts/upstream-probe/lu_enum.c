/* Lightup 穷举 v2:先枚举黑格布局(可选 rot4/ref4 对称),再按「白邻居数」上界枚举数字。
 * 报告 easy/tricky/hard/none 计数以及 tricky/hard 谜题里最少的白格数;数字组合超过上限的布局跳过并计数。 */
#include "lightup.c" /* -I vendor/sgtpuzzles */
#include <stdio.h>
#include <stdlib.h>

static int W, H, cells, mode;
static int black[64], num[64], rep[64];
static long cnt[3], none, total, skipped;
static int minw[3] = {99, 99, 99};
static char samples[3][3][80]; static int nsamp[3];
static game_params P;
static const double CAP = 3e7;

static int idx(int x, int y) { return y * W + x; }
static int whitenbrs(int i) {
    int x = i % W, y = i / W, n = 0;
    if (x > 0 && !black[i - 1]) n++;
    if (x < W - 1 && !black[i + 1]) n++;
    if (y > 0 && !black[i - W]) n++;
    if (y < H - 1 && !black[i + W]) n++;
    return n;
}
static void eval(void) {
    game_state *s = new_state(&P);
    int whites = 0;
    for (int i = 0; i < cells; i++) {
        if (black[i]) { s->flags[i] |= F_BLACK; if (num[i] >= 0) { s->flags[i] |= F_NUMBERED; s->lights[i] = num[i]; } }
        else whites++;
    }
    int md = -1;
    for (int d = 0; d <= 2; d++) if (puzzle_is_good(s, d)) { md = d; break; }
    total++;
    if (md < 0) none++; else { cnt[md]++; if (whites < minw[md]) minw[md] = whites;
        if (md > 0 && nsamp[md] < 3) { char *q = samples[md][nsamp[md]++]; for (int i = 0; i < cells; i++) *q++ = !black[i] ? '.' : num[i] < 0 ? 'B' : '0' + num[i]; *q = 0; } }
    free_game(s);
}
static void recnum(int i) {
    while (i < cells && !black[i]) i++;
    if (i == cells) { eval(); return; }
    int nb = whitenbrs(i);
    for (int v = -1; v <= nb; v++) { num[i] = v; recnum(i + 1); }
}
static void layout_done(void) {
    double combos = 1;
    for (int i = 0; i < cells; i++) if (black[i]) combos *= whitenbrs(i) + 2;
    if (combos > CAP) { skipped++; return; }
    recnum(0);
}
static void reclayout(int i) {
    if (i == cells) { layout_done(); return; }
    if (rep[i] != i) { black[i] = black[rep[i]]; reclayout(i + 1); return; }
    black[i] = 0; reclayout(i + 1);
    black[i] = 1; reclayout(i + 1);
}
int main(int argc, char **argv) {
    W = atoi(argv[1]); H = atoi(argv[2]); mode = argv[3][0]; cells = W * H;
    P.w = W; P.h = H; P.blackpc = 20; P.symm = SYMM_NONE; P.difficulty = 0;
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
        int i = idx(x, y), r = i;
        if (mode == 'r') {
            if (W != H) { printf("rot4 needs square\n"); return 1; }
            int o[4] = { i, idx(W - 1 - y, x), idx(W - 1 - x, H - 1 - y), idx(y, H - 1 - x) };
            for (int k = 0; k < 4; k++) if (o[k] < r) r = o[k];
        } else if (mode == 'f') {
            int o[4] = { i, idx(W - 1 - x, y), idx(x, H - 1 - y), idx(W - 1 - x, H - 1 - y) };
            for (int k = 0; k < 4; k++) if (o[k] < r) r = o[k];
        } else if (mode == 'v') {
            int o = idx(x, H - 1 - y); if (o < r) r = o;
        } else if (mode == 'o') {
            int o = idx(W - 1 - x, H - 1 - y); if (o < r) r = o;
        }
        rep[i] = r;
    }
    reclayout(0);
    printf("%dx%d %c: total=%ld easy=%ld tricky=%ld hard=%ld none=%ld minwhites(tricky)=%d minwhites(hard)=%d skippedLayouts=%ld\n",
           W, H, mode, total, cnt[0], cnt[1], cnt[2], none, minw[1], minw[2], skipped);
    for (int d = 1; d <= 2; d++) for (int k = 0; k < nsamp[d]; k++) printf("  %s sample: %s\n", d == 1 ? "tricky" : "hard", samples[d][k]);
    return 0;
}
