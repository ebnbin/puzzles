// 占位符填充。独立成文件是硬约束:games/ 在构建期被 vite.config 载入 node 跑数据校验,那条链上
// 不能出现 index.ts(模块顶层碰 document)。占位符写作 {name};没供值的原样留着。
export const fill = (
  template: string,
  args: Record<string, string | number>,
): string =>
  template.replace(/\{(\w+)\}/g, (found, key: string) =>
    key in args ? String(args[key]) : found,
  )
