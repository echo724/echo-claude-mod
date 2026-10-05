import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Minutes, Pomodoro, Visual } from '../types'
import { faceOf } from './face'
import {
  AWAY_MS,
  barOf,
  clockOf,
  DEFAULT_MINUTES,
  following,
  leftOf,
  logged,
  logOf,
  MAX_MINUTES,
  minutesOf,
  statsOf,
  timerOf,
  toggled,
} from './pomodoro'

const timer = atom({ plugin: 'pomodoro', key: 'timer' } as const, null)
const visual = atom({ plugin: 'pomodoro', key: 'visual' } as const, 'line' as Visual)
const minutes = atom({ plugin: 'pomodoro', key: 'minutes' } as const, DEFAULT_MINUTES)

const TIMER_KEY = 'timer'
const LOG_KEY = 'log'
const VISUAL_KEY = 'visual'
const MINUTES_KEY = 'minutes'
const SECOND_MS = 1000

// Keys of the person's theme, so the dial follows it.
const COLORS = { focus: 'error', break: 'success', paused: 'inactive' } as const

// One command per action, so the typeahead lists and completes each.
const COMMANDS = [
  {
    name: 'pomo',
    description: 'Pomodoro: start, pause or resume',
    argumentHint: '[skip | reset | stats | clock | line | <focus> [break]]',
  },
  { name: 'pomo-skip', description: 'Pomodoro: jump to the next phase' },
  { name: 'pomo-reset', description: 'Pomodoro: stop and clear the timer' },
  {
    name: 'pomo-set',
    description: 'Pomodoro: set the minutes, e.g. /pomo-set 50 10',
    argumentHint: '<focus minutes> [break minutes]',
  },
  { name: 'pomo-stats', description: 'Pomodoro: time focused and rested, today and in all' },
  { name: 'pomo-clock', description: 'Pomodoro: show as a dial above the prompt' },
  { name: 'pomo-line', description: 'Pomodoro: show in the hint line under the prompt' },
] as const

const USAGE = `Give minutes: /pomo-set 50 or /pomo-set 50 10 (focus 1-${MAX_MINUTES.focus}, break 1-${MAX_MINUTES.break}).`

const titleOf = (now: Pomodoro): string =>
  `${now.endsAt === null ? 'PAUSED' : now.phase.toUpperCase()}`

const doneOf = (done: Pomodoro, lengths: Minutes): string =>
  done.phase === 'focus'
    ? `Focus #${done.round} done. Take ${lengths.break} minutes off.`
    : 'Break over. Time to focus again.'

/**
 * The timer lives in the store, one for every session: this brings the
 * session's copy up to it and answers both, so a caller sees what changed.
 */
const sync = async ($: EngineInterface) => {
  const before = await read($, timer)
  const now = timerOf(await $.store.get(TIMER_KEY))

  if (JSON.stringify(now) !== JSON.stringify(before)) {
    await update($, timer, () => now)
  }

  return { before, now }
}

const put = async ($: EngineInterface, now: Pomodoro | null) => {
  await $.store.set(TIMER_KEY, now)
  await update($, timer, () => now)
}

/** Adds the time a phase ran up to `at` to the log. */
const record = async ($: EngineInterface, done: Pomodoro, at: number) => {
  const log = logOf(await $.store.get(LOG_KEY))
  const next = logged(log, done, at)

  if (next !== log) {
    await $.store.set(LOG_KEY, next)
  }
}

/** Carries out one pomodoro order and answers with the line to print. */
const obey = async ($: EngineInterface, order: string): Promise<string> => {
  const at = await $.clock.now()
  const lengths = await read($, minutes)

  if (order === 'clock' || order === 'line') {
    await $.store.set(VISUAL_KEY, order)
    await update($, visual, () => order)

    return order === 'clock'
      ? 'Pomodoro shows as a dial above the prompt.'
      : 'Pomodoro shows in the hint line under the prompt.'
  }

  if (/^\d/.test(order)) {
    const asked = minutesOf(order, lengths)

    if (asked === undefined) {
      return USAGE
    }

    await $.store.set(MINUTES_KEY, asked)
    await update($, minutes, () => asked)

    return `Focus ${asked.focus} min, break ${asked.break} min, from the next phase that starts.`
  }

  const { now: was } = await sync($)

  if (order === 'stats') {
    return statsOf(logOf(await $.store.get(LOG_KEY)), was, at)
  }

  if (order === 'reset' || order === 'skip') {
    // What ran of the phase cut short still counts.
    if (was !== null) {
      await record($, was, at)
    }

    if (order === 'reset') {
      await put($, null)

      return 'Pomodoro cleared.'
    }
  } else if (order !== '') {
    return `Unknown: "${order}". Try /pomo, /pomo-skip, /pomo-reset, /pomo-set, /pomo-stats, /pomo-clock or /pomo-line.`
  }

  const now =
    order === 'skip' && was !== null
      ? following(was, at, lengths)
      : toggled(was, at, lengths)
  await put($, now)
  const phase = now.phase === 'break' ? 'Break' : 'Focus'

  return now.endsAt === null
    ? `${phase} paused, ${clockOf(now.leftMs)} left.`
    : `${phase} #${now.round} running.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const shown = await $.store.get(VISUAL_KEY)
    await update($, visual, () => (shown === 'clock' ? 'clock' : 'line'))
    const kept = (await $.store.get(MINUTES_KEY)) as Partial<Minutes> | undefined
    const asked = minutesOf(`${kept?.focus} ${kept?.break}`, DEFAULT_MINUTES)
    await update($, minutes, () => asked ?? DEFAULT_MINUTES)

    for (const command of COMMANDS) {
      await $.command.register(command)
    }

    await sync($)
    $.clock.every(SECOND_MS, async () => {
      const { before, now } = await sync($)
      const lengths = await read($, minutes)

      // Another session moved the timer on: say so here too.
      if (before !== null && now !== null && now.startedAt === before.endsAt) {
        $.ui.toast(doneOf(before, lengths))
      }

      if (now === null || now.endsAt === null) {
        return
      }

      const at = await $.clock.now()

      if (at < now.endsAt) {
        $.ui.invalidate('ui.render')

        return
      }

      await record($, now, now.endsAt)

      // Run out with no session open: nobody saw it end, so it stops there.
      if (at - now.endsAt > AWAY_MS) {
        await put($, null)

        return
      }

      await put($, following(now, now.endsAt, lengths))
      $.ui.toast(doneOf(now, lengths))
    })

    return next(e)
  })

  on('command.run', { command: 'pomo' }, async ($, e) => ({
    text: await obey($, e.args.trim()),
  }))

  on('command.run', { command: 'pomo-skip' }, async $ => ({
    text: await obey($, 'skip'),
  }))

  on('command.run', { command: 'pomo-reset' }, async $ => ({
    text: await obey($, 'reset'),
  }))

  on('command.run', { command: 'pomo-set' }, async ($, e) => ({
    text: /^\d/.test(e.args.trim()) ? await obey($, e.args.trim()) : USAGE,
  }))

  on('command.run', { command: 'pomo-stats' }, async $ => ({
    text: await obey($, 'stats'),
  }))

  on('command.run', { command: 'pomo-clock' }, async $ => ({
    text: await obey($, 'clock'),
  }))

  on('command.run', { command: 'pomo-line' }, async $ => ({
    text: await obey($, 'line'),
  }))

  // The engine keeps its own hint line; the timer rides at its end.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const now = await read($, timer)

    if (now === null || (await read($, visual)) !== 'line') {
      return next(e)
    }

    const left = leftOf(now, await $.clock.now())
    const mine = `${titleOf(now)} ${clockOf(left)} #${now.round} ${barOf(left / now.lengthMs)}`
    const tail = e.props.tail === undefined ? mine : `${e.props.tail} · ${mine}`

    return next({ ...e, props: { ...e.props, tail } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, timer)

    if (e.props.hasSurvey || now === null || (await read($, visual)) !== 'clock') {
      return next(e)
    }

    const left = leftOf(now, await $.clock.now())
    const color = COLORS[now.endsAt === null ? 'paused' : now.phase]
    const tints = { hand: 'text', left: color, tick: 'inactive' } as const
    const share = left / now.lengthMs
    const beside = ['', clockOf(left), barOf(share), `${titleOf(now)}  #${now.round}`]
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {faceOf(share).map((runs, row) => (
          <Box>
            {runs.map(run => (
              <Text bold={run.part === 'hand'} color={tints[run.part]}>
                {run.text}
              </Text>
            ))}
            <Text bold={row === 1} color={row === 3 ? 'inactive' : color}>
              {`   ${beside[row] ?? ''}`}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
