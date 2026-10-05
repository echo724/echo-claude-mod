/** A pomodoro timer: running while `endsAt` is set, else paused at `leftMs`. */
export type Pomodoro = {
  phase: 'focus' | 'break'
  round: number
  /** When this phase began: what tells one phase from the next. */
  startedAt: number
  endsAt: number | null
  leftMs: number
  /** How long this phase is in all: the lengths may change between phases. */
  lengthMs: number
}

/** How long each phase lasts, in minutes. */
export type Minutes = { focus: number; break: number }

/** The time one calendar day's phases ran, and the focuses that ran whole. */
export type Day = { focusMs: number; breakMs: number; rounds: number }

/** Every day's time by date (`2026-10-05`), and the last phase logged. */
export type Log = { days: Record<string, Day>; last: number }

/** The widgets there are, by the name a command switches each with. */
export type WidgetId = 'pomo' | 'calendar'

/** Which widgets are switched on. */
export type Shown = Record<WidgetId, boolean>

declare module 'claude-code' {
  interface PluginState {
    'echo-widget': {
      shown: Shown
      timer: Pomodoro | null
      minutes: Minutes
      /** The local day, as `2026-10-05`: the calendar redraws when it turns. */
      today: string
    }
  }
}
