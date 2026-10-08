import type { Line } from './widget'

export const CELL_WIDTH = 9
export const LINE_HEIGHT = 19
export const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export type Palette = Record<string, string>

export const DARK: Palette = {
  paper: '#262624',
  text: '#e6e4dc',
  inactive: '#8c8a84',
  error: '#e5626b',
  success: '#6dbf6a',
  claude: '#d97757',
  suggestion: '#7aa2ff',
  warning: '#e0b34c',
  planMode: '#4fb3b3',
  merged: '#a98bf0',
}

export const LIGHT: Palette = {
  paper: '#faf9f5',
  text: '#2b2a27',
  inactive: '#8c8a84',
  error: '#c4373f',
  success: '#2e8b3a',
  claude: '#c1603f',
  suggestion: '#3b6fd8',
  warning: '#a87708',
  planMode: '#23807f',
  merged: '#7b5cd6',
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

const keyOf = (key: string | undefined): string =>
  key !== undefined && key in DARK ? key : 'paper'

const rulesOf = (palette: Palette): string =>
  Object.entries(palette)
    .map(([key, hex]) => `.f-${key}{fill:${hex}}.s-${key}{stroke:${hex}}`)
    .join('')

export const styleOf = (light: Palette, dark?: Palette): string =>
  `<style>${rulesOf(light)}${dark === undefined ? '' : `@media (prefers-color-scheme: dark){${rulesOf(dark)}}`}</style>`

const lengthOf = (line: Line) => line.reduce((sum, span) => sum + [...span.text].length, 0)

export const columnsOf = (lines: Line[]): number => Math.max(0, ...lines.map(lengthOf)) + 4

export const rowsOf = (lines: Line[]): number => lines.length + 2

export const boxMarks = (lines: Line[], border: string, left: number, top: number): string[] => {
  const marks = [
    `<rect x="${left + CELL_WIDTH / 2}" y="${top + LINE_HEIGHT / 2}" width="${(columnsOf(lines) - 1) * CELL_WIDTH}" height="${(rowsOf(lines) - 1) * LINE_HEIGHT}" rx="6" fill="none" class="s-${keyOf(border)}" stroke-width="1.2"/>`,
  ]

  lines.forEach((line, row) => {
    const y = top + (row + 1) * LINE_HEIGHT
    let at = 2

    for (const span of line) {
      const color = keyOf(span.color ?? 'text')
      const cells = [...span.text]
      const x = left + at * CELL_WIDTH
      const letters: { cell: string; x: number }[] = []

      if (span.isInverse) {
        marks.push(
          `<rect x="${x - 1.5}" y="${y + 1.5}" width="${cells.length * CELL_WIDTH + 3}" height="${LINE_HEIGHT - 3}" rx="2" class="f-${color}"/>`,
        )
      }

      cells.forEach((cell, index) => {
        const cellX = x + index * CELL_WIDTH
        const code = cell.codePointAt(0) ?? 0

        if (code >= BRAILLE && code < BRAILLE + 256) {
          for (const [across, down, bit] of DOTS) {
            if ((code - BRAILLE) & bit) {
              marks.push(
                `<circle cx="${cellX + 2.5 + across * 4}" cy="${y + 3.6 + down * 4}" r="1.25" class="f-${color}"/>`,
              )
            }
          }
        } else if (cell === '█' || cell === '▀' || cell === '▄') {
          // A half block over a background is two cells of the well.
          const half = LINE_HEIGHT / 2
          const behind = span.background === undefined ? undefined : keyOf(span.background)
          const tones = [cell === '▄' ? behind : color, cell === '▀' ? behind : color]

          tones.forEach((tone, down) => {
            if (tone !== undefined) {
              marks.push(
                `<rect x="${cellX + 0.5}" y="${y + 0.5 + down * half}" width="${CELL_WIDTH - 1}" height="${half - 1}" rx="1" class="f-${tone}"/>`,
              )
            }
          })
        } else if (cell === '┊') {
          marks.push(
            `<line x1="${cellX + CELL_WIDTH / 2}" y1="${y}" x2="${cellX + CELL_WIDTH / 2}" y2="${y + LINE_HEIGHT}" class="s-${color}" stroke-width="1" stroke-dasharray="2 2.75"/>`,
          )
        } else if (cell === '━') {
          marks.push(
            `<rect x="${cellX}" y="${y + LINE_HEIGHT / 2 - 1.5}" width="${CELL_WIDTH}" height="3" class="f-${color}"/>`,
          )
        } else if (cell === '╌') {
          marks.push(
            `<rect x="${cellX + 1.5}" y="${y + LINE_HEIGHT / 2 - 0.6}" width="${CELL_WIDTH - 4}" height="1.2" class="f-${color}"/>`,
          )
        } else if (cell !== ' ') {
          letters.push({ cell, x: cellX + CELL_WIDTH / 2 })
        }
      })

      if (letters.length > 0) {
        const escaped = letters
          .map(letter => letter.cell)
          .join('')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        marks.push(
          `<text y="${y + LINE_HEIGHT * 0.72}" x="${letters.map(letter => letter.x).join(' ')}" class="f-${span.isInverse ? 'paper' : color}"${span.isBold ? ' font-weight="700"' : ''}>${escaped}</text>`,
        )
      }

      at += cells.length
    }
  })

  return marks
}

export const textOf = (lines: Line[]): string =>
  lines
    .map(line =>
      line
        .map(span => span.text)
        .join('')
        .replace(/[⠀-⣿─-▟]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(text => text !== '')
    .join(', ')

export const boxSvg = (
  lines: Line[],
  border: string,
  label: string,
): { source: string; width: number; height: number; alt: string } => {
  const width = columnsOf(lines) * CELL_WIDTH
  const height = rowsOf(lines) * LINE_HEIGHT
  const alt = `${label}: ${textOf(lines)}`
  const escaped = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escaped}">${styleOf(LIGHT, DARK)}<g font-family="${FONT}" font-size="14.5" text-anchor="middle">${boxMarks(lines, border, 0, 0).join('')}</g></svg>`

  return { source, width, height, alt }
}
