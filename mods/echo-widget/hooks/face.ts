/** The dial, in braille dots: two across and four down in each cell. */
export const FACE_COLUMNS = 10
export const FACE_ROWS = 5

const CENTER = FACE_COLUMNS - 0.5
const TICK_REACH = CENTER - 0.2
const DISK_REACH = CENTER - 3
const HUB_REACH = 1.2
const HAND_WIDTH = 0.6
const HOURS = 12
const BRAILLE = 0x2800
// A cell's dots as bits, by column then row.
const BITS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
] as const

/** What a cell of the dial shows: the hand, the time left, or the scale. */
export type Part = 'hand' | 'left' | 'tick'

/** Cells side by side that share a part, so one color draws them. */
export type Run = { part: Part; text: string }

// The scale round the rim: a dot an hour, a second one inward at each quarter.
const TICKS = new Set(
  Array.from({ length: HOURS }, (_, hour) => {
    const angle = (hour / HOURS) * 2 * Math.PI
    const at = (reach: number) =>
      `${Math.round(CENTER + reach * Math.sin(angle))},${Math.round(CENTER - reach * Math.cos(angle))}`

    return hour % 3 === 0 ? [at(TICK_REACH), at(TICK_REACH - 1)] : [at(TICK_REACH)]
  }).flat(),
)

/**
 * A visual timer's dial for the share of the phase still left: a disk that
 * is solid for the time left and empties clockwise from twelve as time runs,
 * a hand on its moving edge, and a scale of dots round the rim.
 *
 * A cell has one color: the hand's where it crosses, else the disk's, else
 * the scale's. The scale's dots show in every cell, in that cell's color.
 */
export const faceOf = (left: number): Run[][] => {
  const turned = (1 - left) * 2 * Math.PI

  const partOf = (x: number, y: number): Part | undefined => {
    const dx = x - CENTER
    const dy = y - CENTER
    const reach = Math.hypot(dx, dy)

    if (TICKS.has(`${x},${y}`)) {
      return 'tick'
    }

    if (reach > DISK_REACH) {
      return undefined
    }

    // Clockwise from twelve, 0 to a full turn.
    const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI)
    const offHand = Math.abs(reach * Math.sin(angle - turned))
    const isOnHand = offHand <= HAND_WIDTH && Math.cos(angle - turned) > 0

    if (isOnHand || reach < HUB_REACH) {
      return 'hand'
    }

    return angle > turned ? 'left' : undefined
  }

  const cellOf = (column: number, row: number): Run => {
    const dots = BITS.flatMap((bits, across) =>
      bits.map((bit, down) => ({
        bit,
        part: partOf(column * 2 + across, row * 4 + down),
      })),
    )
    const has = (part: Part) => dots.some(dot => dot.part === part)
    const part: Part = has('hand') ? 'hand' : has('left') ? 'left' : 'tick'
    const bits = dots
      .filter(dot => dot.part === part || dot.part === 'tick')
      .reduce((sum, dot) => sum | dot.bit, 0)

    return { part, text: String.fromCodePoint(BRAILLE + bits) }
  }

  return Array.from({ length: FACE_ROWS }, (_, row) =>
    Array.from({ length: FACE_COLUMNS }, (_, column) => cellOf(column, row)).reduce<
      Run[]
    >((runs, cell) => {
      const last = runs.at(-1)

      return last?.part === cell.part
        ? [...runs.slice(0, -1), { part: cell.part, text: last.text + cell.text }]
        : [...runs, cell]
    }, []),
  )
}
