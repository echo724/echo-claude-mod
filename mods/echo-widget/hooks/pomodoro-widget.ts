import type { Pomodoro } from '../types'
import { faceOf } from './face'
import { barOf, clockOf, leftOf } from './pomodoro'
import type { Line } from './widget'

const COLORS = { focus: 'error', break: 'success' } as const

/** The timer as a dial with the time, a bar and the phase beside it. */
export const pomodoroLines = (timer: Pomodoro, now: number): Line[] => {
  const left = leftOf(timer, now)
  const share = left / timer.lengthMs
  const color = timer.endsAt === null ? 'inactive' : COLORS[timer.phase]
  const tints = { hand: 'text', left: color, tick: 'inactive' } as const
  const title = `${timer.endsAt === null ? 'PAUSED' : timer.phase.toUpperCase()}  #${timer.round}`
  const beside = ['', clockOf(left), barOf(share), title]

  return faceOf(share).map((runs, row) => [
    ...runs.map(run => ({
      text: run.text,
      color: tints[run.part],
      isBold: run.part === 'hand',
    })),
    {
      text: `   ${(beside[row] ?? '').padEnd(9)}`,
      color: row < 3 ? color : 'inactive',
      isBold: row === 1,
    },
  ])
}
