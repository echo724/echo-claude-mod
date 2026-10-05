import type { Line, Span } from './widget'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
const WIDTH = WEEKDAYS.length * 3 - 1

// Sunday and Saturday stand out, as on a wall calendar.
const colorOf = (weekday: number): string =>
  weekday === 0 ? 'error' : weekday === 6 ? 'suggestion' : 'text'

/** The month `today` (`2026-10-05`) falls in, a week a row, today marked. */
export const calendarLines = (today: string): Line[] => {
  const [year = 1970, month = 1, date = 1] = today.split('-').map(Number)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const days = new Date(year, month, 0).getDate()
  const title = `${MONTHS[month - 1]} ${year}`
  const weeks = Math.ceil((firstWeekday + days) / WEEKDAYS.length)

  const cellOf = (week: number, weekday: number): Span[] => {
    const day = week * WEEKDAYS.length + weekday - firstWeekday + 1
    const gap: Span[] = weekday === 0 ? [] : [{ text: ' ' }]

    if (day < 1 || day > days) {
      return [...gap, { text: '  ' }]
    }

    const text = String(day).padStart(2)

    return day === date
      ? [...gap, { text, color: 'claude', isBold: true, isInverse: true }]
      : [...gap, { text, color: colorOf(weekday) }]
  }

  return [
    [
      {
        text: title.padStart(Math.floor((WIDTH + title.length) / 2)).padEnd(WIDTH),
        isBold: true,
      },
    ],
    WEEKDAYS.flatMap((name, weekday) => [
      ...(weekday === 0 ? [] : [{ text: ' ' }]),
      { text: name, color: weekday === 0 || weekday === 6 ? colorOf(weekday) : 'inactive' },
    ]),
    ...Array.from({ length: weeks }, (_, week) =>
      WEEKDAYS.flatMap((_, weekday) => cellOf(week, weekday)),
    ),
  ]
}
