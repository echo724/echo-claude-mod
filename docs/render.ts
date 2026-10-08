// Draws docs/echo-widget.svg from the mod's own output:
//   bun docs/render.ts > docs/echo-widget.svg
// Dots are circles and letters sit a cell apart, so nothing leans on a font
// keeping braille and box characters one width.
import { calendarLines } from '../mods/echo-widget/hooks/calendar'
import { toggled } from '../mods/echo-widget/hooks/pomodoro'
import { pomodoroLines } from '../mods/echo-widget/hooks/pomodoro-widget'
import {
  boxMarks,
  CELL_WIDTH,
  columnsOf,
  DARK,
  FONT,
  LINE_HEIGHT,
  rowsOf,
  styleOf,
} from '../mods/echo-widget/hooks/svg'
import {
  EMPTY_WELL,
  isMoving,
  measured,
  resized,
  stepped,
} from '../mods/echo-widget/hooks/tetris'
import { wellLines } from '../mods/echo-widget/hooks/tetris-widget'
import type { Well } from '../mods/echo-widget/types'
import { centered } from '../mods/echo-widget/hooks/widget'
import type { Line } from '../mods/echo-widget/hooks/widget'

const PADDING = 18

const MINUTE_MS = 60_000
const timer = toggled(null, 0, { focus: 25, break: 5 })
const WINDOW = 200_000
const month = calendarLines('2026-10-05')
// A session eight turns in, the last turn's piece still on its way down.
const well = [0.12, 0.15, 0.21, 0.3, 0.42, 0.5, 0.57, 0.63].reduce<Well>(
  (held, share, turn, shares) => {
    let now = measured(held, { tokens: share * WINDOW, window: WINDOW })

    while (isMoving(now) && (turn < shares.length - 1 || (now.falling?.row ?? 0) < 1)) {
      now = stepped(now)
    }

    return now
  },
  { ...resized(EMPTY_WELL, month.length * 2), limit: 167_000 },
)
// Every box is the calendar's height, its lines in the middle.
const widgets: Line[][] = [pomodoroLines(timer, 7.5 * MINUTE_MS), month, wellLines(well)].map(
  lines => centered(lines, month.length),
)

const rows = Math.max(...widgets.map(rowsOf))
const marks: string[] = []
let column = 0

for (const lines of widgets) {
  const left = PADDING + column * CELL_WIDTH
  // Boxes stand on one bottom line.
  const top = PADDING + (rows - rowsOf(lines)) * LINE_HEIGHT

  marks.push(...boxMarks(lines, 'inactive', left, top))
  column += columnsOf(lines) + 1
}

const width = PADDING * 2 + (column - 1) * CELL_WIDTH
const height = PADDING * 2 + rows * LINE_HEIGHT

console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="A pomodoro timer dial at 17:30 of focus round 1, and the calendar of October 2026 with the 5th marked, and the context window as a well of Tetris blocks at 63%, each in a rounded box">
${styleOf(DARK)}
<rect width="${width}" height="${height}" rx="10" class="f-paper"/>
<g font-family="${FONT}" font-size="14.5" text-anchor="middle">
${marks.join('\n')}
</g>
</svg>`)
