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
