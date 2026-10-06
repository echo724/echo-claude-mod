import type { Day, Log, Minutes, Pomodoro } from '../types'

const MINUTE_MS = 60_000
const BAR_CELLS = 8

export const DEFAULT_MINUTES: Minutes = { focus: 25, break: 5 }
export const MAX_MINUTES: Minutes = { focus: 180, break: 60 }
export const EMPTY_LOG: Log = { days: {}, last: 0 }
/** A phase found over this long after it ended ran out with no session open. */
export const AWAY_MS = MINUTE_MS

export const leftOf = (timer: Pomodoro, now: number): number =>
  timer.endsAt === null ? timer.leftMs : Math.max(0, timer.endsAt - now)

const started = (
  phase: Pomodoro['phase'],
  round: number,
  now: number,
  minutes: Minutes,
): Pomodoro => {
  const lengthMs = minutes[phase] * MINUTE_MS

  return {
    phase,
    round,
    startedAt: now,
    endsAt: now + lengthMs,
    leftMs: lengthMs,
    lengthMs,
  }
}

/** Starts the first focus, or pauses a running timer, or resumes a paused one. */
export const toggled = (
  timer: Pomodoro | null,
  now: number,
  minutes: Minutes,
): Pomodoro => {
  if (timer === null) {
    return started('focus', 1, now, minutes)
  }

  return timer.endsAt === null
    ? { ...timer, endsAt: now + timer.leftMs }
    : { ...timer, endsAt: null, leftMs: leftOf(timer, now) }
}

/** The phase after this one, running: a break, or the next round's focus. */
export const following = (
  timer: Pomodoro,
  now: number,
  minutes: Minutes,
): Pomodoro =>
  timer.phase === 'focus'
    ? started('break', timer.round, now, minutes)
    : started('focus', timer.round + 1, now, minutes)

/**
 * The phase after one that ran out: a break starts at once, but the next
 * focus waits, paused at its full length, until the person starts it.
 * Left to cycle unwatched, the timer would log focus nobody did.
 */
export const succeeding = (timer: Pomodoro, minutes: Minutes): Pomodoro => {
  const next = following(timer, timer.endsAt ?? timer.startedAt, minutes)

  return next.phase === 'focus' ? { ...next, endsAt: null } : next
}

/** `50` or `50 10` as focus and break minutes, within the limits; else nothing. */
export const minutesOf = (order: string, now: Minutes): Minutes | undefined => {
  const [, focus, rest] = /^(\d+)(?:\s+(\d+))?$/.exec(order) ?? []
  const asked = { focus: Number(focus), break: Number(rest ?? now.break) }
  const isWithin = (phase: keyof Minutes) =>
    asked[phase] >= 1 && asked[phase] <= MAX_MINUTES[phase]

  return isWithin('focus') && isWithin('break') ? asked : undefined
}

/** What the store kept as the timer, or none when it holds no timer. */
export const timerOf = (kept: unknown): Pomodoro | null => {
  const held = kept as Partial<Pomodoro> | null | undefined
  const isTimer =
    (held?.phase === 'focus' || held?.phase === 'break') &&
    typeof held.round === 'number' &&
    typeof held.startedAt === 'number' &&
    typeof held.leftMs === 'number' &&
    typeof held.lengthMs === 'number' &&
    (held.endsAt === null || typeof held.endsAt === 'number')

  return isTimer ? (held as Pomodoro) : null
}

/** What the store kept as the log, or an empty one. */
export const logOf = (kept: unknown): Log => {
  const held = kept as Partial<Log> | null | undefined

  return typeof held?.last === 'number' && typeof held.days === 'object'
    ? (held as Log)
    : EMPTY_LOG
}

/** The local calendar day a moment falls on, as `2026-10-05`. */
export const dayOf = (ms: number): string => {
  const date = new Date(ms)
  const pad = (count: number) => String(count).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const NO_TIME: Day = { focusMs: 0, breakMs: 0, rounds: 0 }

const plus = (day: Day, timer: Pomodoro, at: number): Day => {
  const ran = timer.lengthMs - leftOf(timer, at)

  return timer.phase === 'focus'
    ? {
        ...day,
        focusMs: day.focusMs + ran,
        rounds: day.rounds + (ran >= timer.lengthMs ? 1 : 0),
      }
    : { ...day, breakMs: day.breakMs + ran }
}

/**
 * The log with the time a phase ran up to `at` added to that day: a focus
 * that ran its whole length counts a round. A phase is logged once, however
 * many sessions see it end: the same log comes back for one already in it,
 * as it does for a phase that never ran.
 */
export const logged = (log: Log, timer: Pomodoro, at: number): Log => {
  const isNothing = leftOf(timer, at) >= timer.lengthMs

  if (timer.startedAt <= log.last || isNothing) {
    return log
  }

  const day = dayOf(at)

  return {
    last: timer.startedAt,
    days: { ...log.days, [day]: plus(log.days[day] ?? NO_TIME, timer, at) },
  }
}

const spanOf = (ms: number): string => {
  const minutes = Math.round(ms / MINUTE_MS)
  const hours = Math.floor(minutes / 60)

  return hours === 0
    ? `${minutes}m`
    : `${hours}h ${String(minutes % 60).padStart(2, '0')}m`
}

const lineOf = (day: Day): string =>
  `focus ${spanOf(day.focusMs)} (${day.rounds} ${day.rounds === 1 ? 'round' : 'rounds'}) · break ${spanOf(day.breakMs)}`

/** Today's and all the logged time, the phase now under way counted in. */
export const statsOf = (log: Log, timer: Pomodoro | null, now: number): string => {
  const today = dayOf(now)
  // Under way and not yet logged: counted where it would land if it ended now.
  const days =
    timer === null || timer.startedAt <= log.last
      ? log.days
      : { ...log.days, [today]: plus(log.days[today] ?? NO_TIME, timer, now) }
  const all = Object.values(days).reduce(
    (sum, day) => ({
      focusMs: sum.focusMs + day.focusMs,
      breakMs: sum.breakMs + day.breakMs,
      rounds: sum.rounds + day.rounds,
    }),
    NO_TIME,
  )
  const since = Object.keys(days).sort()[0] ?? today

  return [
    `Today     ${lineOf(days[today] ?? NO_TIME)}`,
    `All time  ${lineOf(all)} · since ${since}`,
  ].join('\n')
}

/** A bar for the share of the phase still left: solid where time has run. */
export const barOf = (left: number): string => {
  const done = Math.round(BAR_CELLS * (1 - left))

  return '━'.repeat(done) + '╌'.repeat(BAR_CELLS - done)
}

export const clockOf = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000)
  const pad = (count: number) => String(count).padStart(2, '0')

  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}
