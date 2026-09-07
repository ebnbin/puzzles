#!/bin/bash
# 远程容器的全局身份是 Claude,并用 Claude 账号的钥匙给提交签名。GitHub 的贡献图
# 只看 author,签名校验只看 committer,所以只把 author 设成 owner:committer 留给
# Claude,签名才继续有效;改 user.* 会把两者一起换掉,签名变成 Invalid。
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
git config author.name "ebnbin"
git config author.email "ebnbin@gmail.com"
