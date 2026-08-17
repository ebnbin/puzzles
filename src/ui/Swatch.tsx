// 色块钉:一个圆形颜色样本,可带描边、标签,或改画点状(铅笔态)。颜色是调用方
// 查好表的 CSS 串——这里只管画。fill 没查到就返回 null,让调用方回落到文字。
// class 名沿用已发布样式表的 .key-peg,不随组件改名。
export default function Swatch({
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
