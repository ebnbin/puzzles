/* 通用生成器探针:按参数串跑 new_game_desc 若干 seed,带闹钟超时。只用来反驳「一定生不出」。 */
#include PUZZLE_SRC
#include <signal.h>
#include <unistd.h>
#include <time.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
struct preset_menu *preset_menu_new(void) { return NULL; }
struct preset_menu *preset_menu_add_submenu(struct preset_menu *p, char *t) { (void)p; (void)t; return NULL; }
void preset_menu_add_preset(struct preset_menu *m, char *t, game_params *p) { (void)m; (void)t; (void)p; }
void midend_supersede_game_desc(midend *me, const char *d, const char *pd) { (void)me; (void)d; (void)pd; }
static void onalarm(int s) { (void)s; printf("TIMEOUT\n"); fflush(stdout); _exit(3); }
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
int main(int argc, char **argv) {
    const char *ps = argv[1];
    int n = argc > 2 ? atoi(argv[2]) : 3, to = argc > 3 ? atoi(argv[3]) : 10;
    game_params *p = default_params();
    decode_params(p, ps);
    char *enc = encode_params(p, true);
    const char *err = validate_params(p, true);
    if (err) { printf("%s INVALID: %s\n", enc, err); return 2; }
    signal(SIGALRM, onalarm); alarm(to);
    for (int i = 0; i < n; i++) {
        char seed[32]; sprintf(seed, "%d", i + 1);
        random_state *rs = random_new(seed, strlen(seed));
        char *aux = NULL; double t0 = now();
        char *desc = new_game_desc(p, rs, &aux, false);
        const char *bad = validate_desc(p, desc);
        printf("%s seed %d: %.2fs %.50s%s%s\n", enc, i + 1, now() - t0, desc, bad ? " DESC-INVALID: " : "", bad ? bad : ""); fflush(stdout);
        sfree(desc); if (aux) sfree(aux); random_free(rs);
    }
    printf("%s OK\n", enc); return 0;
}
