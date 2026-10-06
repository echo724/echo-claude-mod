import { expect, mock, test } from 'claude-code/testing'

import {
  EMPTY_WELL,
  isMoving,
  measured,
  resized,
  stepped,
  tokensOf,
  WELL_CELLS,
} from '../hooks/tetris'
import { wellLines } from '../hooks/tetris-widget'
import type { Well } from '../types'

const WINDOW = 200_000
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

const at = (well: Well, percent: number) =>
  measured(well, { tokens: (WINDOW * percent) / 100, window: WINDOW })
const settled = (well: Well) => {
  let now = well

  for (let frame = 0; isMoving(now); frame += 1) {
    expect(frame).toBeLessThan(1000)
    now = stepped(now)
  }

  return now
}
const blocksOf = (well: Well) => well.rows.flat().filter(cell => cell !== null)

test('the first reading is the floor, and each turn after it falls as pieces', () => {
  const first = at(EMPTY_WELL, 13)

  expect(isMoving(first)).toBe(false)
  expect(blocksOf(first)).toEqual(Array.from({ length: 13 }, () => 'floor'))

  const second = at(first, 20)

  expect(second.owed).toBe(7)
  expect(second.added).toBe(14_000)
  expect(blocksOf(second).length).toBe(13)

  // Seven cells: a tetromino and a scrap of three.
  const pieces = blocksOf(settled(second)).filter(block => block !== 'floor')

  expect(pieces.length).toBe(7)
  expect(pieces.filter(block => block === 'bit').length).toBe(3)
})

test('the well holds a cell a hundredth of the window, all the way up', () => {
  let well = at(EMPTY_WELL, 8)

  for (let percent = 9; percent <= 100; percent += 1 + (percent % 5)) {
    well = settled(at(well, percent))
    expect(blocksOf(well).length).toBe(percent)
  }

  well = settled(at(well, 100))
  expect(blocksOf(well).length).toBe(WELL_CELLS)
})

test('a piece falls a row a frame and never through what has settled', () => {
  let well = at(at(EMPTY_WELL, 30), 34)
  let before = -Infinity

  well = stepped(well)
  expect(well.falling).not.toBe(null)

  while (well.falling !== null) {
    const { cells, column, row } = well.falling

    expect(row).toBeGreaterThan(before)
    expect(
      cells.filter(([x, y]) => row + y >= 0 && well.rows[row + y]?.[column + x] !== null),
    ).toEqual([])
    before = row
    well = stepped(well)
  }

  expect(blocksOf(well).length).toBe(34)
})

test('a compaction flashes the lines out and leaves the summary as the floor', () => {
  const full = settled(at(at(EMPTY_WELL, 10), 80))
  const cleared = at(full, 12)

  expect(cleared.flash).toBeGreaterThan(0)
  expect(cleared.added).toBe(-136_000)
  expect(blocksOf(settled(cleared))).toEqual(Array.from({ length: 12 }, () => 'floor'))

  // A cell or two down is the window settling: nothing clears.
  expect(isMoving(at(full, 78))).toBe(false)
  expect(blocksOf(at(full, 78)).length).toBe(80)

  // With no reading yet for the new window, the well stands empty.
  const emptied = settled(measured(full, { window: WINDOW }))

  expect(blocksOf(emptied)).toEqual([])
  expect(emptied.tokens).toBe(null)
})

test('every row of the well is one width, and the limit line shows', () => {
  const wells = [
    EMPTY_WELL,
    at(EMPTY_WELL, 13),
    settled(at(at(EMPTY_WELL, 13), 97)),
    { ...settled(at(at(EMPTY_WELL, 13), 60)), limit: 167_000 },
    measured(EMPTY_WELL, { tokens: 840_000, window: 1_000_000 }),
  ]

  for (const well of wells) {
    const widths = wellLines(well).map(line =>
      line.reduce((sum, span) => sum + [...span.text].length, 0),
    )

    expect(widths).toEqual([23, 23, 23, 23, 23])
  }

  const text = (well: Well) =>
    wellLines(well)
      .map(line => line.map(span => span.text).join(''))
      .join('\n')

  expect(text(wells[1] ?? EMPTY_WELL)).toContain('13%')
  expect(text(wells[1] ?? EMPTY_WELL)).toContain('26k/200k')
  expect(text(wells[2] ?? EMPTY_WELL)).toContain('GAME OVER')
  // 167k of 200k is 83.5%: three dot rows down the top line.
  expect(text(wells[3] ?? EMPTY_WELL)).toContain('⣀')
  expect(text(wells[4] ?? EMPTY_WELL)).toContain('840k/1M')
})

test('a resized well keeps its fill, fills its height, and centers its figures', () => {
  const well = resized(settled(at(at(EMPTY_WELL, 13), 50)), 14)

  expect(well.rows.length).toBe(14)
  expect(isMoving(well)).toBe(false)
  // Half of fourteen rows of ten.
  expect(blocksOf(well)).toEqual(Array.from({ length: 70 }, () => 'floor'))
  expect(blocksOf(settled(at(well, 100))).length).toBe(140)
  expect(resized(well, 14)).toBe(well)

  const lines = wellLines(well).map(line => line.map(span => span.text).join(''))

  expect(lines.length).toBe(7)
  expect(lines.map(line => [...line].length)).toEqual(Array.from({ length: 7 }, () => 23))
  expect(lines.findIndex(line => line.includes('50%'))).toBe(1)
  expect(lines.findIndex(line => line.includes('CONTEXT'))).toBe(5)
})

test('token counts stay four characters or fewer', () => {
  expect([940, 3_100, 9_960, 84_000, 999_400, 999_600, 1_000_000, 1_250_000].map(tokensOf)).toEqual(
    ['940', '3.1k', '10k', '84k', '999k', '1M', '1M', '1.3M'],
  )
})

test('the context widget fills as the session measures, and clears on a compaction', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const toasts: string[] = []
  mock.store(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: WINDOW }, rateLimits: [] },
  }))
  on('session.compact', () => ({
    messages: [{ role: 'user', text: 'summary', toolUses: [] }],
    tokensBefore: 120_000,
    tokensAfter: 9_000,
  }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>nothing</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const band = await $.ui.mount(BAND)
  const text = async () =>
    (await band.findAll({ type: 'Text' })).map(one => one.text).join('')
  const measure = (tokens: number) =>
    $.session.measure({
      context: { tokens, window: WINDOW, percent: Math.round((tokens / WINDOW) * 100) },
      rateLimits: [],
      changed: ['context'],
    })
  const blocks = async () => [...(await text())].filter(cell => '█▀▄'.includes(cell)).length

  expect(await text()).toContain('--%')
  expect(await text()).toContain('CONTEXT')

  await measure(26_000)
  expect(await text()).toContain('13%')
  expect(await text()).toContain('turn 1')

  const floor = await blocks()

  await measure(60_000)
  expect(await text()).toContain('30%')
  expect(await text()).toContain('+34k')
  await clock.advance(10_000)
  expect(await blocks()).toBeGreaterThan(floor)

  await $.session.compact({
    trigger: 'manual',
    messages: [{ role: 'user', text: 'long talk', toolUses: [] }],
  })
  await clock.advance(1_000)
  expect(toasts).toContain('Line clear! 120k → 9k')
  expect(await blocks()).toBe(0)

  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'echo-widget',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 100 },
      })
    ).text

  expect(await run('')).toContain('context on')
  expect(await run('context')).toBe('context widget off.')
  expect(await text()).not.toContain('CONTEXT')
  await band.unmount()
})
