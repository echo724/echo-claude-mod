/** The clock face, in braille dots: two across and four down in each cell. */
export const FACE_COLUMNS = 10
export const FACE_ROWS = 5

const DOTS_ACROSS = FACE_COLUMNS * 2
const DOTS_DOWN = FACE_ROWS * 4
const CENTER = (DOTS_ACROSS - 1) / 2
const RIM = CENTER
const RIM_WIDTH = 1
const DIAL = RIM - 2
const HAND_WIDTH = 0.7
const BRAILLE = 0x2800
// A cell's dots as bits, by column then row.
const BITS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
] as const

/**
 * A kitchen timer's dial for the share of the phase still left: a rim, a
 * hand that turns clockwise from twelve as time runs, and the time left
 * shaded from the hand round to twelve.
 */
export const faceOf = (left: number): string[] => {
  const turned = (1 - left) * 2 * Math.PI

  const isLit = (x: number, y: number): boolean => {
    const dx = x - CENTER
    const dy = y - CENTER
    const reach = Math.hypot(dx, dy)

    if (reach > RIM - RIM_WIDTH) {
      return reach <= RIM + 0.3
    }

    if (reach > DIAL) {
      return false
    }

    // Clockwise from twelve, 0 to a full turn.
    const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI)
    const offHand = Math.abs(reach * Math.sin(angle - turned))
    const isOnHand = offHand <= HAND_WIDTH && Math.cos(angle - turned) > 0

    return isOnHand || reach < 1 || (angle > turned && (x + y) % 2 === 0)
  }

  return Array.from({ length: FACE_ROWS }, (_, row) =>
    Array.from({ length: FACE_COLUMNS }, (_, column) => {
      let bits = 0

      for (let across = 0; across < 2; across += 1) {
        for (let down = 0; down < 4; down += 1) {
          if (isLit(column * 2 + across, row * 4 + down)) {
            bits |= BITS[across]?.[down] ?? 0
          }
        }
      }

      return String.fromCodePoint(BRAILLE + bits)
    }).join(''),
  )
}
