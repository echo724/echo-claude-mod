import type { Minutes, Pomodoro } from '../types'

const MINUTE_MS = 60_000

export const DEFAULT_MINUTES: Minutes = { focus: 25, break: 5 }
export const MAX_MINUTES: Minutes = { focus: 180, break: 60 }

export const leftOf = (timer: Pomodoro, now: number): number =>
  timer.endsAt === null ? timer.leftMs : Math.max(0, timer.endsAt - now)

const started = (
  phase: Pomodoro['phase'],
  round: number,
  now: number,
  minutes: Minutes,
): Pomodoro => {
  const lengthMs = minutes[phase] * MINUTE_MS

  return { phase, round, endsAt: now + lengthMs, leftMs: lengthMs, lengthMs }
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

/** `50` or `50 10` as focus and break minutes, within the limits; else nothing. */
export const minutesOf = (order: string, now: Minutes): Minutes | undefined => {
  const [, focus, rest] = /^(\d+)(?:\s+(\d+))?$/.exec(order) ?? []
  const asked = { focus: Number(focus), break: Number(rest ?? now.break) }
  const isWithin = (phase: keyof Minutes) =>
    asked[phase] >= 1 && asked[phase] <= MAX_MINUTES[phase]

  return isWithin('focus') && isWithin('break') ? asked : undefined
}

const BAR_CELLS = 8

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
