/** A pomodoro timer: running while `endsAt` is set, else paused at `leftMs`. */
export type Pomodoro = {
  phase: 'focus' | 'break'
  round: number
  endsAt: number | null
  leftMs: number
  /** How long this phase is in all: the lengths may change between phases. */
  lengthMs: number
}

/** How long each phase lasts, in minutes. */
export type Minutes = { focus: number; break: number }

/** Where the timer shows: in the hint line under the prompt, or as a dial above it. */
export type Visual = 'line' | 'clock'

declare module 'claude-code' {
  interface PluginState {
    pomodoro: { timer: Pomodoro | null; visual: Visual; minutes: Minutes }
  }
}
