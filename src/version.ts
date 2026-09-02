// __COMMIT__ 由 vite.config.ts 的 define 在构建期换成字面量;拿不到 commit 时是空串,
// 界面据此不显示版本(空串拼出的 URL 是 GitHub 的 404)。
declare const __COMMIT__: string

export const COMMIT = __COMMIT__

export const COMMIT_URL = `https://github.com/ebnbin/puzzles/commit/${COMMIT}`
