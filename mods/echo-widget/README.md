# echo-widget

Widgets above the prompt in Claude Code. Each sits in a rounded box of its
own, and a command switches it on or off. Three so far: a pomodoro timer, a
calendar and the context window as a game of Tetris.

![A pomodoro timer, a calendar and the context window as Tetris, each in a rounded box](../../docs/echo-widget.svg)

## Install

In Claude Code:

```
/plugin marketplace add echo724/echo-claude-mod
/plugin install echo-widget@echo-claude-mod
```

Then run `/reload-plugins`, or start a new session.

## Uninstall

```
/plugin uninstall echo-widget@echo-claude-mod
```

## Widgets

All are on after install. The choice is kept across sessions. The boxes sit
side by side on the line above the prompt, each as tall as its content.

| Command | What it does |
| --- | --- |
| `/echo-widget` | List the widgets and whether each is on |
| `/echo-widget pomo` | Switch the pomodoro timer on or off |
| `/echo-widget calendar` | Switch the calendar on or off |
| `/echo-widget context` | Switch the context well on or off |

### Pomodoro

| Command | What it does |
| --- | --- |
| `/pomo` | Start, pause or resume the timer |
| `/pomo-skip` | Jump to the next phase |
| `/pomo-reset` | Stop and clear the timer |
| `/pomo-set <focus> [break]` | Set the minutes, e.g. `/pomo-set 50 10` |
| `/pomo-stats` | Time focused and rested, today and in all |

`/pomo skip`, `/pomo reset`, `/pomo stats` and `/pomo 50 10` work too. Type
`/pomo` and the typeahead lists every command.

- Focus is 25 minutes and a break 5 until you set others: focus 1 to 180,
  break 1 to 60. New lengths apply from the next phase that starts.
- The disk is the time left and empties clockwise from twelve. Its colors are
  your theme's: error during focus, success for a break, inactive while paused.
- A break starts by itself when a focus ends. The next focus does not: it
  waits, shown as `READY`, until you run `/pomo`, so the timer never cycles on
  and logs focus you did not do.
- While a phase runs, the timer's box takes its color for a border: red
  through a focus, green through a break. Paused or waiting, it is plain.
- A chime plays when a phase ends: rising after a focus, falling after a
  break. It plays on macOS only, and in the one session that saw the phase out.
- There is one timer for all your sessions, and it keeps running while Claude
  Code is closed. A phase that runs out with no session open is logged, and the
  timer stops there.
- Every phase is logged by day. A phase you skip or reset counts for the time
  it did run; paused time never counts.
- The box shows only while a timer is set: `/pomo` brings it up and
  `/pomo-reset` takes it away. Starting the timer also switches the widget on,
  and switching the widget off hides the timer without stopping it.

### Calendar

The current month, a week a row, with today marked in your theme's Claude
color, Sundays in its error color and Saturdays in its suggestion color. It
turns over by itself at midnight.

### Context

The session's context window as a well of Tetris blocks, ten cells by ten: a
cell is a hundredth of the window, so the well is full when the window is.

- What is there at the first reading (the system prompt, the tools) is the
  grey floor. After that, each turn drops what it added as pieces: a
  tetromino for every four cells and a white scrap for the rest.
- Pieces land the way a fair player's would, with a hole here and there, so
  the pile's height is roughly the fill and the count of cells is exactly it.
  The figures beside the well are exact: the share, the tokens of the window,
  what the last turn added, and the turn.
- A piece's color is its shape's, the classic ones as near as your theme has
  them.
- The dotted line is where auto-compaction runs. The walls turn your theme's
  warning color at four fifths of the way there and its error color, with
  `GAME OVER`, just short of it.
- A compaction or `/clear` is a line clear: the pile flashes and goes, a toast
  gives the size before and after, and what the summary takes comes back as
  the floor at the next turn.

## Add a widget

A widget is a function that returns its box's lines, each a list of spans
with a theme color (`hooks/widget.ts`). `hooks/calendar.ts` is the smallest
one. Add its name to `WidgetId` in `types/index.d.ts` and to `WIDGETS` in
`hooks/register.tsx`, and draw it in the `AbovePrompt` hook.

## Requirements

Written against Claude Code 2.1.289. Mods are an early-access API that moves
between releases, so a later build may need an update here.

## Develop

```
claude plugin validate mods/echo-widget
claude plugin test mods/echo-widget
claude --plugin-dir mods/echo-widget
```
