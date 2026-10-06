// Draws docs/echo-widget.svg from the mod's own output:
//   bun docs/render.ts > docs/echo-widget.svg
// Dots are circles and letters sit a cell apart, so nothing leans on a font
// keeping braille and box characters one width.
import { calendarLines } from '../mods/echo-widget/hooks/calendar'
import { toggled } from '../mods/echo-widget/hooks/pomodoro'
import { pomodoroLines } from '../mods/echo-widget/hooks/pomodoro-widget'
import type { Line } from '../mods/echo-widget/hooks/widget'

const CELL_WIDTH = 9
const LINE_HEIGHT = 19
const PADDING = 18
const BACKGROUND = '#262624'
// Stand-ins for the theme keys the mod names.
const COLORS: Record<string, string> = {
  text: '#e6e4dc',
  inactive: '#8c8a84',
  error: '#e5626b',
  success: '#6dbf6a',
  claude: '#d97757',
  suggestion: '#7aa2ff',
}
const BRAILLE = 0x2800
// A braille cell's dots: column, row, bit.
const DOTS = [
  [0, 0, 0x01],
  [0, 1, 0x02],
  [0, 2, 0x04],
  [0, 3, 0x40],
  [1, 0, 0x08],
  [1, 1, 0x10],
  [1, 2, 0x20],
  [1, 3, 0x80],
] as const

const MINUTE_MS = 60_000
const timer = toggled(null, 0, { focus: 25, break: 5 })
const widgets: Line[][] = [
  pomodoroLines(timer, 7.5 * MINUTE_MS),
  calendarLines('2026-10-05'),
]

const lengthOf = (line: Line) =>
  line.reduce((sum, span) => sum + [...span.text].length, 0)
// A box is its content, a cell of padding each side, and its border.
const boxes = widgets.map(lines => ({
  lines,
  columns: Math.max(...lines.map(lengthOf)) + 4,
  rows: lines.length + 2,
}))
const rows = Math.max(...boxes.map(box => box.rows))
const marks: string[] = []
let column = 0

for (const box of boxes) {
  const left = PADDING + column * CELL_WIDTH
  // Boxes stand on one bottom line.
  const top = PADDING + (rows - box.rows) * LINE_HEIGHT

  marks.push(
    `<rect x="${left + CELL_WIDTH / 2}" y="${top + LINE_HEIGHT / 2}" width="${(box.columns - 1) * CELL_WIDTH}" height="${(box.rows - 1) * LINE_HEIGHT}" rx="6" fill="none" stroke="${COLORS.inactive}" stroke-width="1.2"/>`,
  )

  box.lines.forEach((line, row) => {
    const y = top + (row + 1) * LINE_HEIGHT
    let at = 2

    for (const span of line) {
      const color = COLORS[span.color ?? 'text'] ?? BACKGROUND
      const cells = [...span.text]
      const x = left + at * CELL_WIDTH
      const letters: { cell: string; x: number }[] = []

      if (span.isInverse) {
        marks.push(
          `<rect x="${x - 1.5}" y="${y + 1.5}" width="${cells.length * CELL_WIDTH + 3}" height="${LINE_HEIGHT - 3}" rx="2" fill="${color}"/>`,
        )
      }

      cells.forEach((cell, index) => {
        const cellX = x + index * CELL_WIDTH
        const code = cell.codePointAt(0) ?? 0

        if (code >= BRAILLE && code < BRAILLE + 256) {
          for (const [across, down, bit] of DOTS) {
            if ((code - BRAILLE) & bit) {
              marks.push(
                `<circle cx="${cellX + 2.5 + across * 4}" cy="${y + 3.6 + down * 4}" r="1.25" fill="${color}"/>`,
              )
            }
          }
        } else if (cell === '━') {
          marks.push(
            `<rect x="${cellX}" y="${y + LINE_HEIGHT / 2 - 1.5}" width="${CELL_WIDTH}" height="3" fill="${color}"/>`,
          )
        } else if (cell === '╌') {
          marks.push(
            `<rect x="${cellX + 1.5}" y="${y + LINE_HEIGHT / 2 - 0.6}" width="${CELL_WIDTH - 4}" height="1.2" fill="${color}"/>`,
          )
        } else if (cell !== ' ') {
          letters.push({ cell, x: cellX + CELL_WIDTH / 2 })
        }
      })

      if (letters.length > 0) {
        marks.push(
          `<text y="${y + LINE_HEIGHT * 0.72}" x="${letters.map(letter => letter.x).join(' ')}" fill="${span.isInverse ? BACKGROUND : color}"${span.isBold ? ' font-weight="700"' : ''}>${letters.map(letter => letter.cell).join('')}</text>`,
        )
      }

      at += cells.length
    }
  })

  column += box.columns + 1
}

const width = PADDING * 2 + (column - 1) * CELL_WIDTH
const height = PADDING * 2 + rows * LINE_HEIGHT

console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="A pomodoro timer dial at 17:30 of focus round 1, and the calendar of October 2026 with the 5th marked, each in a rounded box">
<rect width="${width}" height="${height}" rx="10" fill="${BACKGROUND}"/>
<g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14.5" text-anchor="middle">
${marks.join('\n')}
</g>
</svg>`)
