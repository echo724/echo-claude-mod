import { expect, mock, test } from 'claude-code/testing'

import { faceOf } from '../hooks/face'
import { EMPTY_LOG, logged, toggled } from '../hooks/pomodoro'

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 1 },
  view: {},
} as const

test('the timer counts down in the hint line, pauses, and moves on', async ($, on) => {
  // A real moment: phases are told apart by when they began.
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 5, 9) })
  mock.store(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }))
  // The engine's own line, as far as a test needs it: the hint, then the tail.
  on('ui.render', { component: 'PromptHint' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{`${e.props.hint}|${e.props.tail ?? ''}`}</Text>
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const hint = await $.ui.mount({
    plugin: 'pomodoro',
    component: 'PromptHint',
    surface: 'terminal',
    props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
  })
  const line = async () => (await hint.find({ type: 'Text' }))?.text
  const run = (command: string, args = '') =>
    $.command.run({
      command,
      args,
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 80 },
    })

  expect(await line()).toBe('? for shortcuts|')

  await run('pomo')
  expect(await line()).toBe('? for shortcuts|FOCUS 25:00 #1 ╌╌╌╌╌╌╌╌')

  await clock.advance(60_000)
  expect(await line()).toContain('FOCUS 24:00 #1')

  await run('pomo')
  await clock.advance(60_000)
  expect(await line()).toContain('PAUSED 24:00 #1')

  await run('pomo')
  await clock.advance(24 * 60_000)
  expect(await line()).toContain('BREAK 05:00 #1')

  await run('pomo-skip')
  expect(await line()).toContain('FOCUS 25:00 #2')

  await run('pomo-clock')
  expect(await line()).toBe('? for shortcuts|')

  const band = await $.ui.mount({
    plugin: 'pomodoro',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: BAND,
  })
  expect(await band.find({ type: 'Text', text: /25:00/ })).toBeDefined()
  await band.unmount()

  await run('pomo-line')
  await run('pomo-reset')
  expect(await line()).toBe('? for shortcuts|')

  // 1 min, then 24 more to the end of focus #1; nothing of the break or #2 ran.
  expect((await run('pomo-stats')).text).toContain(
    'Today     focus 25m (1 round) · break 0m',
  )

  await run('pomo')
  await clock.advance(10 * 60_000)
  expect((await run('pomo-stats')).text).toContain('focus 35m (1 round)')
  await run('pomo-reset')
  expect((await run('pomo-stats')).text).toContain('focus 35m (1 round)')

  await run('pomo')
  await clock.advance(25 * 60_000)
  expect((await run('pomo-stats')).text).toContain(
    'Today     focus 1h 00m (2 rounds) · break 0m',
  )

  await run('pomo-reset')
  await run('pomo-set', '50 10')
  await run('pomo')
  expect(await line()).toContain('FOCUS 50:00 #1')
  await run('pomo', 'skip')
  expect(await line()).toContain('BREAK 10:00 #1')
  await run('pomo-set', '999')
  await run('pomo-skip')
  expect(await line()).toContain('FOCUS 50:00 #2')
  await hint.unmount()
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
