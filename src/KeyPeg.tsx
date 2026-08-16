// 颜色钉:区域 A 的键盘和方向键那块共用一个画法。颜色是引擎调色板给的 CSS 串,
// 谁调用谁负责查表——这里只管画。fill 没查到就返回 null,让调用方回落到文字。
export default function KeyPeg({
  fill,
  ink,
  label,
  dotted,
}: {
  fill: string | undefined
  ink?: string
  label?: string
  dotted?: boolean
}) {
  if (!fill) return null
  return (
    <span
      className="key-peg"
      data-dotted={dotted ? '' : undefined}
      style={{
        [dotted ? 'color' : 'background']: fill,
        borderColor: ink ?? 'transparent',
        ...(dotted ? {} : { color: ink }),
      }}
    >
      {label}
    </span>
  )
}
