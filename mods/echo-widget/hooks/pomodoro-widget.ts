import type { Pomodoro } from '../types'
import { faceOf } from './face'
import { barOf, clockOf, leftOf } from './pomodoro'
import type { Line } from './widget'

const COLORS = { focus: 'error', break: 'success' } as const

/** The color of a running phase, or none: a paused timer has no accent. */
export const accentOf = (timer: Pomodoro | null): string | undefined =>
  timer === null || timer.endsAt === null ? undefined : COLORS[timer.phase]

/** The timer as a dial with the time, a bar and the phase beside it. */
export const pomodoroLines = (timer: Pomodoro, now: number): Line[] => {
  const left = leftOf(timer, now)
  const share = left / timer.lengthMs
  const color = timer.endsAt === null ? 'inactive' : COLORS[timer.phase]
  const tints = { hand: 'text', left: color, tick: 'inactive' } as const
  // Paused before it ever ran, a phase is waiting on /pomo, not interrupted.
  const state =
    timer.endsAt !== null
      ? timer.phase.toUpperCase()
      : left < timer.lengthMs
        ? 'PAUSED'
        : 'READY'
  const title = `${state}  #${timer.round}`
  const beside = ['', clockOf(left), barOf(share), title]
  // Every row is one width, whatever the round's digits: a box centers a
  // shorter row, which would slide the dial's rows apart.
  const width = Math.max(...beside.map(text => text.length))

  return faceOf(share).map((runs, row) => [
    ...runs.map(run => ({
      text: run.text,
      color: tints[run.part],
      isBold: run.part === 'hand',
    })),
    {
      text: `   ${(beside[row] ?? '').padEnd(width)}`,
      color: row < 3 ? color : 'inactive',
      isBold: row === 1,
    },
  ])
}
