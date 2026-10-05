# pomodoro

A pomodoro timer inside Claude Code: focus and break phases that follow one
another, shown in the hint line under the prompt or as a dial above it. One
timer for all your sessions, and a log of the time you focused and rested.

```
⠀⠀⠐⠀⠀⠃⠀⠂⠀⠀
⠐⠀⣰⣾⣿⠀⠀⠀⠀⠂   17:30
⠤⠀⣿⣿⠰⠦⢄⣀⠀⠤   ━━╌╌╌╌╌╌
⠠⠀⠹⢿⣿⣿⡿⠏⠀⠄   FOCUS  #1
⠀⠀⠠⠀⠀⡄⠀⠄⠀⠀
```

```
? for shortcuts  FOCUS 17:30 #1 ━━╌╌╌╌╌╌
```

## Install

In Claude Code:

```
/plugin marketplace add echo724/echo-claude-mod
/plugin install pomodoro@echo-claude-mod
```

Then run `/reload-plugins`, or start a new session.

## Uninstall

```
/plugin uninstall pomodoro@echo-claude-mod
```

## Use

| Command | What it does |
| --- | --- |
| `/pomo` | Start, pause or resume |
| `/pomo-skip` | Jump to the next phase |
| `/pomo-reset` | Stop and clear the timer |
| `/pomo-set <focus> [break]` | Set the minutes, e.g. `/pomo-set 50 10` |
| `/pomo-stats` | Time focused and rested, today and in all |
| `/pomo-clock` | Show as a dial above the prompt |
| `/pomo-line` | Show in the hint line under the prompt |

Type `/pomo` and the typeahead lists them all. `/pomo skip`, `/pomo reset`,
`/pomo stats`, `/pomo 50 10`, `/pomo clock` and `/pomo line` work too.

- Focus is 25 minutes and a break 5 until you set others: focus 1 to 180,
  break 1 to 60. New lengths apply from the next phase that starts.
- A toast says when a phase ends, and the next one starts by itself.
- The dial is a visual timer: a disk that is solid for the time left and
  empties clockwise from twelve, a hand on its moving edge, and a dotted scale
  round the rim. Its colors are your theme's: error for the disk during focus
  (success for a break, inactive while paused), text for the hand, inactive for
  the scale.
- There is one timer for all your sessions. Start it in one and every other
  shows it; pause it anywhere and it pauses everywhere. Close Claude Code and
  it keeps running: the next session picks it up where the clock now stands.
- A phase that runs out while no session is open is logged, and the timer
  stops there instead of cycling on unwatched.
- Every phase is logged by day: the time it ran, and a round for each focus
  that ran its whole length. A phase you skip or reset counts for the time it
  did run; paused time never counts. `/pomo-stats` prints it:

  ```
  Today     focus 1h 40m (4 rounds) · break 20m
  All time  focus 12h 05m (29 rounds) · break 2h 25m · since 2026-10-05
  ```

- The lengths, the display you picked, the timer and the log are kept across
  sessions.

## Requirements

Written against Claude Code 2.1.289. Mods are an early-access API that moves
between releases, so a later build may need an update here.

## Develop

```
claude plugin validate mods/pomodoro
claude plugin test mods/pomodoro
claude --plugin-dir mods/pomodoro
```
