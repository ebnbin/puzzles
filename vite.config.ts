import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 构建期跑数据的不变量,挂在配置加载时,dev 和 build 都拦:
// 注册表和 games.json 对账、深色申报的规矩;两份文案 JSON 的键集与占位符对账。
// 写全 index:裸的 ./src/games 会被解析成 src/games.json。
import { GAMES } from './src/games/index'
import { verifyGames } from './src/games/util/verify'
import { verifyStrings } from './src/i18n/verify'
import games from './src/games.json'
import en from './src/i18n/en.json'
import zh from './src/i18n/zh.json'

const bad = [...verifyGames(GAMES, games), ...verifyStrings(en, zh)]
if (bad.length > 0) {
  for (const line of bad) console.error(`FAIL  ${line}`)
  throw new Error(`static data check failed (${bad.length})`)
}

// 版本号 = 这份构建的 commit,截成 GitHub 短 SHA 的 7 位(src/version.ts 拿它拼 URL)。
// Vercel 的构建目录不保证是可用的 git 仓库,它注入的环境变量才准,git 只是本地回落;
// 两头都没有就留空,设置里那行不出现——读不到版本号不许让 build 挂。
function buildCommit(): string {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (sha === '') {
    try {
      sha = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    } catch {
      sha = ''
    }
  }
  return sha.trim().slice(0, 7)
}

export default defineConfig({
  plugins: [react()],
  define: { __COMMIT__: JSON.stringify(buildCommit()) },
})
