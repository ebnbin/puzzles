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

export default defineConfig({
  plugins: [react()],
})
