// 占位符填充,独立成文件是硬约束:games/ 在构建期被 vite.config 载入 node 跑
// 数据校验,那条链上不能出现 index.ts(它在模块顶层就碰 document)。
// 占位符写作 {name};没供值的原样留着,坏模板一眼可见,好过悄悄吞掉。
export const fill = (
  template: string,
  args: Record<string, string | number>,
): string =>
  template.replace(/\{(\w+)\}/g, (found, key: string) =>
    key in args ? String(args[key]) : found,
  )
