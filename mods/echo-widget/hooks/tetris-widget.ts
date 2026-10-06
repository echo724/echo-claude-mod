import type { Block, Well } from '../types'
import { tokensOf, viewOf, WELL_COLUMNS, WELL_ROWS } from './tetris'
import type { Line, Span } from './widget'

// The classic colors, as near as the theme has them.
const COLORS: Record<Block, string> = {
  I: 'planMode',
  O: 'warning',
  T: 'merged',
  S: 'success',
  Z: 'error',
  J: 'suggestion',
  L: 'claude',
  bit: 'text',
  floor: 'inactive',
}
const WARN_SHARE = 0.8
const OVER_SHARE = 0.95
const BESIDE_WIDTH = 9
// A row of dots at each of a braille cell's four heights, top to bottom.
const LIMIT_DOTS = ['⠉', '⠒', '⠤', '⣀'] as const
const DOT_ROWS = (WELL_ROWS / 2) * LIMIT_DOTS.length

/**
 * The context window as a well of blocks, a cell a hundredth of it, with the
 * figures beside it. A character holds two cells, one over the other, so the
 * well is half as many lines as it has rows. The dotted line is where
 * auto-compaction runs.
 */
export const wellLines = (well: Well): Line[] => {
  const { tokens, window, limit } = well
  const share = tokens === null || window <= 0 ? 0 : tokens / window
  const reach = limit === null || limit <= 0 ? share : (tokens ?? 0) / limit
  const tint = reach >= OVER_SHARE ? 'error' : reach >= WARN_SHARE ? 'warning' : 'inactive'
  const view = viewOf(well)
  // The limit's height, counted in dot rows from the top; none when it is off.
  const dot =
    limit === null || window <= 0 || limit >= window
      ? -1
      : Math.min(DOT_ROWS - 1, Math.max(0, Math.round((1 - limit / window) * DOT_ROWS)))
  const beside = [
    tokens === null ? '--%' : `${Math.round(share * 100)}%`,
    `${tokensOf(tokens ?? 0)}/${tokensOf(window)}`,
    well.added === null ? '' : `${well.added < 0 ? '' : '+'}${tokensOf(well.added)}`,
    `turn ${well.turn}`,
    reach >= OVER_SHARE ? 'GAME OVER' : 'CONTEXT',
  ]

  const colorOf = (block: Block): string => (well.flash > 0 ? 'text' : COLORS[block])

  const cellOf = (line: number, column: number): Span => {
    const top = view[line * 2]?.[column] ?? null
    const bottom = view[line * 2 + 1]?.[column] ?? null

    if (top === null && bottom === null) {
      return Math.floor(dot / LIMIT_DOTS.length) === line
        ? { text: LIMIT_DOTS[dot % LIMIT_DOTS.length] ?? ' ', color: tint }
        : { text: ' ' }
    }

    if (top === null || bottom === null) {
      return { text: top === null ? '▄' : '▀', color: colorOf(top ?? bottom ?? 'floor') }
    }

    return colorOf(top) === colorOf(bottom)
      ? { text: '█', color: colorOf(top) }
      : { text: '▀', color: colorOf(top), background: colorOf(bottom) }
  }

  return beside.map((text, line) => [
    { text: '┊', color: tint },
    ...Array.from({ length: WELL_COLUMNS }, (_, column) => cellOf(line, column)),
    { text: '┊', color: tint },
    {
      text: `  ${text.padEnd(BESIDE_WIDTH)}`,
      color: line === 0 ? (tint === 'inactive' ? 'text' : tint) : line === 4 ? tint : 'inactive',
      isBold: line === 0,
    },
  ])
}
