import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Minutes, Pomodoro, Shown, WidgetId } from '../types'
import { calendarLines } from './calendar'
import {
  AWAY_MS,
  clockOf,
  dayOf,
  DEFAULT_MINUTES,
  following,
  logged,
  logOf,
  MAX_MINUTES,
  minutesOf,
  statsOf,
  timerOf,
  toggled,
} from './pomodoro'
import { pomodoroLines } from './pomodoro-widget'
import type { Line } from './widget'

const ALL_SHOWN: Shown = { pomo: true, calendar: true }

const shown = atom({ plugin: 'echo-widget', key: 'shown' } as const, ALL_SHOWN)
const timer = atom({ plugin: 'echo-widget', key: 'timer' } as const, null)
const minutes = atom({ plugin: 'echo-widget', key: 'minutes' } as const, DEFAULT_MINUTES)
const today = atom({ plugin: 'echo-widget', key: 'today' } as const, '1970-01-01')

const SHOWN_KEY = 'shown'
const TIMER_KEY = 'timer'
const LOG_KEY = 'log'
const MINUTES_KEY = 'minutes'
const SECOND_MS = 1000
const WIDGETS = ['pomo', 'calendar'] as const

// One command per action, so the typeahead lists and completes each.
const COMMANDS = [
  {
    name: 'echo-widget',
    description: 'Widgets: list them, or switch one on or off',
    argumentHint: '[pomo | calendar]',
  },
  {
    name: 'pomo',
    description: 'Pomodoro: start, pause or resume',
    argumentHint: '[skip | reset | stats | <focus> [break]]',
  },
  { name: 'pomo-skip', description: 'Pomodoro: jump to the next phase' },
  { name: 'pomo-reset', description: 'Pomodoro: stop and clear the timer' },
  {
    name: 'pomo-set',
    description: 'Pomodoro: set the minutes, e.g. /pomo-set 50 10',
    argumentHint: '<focus minutes> [break minutes]',
  },
  { name: 'pomo-stats', description: 'Pomodoro: time focused and rested, today and in all' },
] as const

const USAGE = `Give minutes: /pomo-set 50 or /pomo-set 50 10 (focus 1-${MAX_MINUTES.focus}, break 1-${MAX_MINUTES.break}).`

const isWidget = (name: string): name is WidgetId =>
  (WIDGETS as readonly string[]).includes(name)

/** What the store kept as the widgets switched on, or all of them. */
const shownOf = (kept: unknown): Shown => {
  const held = kept as Partial<Shown> | null | undefined

  return WIDGETS.every(id => typeof held?.[id] === 'boolean')
    ? (held as Shown)
    : ALL_SHOWN
}

const show = async ($: EngineInterface, id: WidgetId, isOn: boolean) => {
  const now = await update($, shown, was => ({ ...was, [id]: isOn }))
  await $.store.set(SHOWN_KEY, now)
}

/** Lists the widgets, or switches the one named and says where it stands. */
const widget = async ($: EngineInterface, name: string): Promise<string> => {
  const now = await read($, shown)

  if (name === '') {
    const list = WIDGETS.map(id => `${id} ${now[id] ? 'on' : 'off'}`).join(' · ')

    return `${list}. /echo-widget <name> switches one.`
  }

  if (!isWidget(name)) {
    return `No widget "${name}". There are: ${WIDGETS.join(', ')}.`
  }

  await show($, name, !now[name])

  return `${name} widget ${now[name] ? 'off' : 'on'}.`
}

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
const pomo = async ($: EngineInterface, order: string): Promise<string> => {
  const at = await $.clock.now()
  const lengths = await read($, minutes)

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
    return `Unknown: "${order}". Try /pomo, /pomo-skip, /pomo-reset, /pomo-set or /pomo-stats.`
  }

  const now =
    order === 'skip' && was !== null
      ? following(was, at, lengths)
      : toggled(was, at, lengths)
  await put($, now)
  // A timer nobody can see is no use: starting one brings its widget up.
  await show($, 'pomo', true)
  const phase = now.phase === 'break' ? 'Break' : 'Focus'

  return now.endsAt === null
    ? `${phase} paused, ${clockOf(now.leftMs)} left.`
    : `${phase} #${now.round} running.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const isOn = shownOf(await $.store.get(SHOWN_KEY))
    await update($, shown, () => isOn)
    const kept = (await $.store.get(MINUTES_KEY)) as Partial<Minutes> | undefined
    const asked = minutesOf(`${kept?.focus} ${kept?.break}`, DEFAULT_MINUTES)
    await update($, minutes, () => asked ?? DEFAULT_MINUTES)
    const day = dayOf(await $.clock.now())
    await update($, today, () => day)
    await sync($)

    for (const command of COMMANDS) {
      await $.command.register(command)
    }

    $.clock.every(SECOND_MS, async () => {
      const at = await $.clock.now()
      const { before, now } = await sync($)
      const lengths = await read($, minutes)

      if (dayOf(at) !== (await read($, today))) {
        await update($, today, () => dayOf(at))
      }

      // Another session moved the timer on: say so here too.
      if (before !== null && now !== null && now.startedAt === before.endsAt) {
        $.ui.toast(doneOf(before, lengths))
      }

      if (now === null || now.endsAt === null) {
        return
      }

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

  on('command.run', { command: 'echo-widget' }, async ($, e) => ({
    text: await widget($, e.args.trim()),
  }))

  on('command.run', { command: 'pomo' }, async ($, e) => ({
    text: await pomo($, e.args.trim()),
  }))

  on('command.run', { command: 'pomo-skip' }, async $ => ({
    text: await pomo($, 'skip'),
  }))

  on('command.run', { command: 'pomo-reset' }, async $ => ({
    text: await pomo($, 'reset'),
  }))

  on('command.run', { command: 'pomo-set' }, async ($, e) => ({
    text: /^\d/.test(e.args.trim()) ? await pomo($, e.args.trim()) : USAGE,
  }))

  on('command.run', { command: 'pomo-stats' }, async $ => ({
    text: await pomo($, 'stats'),
  }))

  // Every widget switched on draws in a rounded box of its own, side by side.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isOn = await read($, shown)
    const now = await read($, timer)
    const boxes: Line[][] = []

    // With no timer set there is nothing to show: the box waits on /pomo.
    if (isOn.pomo && now !== null) {
      boxes.push(pomodoroLines(now, await $.clock.now()))
    }

    if (isOn.calendar) {
      boxes.push(calendarLines(await read($, today)))
    }

    if (e.props.hasSurvey || boxes.length === 0) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box gap={1} flexWrap="wrap" alignItems="flex-end">
        {boxes.map(lines => (
          <Box
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            borderStyle="round"
            borderColor="inactive"
            paddingX={1}
          >
            {lines.map(line => (
              <Box>
                {line.map(span => (
                  <Text
                    color={span.color ?? 'text'}
                    bold={span.isBold === true}
                    inverse={span.isInverse === true}
                  >
                    {span.text}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
