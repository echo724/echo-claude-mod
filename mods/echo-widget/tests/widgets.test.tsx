import { expect, mock, test } from 'claude-code/testing'

import { calendarLines } from '../hooks/calendar'
import { faceOf } from '../hooks/face'
import { EMPTY_LOG, logged, toggled } from '../hooks/pomodoro'

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
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>nothing</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const band = await $.ui.mount(BAND)
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

  await run('pomo')
  await clock.advance(60_000)
  expect(await text()).toContain('PAUSED  #1')

  await run('pomo')
  await clock.advance(24 * 60_000)
  expect(await text()).toContain('BREAK  #1')
  expect(await run('pomo-stats')).toContain('Today     focus 25m (1 round) · break 0m')

  await run('pomo-set', '50 10')
  await run('pomo-skip')
  expect(await text()).toContain('50:00')
  await run('pomo-reset')
  expect(await text()).toBe('nothing')

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

test('the dial empties clockwise from twelve', () => {
  const lit = (rows: { text: string }[][]) =>
    [...rows.flat().map(run => run.text).join('')].reduce(
      (sum, cell) =>
        sum +
        ((cell.codePointAt(0) ?? 0x2800) - 0x2800)
          .toString(2)
          .replaceAll('0', '').length,
      0,
    )

  expect(lit(faceOf(1))).toBeGreaterThan(lit(faceOf(0.5)))
  expect(lit(faceOf(0.5))).toBeGreaterThan(lit(faceOf(0)))
})

test('a phase is logged once, however many sessions see it end', () => {
  const timer = toggled(null, 1000, { focus: 25, break: 5 })
  const once = logged(EMPTY_LOG, timer, timer.endsAt ?? 0)

  expect(Object.values(once.days)).toEqual([
    { focusMs: 25 * 60_000, breakMs: 0, rounds: 1 },
  ])
  expect(logged(once, timer, timer.endsAt ?? 0)).toBe(once)
})
