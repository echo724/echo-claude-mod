/** A stretch of a widget's line in one style; `color` is a theme key. */
export type Span = {
  text: string
  color?: string
  /** A theme key behind the text: what shows through a half block. */
  background?: string
  isBold?: boolean
  isInverse?: boolean
}

/** One row of a widget's box. */
export type Line = Span[]

/** Lines set in the middle of a box this many rows tall, blank above and below. */
export const centered = (lines: Line[], rows: number): Line[] => {
  const above = Math.max(0, Math.floor((rows - lines.length) / 2))
  const below = Math.max(0, rows - lines.length - above)
  const blank = (count: number): Line[] => Array.from({ length: count }, () => [{ text: ' ' }])

  return [...blank(above), ...lines, ...blank(below)]
}
