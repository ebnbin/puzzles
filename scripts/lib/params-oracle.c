/*
 * params-oracle.c:scripts/check-params.mjs 的 C 侧。链接一个上游游戏,直接调用
 * configure / custom_params / validate_params(full=true),不生成棋盘。不进 vendor/,
 * 由 check-params.mjs 用 gcc 临时编译。
 *
 *   oracle --describe    打印 config box 的控件表(index / 类型 / label / 初值 / 选项)
 *                        与预设表(名字 / 编码参数)
 *   oracle < lines       每行一组控件值(tab 分隔,按控件序;boolean 0/1,choices 下标,
 *                        string 原文),每行答 ok<TAB>encoded 或 err<TAB>message
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "puzzles.h"

extern const game thegame;

static void describe_presets(struct preset_menu *menu, int depth)
{
    int i;
    for (i = 0; i < menu->n_entries; i++) {
        struct preset_menu_entry *e = &menu->entries[i];
        if (e->submenu) {
            printf("presetgroup\t%d\t%s\n", depth, e->title);
            describe_presets(e->submenu, depth + 1);
        } else {
            char *enc = thegame.encode_params(e->params, true);
            printf("preset\t%d\t%s\t%s\n", depth, e->title, enc);
            sfree(enc);
        }
    }
}

static void describe(void)
{
    game_params *dp = thegame.default_params();
    config_item *cfg = thegame.configure(dp);
    char *enc = thegame.encode_params(dp, true);
    int i;

    printf("default\t%s\n", enc);
    sfree(enc);
    for (i = 0; cfg[i].type != C_END; i++) {
        switch (cfg[i].type) {
          case C_STRING:
            printf("control\t%d\tS\t%s\t%s\n", i, cfg[i].name,
                   cfg[i].u.string.sval);
            break;
          case C_BOOLEAN:
            printf("control\t%d\tB\t%s\t%d\n", i, cfg[i].name,
                   cfg[i].u.boolean.bval ? 1 : 0);
            break;
          case C_CHOICES:
            printf("control\t%d\tC\t%s\t%d\t%s\n", i, cfg[i].name,
                   cfg[i].u.choices.selected, cfg[i].u.choices.choicenames);
            break;
        }
    }
    free_cfg(cfg);
    thegame.free_params(dp);

    if (thegame.preset_menu) {
        struct preset_menu *menu = thegame.preset_menu();
        describe_presets(menu, 0);
        (void)menu; /* 静态于 midend.c,进程即退,不释放 */
    } else {
        char *name;
        game_params *p;
        for (i = 0; thegame.fetch_preset(i, &name, &p); i++) {
            char *enc2 = thegame.encode_params(p, true);
            printf("preset\t0\t%s\t%s\n", name, enc2);
            sfree(enc2);
            sfree(name);
            thegame.free_params(p);
        }
    }
}

int main(int argc, char **argv)
{
    char line[4096];
    game_params *dp;
    config_item *cfg;
    int n, i;

    if (argc > 1 && !strcmp(argv[1], "--describe")) {
        describe();
        return 0;
    }

    dp = thegame.default_params();
    cfg = thegame.configure(dp);
    for (n = 0; cfg[n].type != C_END; n++);

    while (fgets(line, sizeof line, stdin)) {
        char *p = line, *field;
        game_params *params;
        const char *err;
        size_t len = strlen(line);
        if (len && line[len-1] == '\n') line[--len] = '\0';
        for (i = 0; i < n; i++) {
            field = p;
            while (*p && *p != '\t') p++;
            if (*p) *p++ = '\0';
            switch (cfg[i].type) {
              case C_STRING:
                sfree(cfg[i].u.string.sval);
                cfg[i].u.string.sval = dupstr(field);
                break;
              case C_BOOLEAN:
                cfg[i].u.boolean.bval = atoi(field) != 0;
                break;
              case C_CHOICES:
                cfg[i].u.choices.selected = atoi(field);
                break;
            }
        }
        params = thegame.custom_params(cfg);
        err = thegame.validate_params(params, true);
        if (err) {
            printf("err\t%s\n", err);
        } else {
            char *enc = thegame.encode_params(params, true);
            printf("ok\t%s\n", enc);
            sfree(enc);
        }
        thegame.free_params(params);
    }
    free_cfg(cfg);
    thegame.free_params(dp);
    return 0;
}
