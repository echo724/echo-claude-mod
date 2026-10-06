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

/** What fills a cell of the well: a piece by its shape, a scrap, or the floor. */
export type Block = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'bit' | 'floor'

/** A piece on its way down: its cells from its top left, and where it rests. */
export type Falling = {
  block: Block
  cells: [number, number][]
  column: number
  row: number
  rest: number
}

/** The context window as a well of blocks, a cell a hundredth of it. */
export type Well = {
  /** What has settled, top row first. */
  rows: (Block | null)[][]
  falling: Falling | null
  /** Cells the turns added that have yet to fall. */
  owed: number
  /** Frames a line clear still flashes for, and the cells left after it. */
  flash: number
  clearTo: number
  /** What the next piece and its column are drawn off. */
  seed: number
  /** The window's fill at the last reading; none before its first response. */
  tokens: number | null
  window: number
  /** Tokens the last turn added; none when there is no turn before it. */
  added: number | null
  turn: number
  /** Where auto-compaction runs, in tokens, read for a window of `limitFor`. */
  limit: number | null
  limitFor: number
}

/** The widgets there are, by the name a command switches each with. */
export type WidgetId = 'pomo' | 'calendar' | 'context'

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
      well: Well
    }
  }
}
