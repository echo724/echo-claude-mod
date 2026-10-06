import type { Block, Falling, Well } from '../types'

export const WELL_COLUMNS = 10
export const WELL_ROWS = 10
/** A cell is a hundredth of the context window. */
export const WELL_CELLS = WELL_COLUMNS * WELL_ROWS

const PIECE_CELLS = 4
const FLASH_FRAMES = 3
// A dip under this many cells is the window settling, not a compaction.
const CLEAR_CELLS = 5
// A backlog this long drops a row faster for each such stretch.
const HURRY_CELLS = 8

type Cells = Falling['cells']
type Rows = Well['rows']

const NO_ROWS: Rows = Array.from({ length: WELL_ROWS }, () =>
  Array.from({ length: WELL_COLUMNS }, () => null),
)

export const EMPTY_WELL: Well = {
  rows: NO_ROWS,
  falling: null,
  owed: 0,
  flash: 0,
  clearTo: 0,
  seed: 1,
  tokens: null,
  window: 0,
  added: null,
  turn: 0,
  limit: null,
  limitFor: 0,
}

const TETROMINOES: { block: Block; cells: Cells }[] = [
  { block: 'I', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { block: 'O', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { block: 'T', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { block: 'S', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { block: 'Z', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { block: 'J', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { block: 'L', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
]
// What a turn adds past its last whole tetromino, by how many cells that is.
const BITS: Cells[][] = [
  [],
  [[[0, 0]]],
  [[[0, 0], [1, 0]]],
  [[[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 1]]],
]

/** A number from 0 up to 1 off the seed, and the seed that follows. */
const drawn = (seed: number): [number, number] => {
  const next = (seed + 0x6d2b79f5) | 0
  let mixed = Math.imul(next ^ (next >>> 15), 1 | next)
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed

  return [((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, next]
}

/** A quarter turn, moved back against the top left. */
const turned = (cells: Cells): Cells => {
  const spun = cells.map(([x, y]): [number, number] => [-y, x])
  const left = Math.min(...spun.map(([x]) => x))

  return spun
    .map(([x, y]): [number, number] => [x - left, y])
    .sort(([ax, ay], [bx, by]) => ay - by || ax - bx)
}

/** Every way up a piece can be, each once. */
const turnsOf = (cells: Cells): Cells[] => {
  const turns = [cells, turned(cells), turned(turned(cells)), turned(turned(turned(cells)))]
  const seen = new Set<string>()

  return turns.filter(turn => {
    const key = JSON.stringify([...turn].sort(([ax, ay], [bx, by]) => ay - by || ax - bx))

    return seen.has(key) ? false : (seen.add(key), true)
  })
}

const isFree = (rows: Rows, cells: Cells, column: number, row: number): boolean =>
  cells.every(([x, y]) => {
    const at = row + y

    // Above the well a piece is still on its way in.
    return at < WELL_ROWS && (at < 0 || rows[at]?.[column + x] === null)
  })

/** Where a piece let go over a column comes to rest, and how good a fit that is. */
const landingOf = (rows: Rows, cells: Cells, column: number) => {
  const height = Math.max(...cells.map(([, y]) => y)) + 1
  let rest = -height

  while (isFree(rows, cells, column, rest + 1)) {
    rest += 1
  }

  // Empty cells a piece roofs over stay empty: the holes of a real game.
  const holes = cells.filter(([x, y]) => {
    const under = rest + y + 1
    const isOwn = cells.some(([ox, oy]) => ox === x && oy === y + 1)

    return !isOwn && under < WELL_ROWS && rows[under]?.[column + x] === null
  }).length

  return { cells, column, rest, cost: holes * 3 + (WELL_ROWS - rest) }
}

const filled = (rows: Rows, cells: Cells, column: number, row: number, block: Block): Rows =>
  rows.map((line, at) =>
    line.map((cell, across) =>
      cells.some(([x, y]) => row + y === at && column + x === across) ? block : cell,
    ),
  )

/** The well with this many cells settled, as one grey floor from the bottom up. */
const floorOf = (cells: number): Rows =>
  NO_ROWS.map((line, row) =>
    line.map((_, column) =>
      (WELL_ROWS - 1 - row) * WELL_COLUMNS + column < cells ? 'floor' : null,
    ),
  )

/** Cells with no room to fall into go to the lowest gaps, so the count holds. */
const packed = (rows: Rows, cells: number, block: Block): Rows => {
  let left = cells

  return rows
    .toReversed()
    .map(line => line.map(cell => (cell === null && left-- > 0 ? block : cell)))
    .toReversed()
}

const heldOf = (well: Well): number =>
  well.flash > 0
    ? well.clearTo
    : well.rows.flat().filter(cell => cell !== null).length +
      (well.falling?.cells.length ?? 0) +
      well.owed

/** Whether the well has a frame still to play. */
export const isMoving = (well: Well): boolean =>
  well.flash > 0 || well.falling !== null || well.owed > 0

/**
 * The well after a reading of the window: what a turn added is owed as
 * pieces, and a fall of the fill (a compaction, `/clear`) clears the lines.
 * `tokens` is absent until the window's first response, which empties it.
 */
export const measured = (
  well: Well,
  context: { tokens?: number; window: number },
): Well => {
  const { tokens, window } = context
  const target =
    tokens === undefined || window <= 0
      ? 0
      : Math.min(WELL_CELLS, Math.round((tokens / window) * WELL_CELLS))
  const held = heldOf(well)
  const now: Well = {
    ...well,
    tokens: tokens ?? null,
    window,
    added: tokens === undefined || well.tokens === null ? null : tokens - well.tokens,
    turn: tokens === undefined ? well.turn : well.turn + 1,
  }

  if (well.flash > 0) {
    return { ...now, clearTo: target }
  }

  // What was there before the first reading is no turn's: it is the floor.
  if (held === 0) {
    return { ...now, rows: floorOf(target) }
  }

  if (target >= held) {
    return { ...now, owed: well.owed + target - held }
  }

  return held - target < CLEAR_CELLS && target > 0
    ? now
    : { ...now, falling: null, owed: 0, flash: FLASH_FRAMES, clearTo: target }
}

/** Lets go of the next piece owed, over the column it fits best or near it. */
const launched = (well: Well): Well => {
  const size = Math.min(PIECE_CELLS, well.owed)
  const [pick, afterPick] = drawn(well.seed)
  const [luck, seed] = drawn(afterPick)
  const shapes =
    size === PIECE_CELLS
      ? TETROMINOES
      : (BITS[size] ?? []).map(cells => ({ block: 'bit' as const, cells }))
  const shape = shapes[Math.floor(pick * shapes.length)]
  const owed = well.owed - size

  if (shape === undefined) {
    return { ...well, owed, seed }
  }

  const landings = turnsOf(shape.cells)
    .flatMap(cells => {
      const width = Math.max(...cells.map(([x]) => x)) + 1

      return Array.from({ length: WELL_COLUMNS - width + 1 }, (_, column) =>
        landingOf(well.rows, cells, column),
      )
    })
    .filter(landing => landing.rest >= 0)
    .sort((a, b) => a.cost - b.cost)
  // Not always the best fit: a player who never slips leaves no holes.
  const landing = landings[luck < 0.6 ? 0 : luck < 0.9 ? 1 : 2] ?? landings[0]

  if (landing === undefined) {
    return { ...well, owed, seed, rows: packed(well.rows, size, shape.block) }
  }

  const height = Math.max(...landing.cells.map(([, y]) => y)) + 1

  return {
    ...well,
    owed,
    seed,
    falling: {
      block: shape.block,
      cells: landing.cells,
      column: landing.column,
      row: 1 - height,
      rest: landing.rest,
    },
  }
}

/** The well a frame on: a clear flashes out, a piece falls a row, the next lets go. */
export const stepped = (well: Well): Well => {
  if (well.flash > 0) {
    return well.flash > 1
      ? { ...well, flash: well.flash - 1 }
      : { ...well, flash: 0, rows: floorOf(well.clearTo) }
  }

  const { falling } = well

  if (falling === null) {
    return well.owed > 0 ? launched(well) : well
  }

  const row = Math.min(falling.rest, falling.row + 1 + Math.floor(well.owed / HURRY_CELLS))

  return row < falling.rest
    ? { ...well, falling: { ...falling, row } }
    : {
        ...well,
        falling: null,
        rows: filled(well.rows, falling.cells, falling.column, row, falling.block),
      }
}

/** The well as it looks now: what has settled, and the piece in the air over it. */
export const viewOf = (well: Well): Rows =>
  well.falling === null
    ? well.rows
    : filled(
        well.rows,
        well.falling.cells,
        well.falling.column,
        well.falling.row,
        well.falling.block,
      )

/** A count of tokens in at most four characters: `940`, `3.1k`, `84k`, `1M`. */
export const tokensOf = (tokens: number): string => {
  const size = Math.abs(tokens)

  if (size < 1000) {
    return String(tokens)
  }

  if (size < 9950) {
    return `${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }

  return size < 999_500
    ? `${Math.round(tokens / 1000)}k`
    : `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}
