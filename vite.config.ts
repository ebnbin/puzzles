import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 构建期跑注册表的不变量(games/ 不碰 DOM,node 里可直接 import):
// 注册表和 games.json 对账、深色申报的规矩。挂在配置加载时,dev 和 build 都拦。
// 写全 index:裸的 ./src/games 会被解析成 src/games.json。
import { GAMES } from './src/games/index'
import { verifyGames } from './src/games/util/verify'
import games from './src/games.json'

const bad = verifyGames(GAMES, games)
if (bad.length > 0) {
  for (const line of bad) console.error(`FAIL  ${line}`)
  throw new Error(`games registry check failed (${bad.length})`)
}

export default defineConfig({
  plugins: [react()],
})
