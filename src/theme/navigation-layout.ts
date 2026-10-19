/** Geometry shared by navigation and scroll clearance; labels never shrink to fit. */
export function navigationLayout(
  width: number,
  fontScale: number,
  leftInset = 0,
  rightInset = 0,
) {
  const available = Math.max(0, width - leftInset - rightInset);
  const gutter = available < 400 ? 8 : available < 760 ? 12 : 24;
  const barWidth = Math.min(1040, Math.max(0, available - gutter * 2));
  const horizontal = barWidth / Math.max(1, fontScale) >= 720;
  const roomy = available >= 400;
  const labelSize = horizontal ? 16 : roomy ? 15 : 14;
  const lineHeight = horizontal ? 22 : 20;
  const height = horizontal
    ? 76
    : Math.ceil(68 + lineHeight * Math.max(1, fontScale) * 2);
  return {
    width: barWidth,
    left: leftInset + (available - barWidth) / 2,
    horizontal,
    labelSize,
    lineHeight,
    height,
    iconSize: horizontal ? 27 : roomy ? 29 : 28,
  };
}
