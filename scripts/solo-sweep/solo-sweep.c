/*
 * solo-sweep.c:一行一个参数组合,真的调上游 new_game_desc 生成一局,报耗时与结局。
 * 一行 fork 一次——断言会 abort、超时靠信号打死,都是进程级的死法,不 fork 只能测一个点。
 *
 *   solo-sweep <CPU秒上限>
 *   stdin  每行:key\t参数串\t种子
 *   stdout 每行:key\t参数串\t种子\t结局\t墙钟\tCPU\t提示格\t回显的参数串
 *
 * 结局:ok / timeout / crash / reject(上游自己不收)。
 * 上限用 RLIMIT_CPU 不用 alarm:并行跑时墙钟含排队,CPU 时间不含,超订也不会误杀。
 * alarm 留一个四倍的兜底,防「不烧 CPU 又不返回」这种理论上的卡死。
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>
#include <sys/resource.h>
#include "puzzles.h"
#include "solo.c"

static double now(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec * 1e-9;
}

int main(int argc, char **argv)
{
    char line[4096];
    int cap = argc > 1 ? atoi(argv[1]) : 10;

    setvbuf(stdout, NULL, _IOLBF, 0);
    while (fgets(line, sizeof line, stdin)) {
        char *key, *spec, *seed, *p = line;
        game_params *par;
        const char *err;
        char *enc;
        size_t len = strlen(line);
        double t0, wall;
        pid_t pid;
        int st, pfd[2], clues = -1;
        struct rusage ru;
        double cpu;

        if (len && line[len-1] == '\n') line[--len] = '\0';
        key = p;  while (*p && *p != '\t') p++;  if (*p) *p++ = '\0';
        spec = p; while (*p && *p != '\t') p++;  if (*p) *p++ = '\0';
        seed = p;

        par = default_params();
        decode_params(par, spec);
        enc = encode_params(par, true);
        if ((err = validate_params(par, true))) {
            printf("%s\t%s\t%s\treject\t0\t0\t-1\t%s\n", key, spec, seed, enc);
            sfree(enc);
            free_params(par);
            continue;
        }

        if (pipe(pfd)) return 1;
        t0 = now();
        pid = fork();
        if (pid == 0) {
            struct rlimit rl;
            random_state *rs;
            char *aux = NULL, *desc;
            int cr = par->c * par->r, area = cr * cr, i, n = 0;
            digit *g;
            close(pfd[0]);
            rl.rlim_cur = cap; rl.rlim_max = cap + 2;
            setrlimit(RLIMIT_CPU, &rl);
            alarm(cap * 4 + 5);
            rs = random_new(seed, strlen(seed));
            desc = new_game_desc(par, rs, &aux, false);
            g = snewn(area, digit);
            spec_to_grid(desc, g, area);
            for (i = 0; i < area; i++) if (g[i]) n++;
            write(pfd[1], &n, sizeof n);
            _exit(desc ? 0 : 1);
        }
        close(pfd[1]);
        wait4(pid, &st, 0, &ru);
        wall = now() - t0;
        cpu = ru.ru_utime.tv_sec + ru.ru_utime.tv_usec * 1e-6
            + ru.ru_stime.tv_sec + ru.ru_stime.tv_usec * 1e-6;
        if (read(pfd[0], &clues, sizeof clues) != sizeof clues) clues = -1;
        close(pfd[0]);

        {
            const char *verdict;
            if (WIFEXITED(st) && WEXITSTATUS(st) == 0) verdict = "ok";
            else if (WIFSIGNALED(st) &&
                     (WTERMSIG(st) == SIGXCPU || WTERMSIG(st) == SIGKILL ||
                      WTERMSIG(st) == SIGALRM)) verdict = "timeout";
            else verdict = "crash";
            printf("%s\t%s\t%s\t%s\t%.3f\t%.3f\t%d\t%s\n",
                   key, spec, seed, verdict, wall, cpu, clues, enc);
        }
        sfree(enc);
        free_params(par);
    }
    return 0;
}
