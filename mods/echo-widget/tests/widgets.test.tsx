import { expect, mock, test } from 'claude-code/testing'

import { calendarLines } from '../hooks/calendar'
import { DISK, FACE_COLUMNS, FACE_ROWS, faceOf, TICKS } from '../hooks/face'
import type { Run } from '../hooks/face'
import { EMPTY_LOG, logged, toggled } from '../hooks/pomodoro'
import { pomodoroLines } from '../hooks/pomodoro-widget'
import { centered } from '../hooks/widget'

const BAND = {
  plugin: 'echo-widget',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 1 },
    view: {},
  },
} as const

test('widgets switch on and off, and the pomodoro runs in its box', async ($, on) => {
  // The last hour of October, so the day and the month turn within the test.
  const clock = mock.clock(on, { now: new Date(2026, 9, 31, 23).getTime() })
  mock.store(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }))
  const played: string[] = []
  on('audio.play', ($, e) => {
    played.push(JSON.stringify(e))

    return { value: undefined }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>nothing</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const band = await $.ui.mount(BAND)
  const borders = async () =>
    (await band.findAll({ type: 'Box' }))
      .map(box => box.props.borderColor)
      .filter(color => color !== undefined)
  const text = async () =>
    (await band.findAll({ type: 'Text' })).map(one => one.text).join('')
  const run = async (command: string, args = '') =>
    (
      await $.command.run({
        command,
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 100 },
      })
    ).text

  // Both are on to begin with, but the pomodoro has no timer to show yet.
  expect(await text()).toContain('October 2026')
  expect(await text()).not.toContain('━')
  expect(await text()).not.toContain('╌')
  expect(await run('echo-widget')).toContain('pomo on · calendar on')

  expect(await run('echo-widget', 'calendar')).toBe('calendar widget off.')
  expect(await text()).not.toContain('October 2026')
  expect(await run('echo-widget', 'pomo')).toBe('pomo widget off.')
  expect(await text()).toBe('nothing')
  expect(await run('echo-widget', 'clock')).toContain('No widget "clock"')

  // Starting the timer brings its widget back.
  await run('pomo')
  expect(await text()).toContain('25:00')
  expect(await text()).toContain('FOCUS  #1')

  await clock.advance(60_000)
  expect(await text()).toContain('24:00')
  // A running phase colors its box's border; paused, it is plain again.
  expect((await borders())[0]).toBe('error')

  await run('pomo')
  await clock.advance(60_000)
  expect(await text()).toContain('PAUSED  #1')
  expect((await borders())[0]).toBe('inactive')
  expect(played).toEqual([])

  await run('pomo')
  await clock.advance(24 * 60_000)
  expect(await text()).toContain('BREAK  #1')
  expect(await run('pomo-stats')).toContain('Today     focus 25m (1 round) · break 0m')
  expect(played).toHaveLength(1)
  expect(played[0]).toContain('sounds/focus-done.wav')

  await run('pomo-set', '50 10')
  await run('pomo-skip')
  expect(await text()).toContain('50:00')
  await run('pomo-reset')
  expect(await text()).toBe('nothing')

  // A break runs on from the focus, but the next focus waits for /pomo.
  await run('pomo')
  await clock.advance(50 * 60_000)
  expect(await text()).toContain('BREAK  #1')
  await clock.advance(10 * 60_000)
  expect(await text()).toContain('READY  #2')
  expect(played.at(-1)).toContain('sounds/break-done.wav')
  await clock.advance(5 * 60_000)
  expect(await text()).toContain('50:00')
  expect(await run('pomo')).toBe('Focus #2 running.')
  expect(await text()).toContain('FOCUS  #2')
  await run('pomo-reset')

  // The calendar follows the day.
  await run('echo-widget', 'calendar')
  await clock.advance(40 * 60_000)
  expect(await text()).toContain('November 2026')
  await band.unmount()
})

test('the calendar lays the month out by week and marks today', () => {
  const rows = calendarLines('2026-10-05').map(line =>
    line.map(span => span.text).join(''),
  )

  expect(rows).toEqual([
    '    October 2026    ',
    'Su Mo Tu We Th Fr Sa',
    '             1  2  3',
    ' 4  5  6  7  8  9 10',
    '11 12 13 14 15 16 17',
    '18 19 20 21 22 23 24',
    '25 26 27 28 29 30 31',
  ])
  expect(
    calendarLines('2026-10-05')
      .flat()
      .filter(span => span.isInverse)
      .map(span => span.text),
  ).toEqual([' 5'])
})

// The dial's lit dots as `x,y`, by the part that drew each.
const dotsOf = (rows: Run[][]) => {
  const dots = { hand: new Set<string>(), left: new Set<string>(), tick: new Set<string>() }

  rows.forEach((runs, row) => {
    let column = 0

    for (const run of runs) {
      for (const cell of run.text) {
        const bits = (cell.codePointAt(0) ?? 0x2800) - 0x2800

        BITS.forEach(([across, down, bit]) => {
          if (bits & bit) {
            dots[run.part].add(`${column * 2 + across},${row * 4 + down}`)
          }
        })
        column += 1
      }
    }
  })

  return dots
}
const BITS = [
  [0, 0, 0x01],
  [0, 1, 0x02],
  [0, 2, 0x04],
  [0, 3, 0x40],
  [1, 0, 0x08],
  [1, 1, 0x10],
  [1, 2, 0x20],
  [1, 3, 0x80],
] as const
const ACROSS = FACE_COLUMNS * 2
const DOWN = FACE_ROWS * 4
const moved = (dots: Set<string>, move: (x: number, y: number) => [number, number]) =>
  new Set(
    [...dots].map(dot => {
      const [x = 0, y = 0] = dot.split(',').map(Number)

      return move(x, y).join(',')
    }),
  )
const SHARES = Array.from({ length: 101 }, (_, step) => step / 100)

test('lines sit in the middle of a taller box, the odd row below', () => {
  const lines = [[{ text: 'a' }], [{ text: 'b' }]]
  const texts = (rows: number) => centered(lines, rows).map(line => line[0]?.text)

  expect(texts(2)).toEqual(['a', 'b'])
  expect(texts(4)).toEqual([' ', 'a', 'b', ' '])
  expect(texts(5)).toEqual([' ', 'a', 'b', ' ', ' '])
  expect(texts(1)).toEqual(['a', 'b'])
})

test('the disk is round: the same mirrored, flipped and turned', () => {
  expect(DISK.size).toBeGreaterThan(100)
  expect(moved(DISK, (x, y) => [ACROSS - 1 - x, y])).toEqual(DISK)
  expect(moved(DISK, (x, y) => [x, DOWN - 1 - y])).toEqual(DISK)
  expect(moved(DISK, (x, y) => [y, x])).toEqual(DISK)
})

test('the scale mirrors left to right and top to bottom', () => {
  expect(TICKS.size).toBe(16)
  expect(moved(TICKS, (x, y) => [ACROSS - 1 - x, y])).toEqual(TICKS)
  expect(moved(TICKS, (x, y) => [x, DOWN - 1 - y])).toEqual(TICKS)
})

test('at every moment the dial keeps its shape: rows, disk, hand and scale', () => {
  for (const share of SHARES) {
    const rows = faceOf(share)
    const { left, hand, tick } = dotsOf(rows)

    // Every row is the dial's width: a short row would shift the ones below.
    expect(rows.map(runs => runs.reduce((sum, run) => sum + [...run.text].length, 0))).toEqual(
      Array.from({ length: FACE_ROWS }, () => FACE_COLUMNS),
    )
    // Nothing of the disk or the hand strays past the full disk or onto the scale.
    expect([...left, ...hand].filter(dot => !DISK.has(dot) && !TICKS.has(dot))).toEqual([])
    // The hand always shows, from the center out.
    expect(hand.has('9,9') || hand.has('10,10')).toBe(true)
    // The whole scale shows, in whichever color its cell took.
    expect([...TICKS].filter(dot => !(left.has(dot) || hand.has(dot) || tick.has(dot)))).toEqual([])
  }
})

test('the disk empties as time runs, down to the hand alone', () => {
  const lit = (share: number) => dotsOf(faceOf(share)).left.size

  expect(lit(1)).toBeGreaterThan(lit(0.75))
  expect(lit(0.75)).toBeGreaterThan(lit(0.5))
  expect(lit(0.5)).toBeGreaterThan(lit(0.25))
  expect(lit(0.25)).toBeGreaterThan(lit(0))
  expect(lit(0)).toBe(0)
})

test('the widget keeps every row one width, whatever the round and phase', () => {
  const minutes = { focus: 25, break: 5 }
  const first = toggled(null, 1000, minutes)
  const timers = [
    first,
    { ...first, round: 47 },
    { ...first, round: 1234 },
    { ...first, phase: 'break' as const, round: 46 },
    toggled(first, 60_000, minutes),
    { ...first, endsAt: null },
  ]

  for (const timer of timers) {
    const widths = pomodoroLines(timer, 2000).map(line =>
      line.reduce((sum, span) => sum + [...span.text].length, 0),
    )

    expect(new Set(widths).size).toBe(1)
  }
})

test('a phase is logged once, however many sessions see it end', () => {
  const timer = toggled(null, 1000, { focus: 25, break: 5 })
  const once = logged(EMPTY_LOG, timer, timer.endsAt ?? 0)

  expect(Object.values(once.days)).toEqual([
    { focusMs: 25 * 60_000, breakMs: 0, rounds: 1 },
  ])
  expect(logged(once, timer, timer.endsAt ?? 0)).toBe(once)
})
