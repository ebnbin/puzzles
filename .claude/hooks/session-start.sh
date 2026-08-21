#!/bin/bash
# Claude Code on the web 的容器每次都是新克隆,node_modules 得现装;本地开发环境不碰。
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

npm install --no-audit --no-fund
