/* Bridges 秩空间穷举:k 个岛只按相对行列(rank)摆放,每对可见岛之间 0..maxb 座桥,要求连通、
 * 桥线不交叉;对每种配置按生成器的判据检查:diff-1 解不出(k>3 时)且 diff 解得出。统计通过数。 */
#include "bridges.c"
#include <stdio.h>
#include <stdlib.h>

static int K, MAXB, LOOPS, DIFF;
static int px[8], py[8];
static int ea[16], eb[16], ne, eb_[16];
static long configs, passes;
static char first[256];

static int build_and_test(void) {
    game_params p; memset(&p, 0, sizeof p);
    p.w = p.h = 2 * K - 1; p.maxb = MAXB; p.allowloops = LOOPS; p.islands = 30; p.expansion = 10; p.difficulty = DIFF;
    int res[2];
    for (int t = 0; t < 2; t++) {
        game_state *s = new_state(&p);
        for (int i = 0; i < K; i++) island_add(s, 2 * px[i], 2 * py[i], 0);
        for (int e = 0; e < ne; e++) if (eb_[e] > 0)
            island_join(INDEX(s, gridi, 2 * px[ea[e]], 2 * py[ea[e]]), INDEX(s, gridi, 2 * px[eb[e]], 2 * py[eb[e]]), eb_[e], false);
        map_count(s); map_find_orthogonal(s);
        res[t] = solve_from_scratch(s, DIFF - 1 + t);
        free_game(s);
    }
    return (K <= 3 || res[0] == 0) && res[1] > 0;
}
static int connected(void) {
    int seen = 1, changed = 1;
    while (changed) { changed = 0; for (int e = 0; e < ne; e++) if (eb_[e] > 0) {
        int A = 1 << ea[e], B = 1 << eb[e];
        if ((seen & A) && !(seen & B)) { seen |= B; changed = 1; }
        if ((seen & B) && !(seen & A)) { seen |= A; changed = 1; } } }
    return seen == (1 << K) - 1;
}
static int crossing(void) {
    for (int e = 0; e < ne; e++) if (eb_[e] > 0 && py[ea[e]] == py[eb[e]]) {
        int y = py[ea[e]], x1 = px[ea[e]], x2 = px[eb[e]]; if (x1 > x2) { int t = x1; x1 = x2; x2 = t; }
        for (int f = 0; f < ne; f++) if (eb_[f] > 0 && px[ea[f]] == px[eb[f]]) {
            int x = px[ea[f]], y1 = py[ea[f]], y2 = py[eb[f]]; if (y1 > y2) { int t = y1; y1 = y2; y2 = t; }
            if (x1 < x && x < x2 && y1 < y && y < y2) return 1;
        }
    }
    return 0;
}
static void recedge(int e) {
    if (e == ne) {
        if (!connected() || crossing()) return;
        configs++;
        if (build_and_test()) {
            if (!passes) { int n = 0; for (int i = 0; i < K; i++) n += sprintf(first + n, "(%d,%d)", px[i], py[i]);
                for (int f = 0; f < ne; f++) if (eb_[f] > 0) n += sprintf(first + n, " %d-%d:%d", ea[f], eb[f], eb_[f]); }
            passes++;
        }
        return;
    }
    for (int b = 0; b <= MAXB; b++) { eb_[e] = b; recedge(e + 1); }
}
static void position_done(void) {
    ne = 0;
    for (int i = 0; i < K; i++) for (int j = i + 1; j < K; j++) {
        if (px[i] == px[j]) { int lo = py[i] < py[j] ? py[i] : py[j], hi = py[i] < py[j] ? py[j] : py[i], blocked = 0;
            for (int m = 0; m < K; m++) if (px[m] == px[i] && py[m] > lo && py[m] < hi) blocked = 1;
            if (!blocked) { ea[ne] = i; eb[ne] = j; ne++; } }
        else if (py[i] == py[j]) { int lo = px[i] < px[j] ? px[i] : px[j], hi = px[i] < px[j] ? px[j] : px[i], blocked = 0;
            for (int m = 0; m < K; m++) if (py[m] == py[i] && px[m] > lo && px[m] < hi) blocked = 1;
            if (!blocked) { ea[ne] = i; eb[ne] = j; ne++; } }
    }
    recedge(0);
}
static void recpos(int i, int from) {
    if (i == K) { position_done(); return; }
    for (int c = from; c < K * K; c++) { px[i] = c % K; py[i] = c / K; recpos(i + 1, c + 1); }
}
int main(int argc, char **argv) {
    K = atoi(argv[1]); MAXB = atoi(argv[2]); LOOPS = atoi(argv[3]); DIFF = atoi(argv[4]);
    recpos(0, 0);
    printf("k=%d maxb=%d loops=%d diff=%d: configs=%ld passes=%ld %s\n", K, MAXB, LOOPS, DIFF, configs, passes, passes ? first : "");
    return 0;
}
