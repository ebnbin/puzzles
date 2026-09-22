#!/bin/bash
# SessionStart 在 resume 与 compact 时也会触发，本脚本只准备环境，不得切换分支。
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --unshallow origin || echo "session-start: unshallow 失败，稍后手动 git fetch --unshallow origin" >&2
fi

# 作者是用户，提交者保持容器的 Claude 身份：只设 author.*，不改 user.*
git config author.name "Bin Zhang"
git config author.email "ebnbin@gmail.com"

git config core.hooksPath "$(git rev-parse --show-toplevel)/.claude/hooks/git"

npm install --no-audit --no-fund --no-save
