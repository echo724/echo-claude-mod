# pomodoro

A pomodoro timer inside Claude Code: focus and break phases that follow one
another, shown in the hint line under the prompt or as a dial above it.

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
| `/pomo-clock` | Show as a dial above the prompt |
| `/pomo-line` | Show in the hint line under the prompt |

Type `/pomo` and the typeahead lists them all. `/pomo skip`, `/pomo reset`,
`/pomo 50 10`, `/pomo clock` and `/pomo line` work too.

- Focus is 25 minutes and a break 5 until you set others: focus 1 to 180,
  break 1 to 60. New lengths apply from the next phase that starts.
- A toast says when a phase ends, and the next one starts by itself.
- The dial's hand turns clockwise from twelve, and the shaded part is the time
  left. Its colors are your theme's: error for focus, success for a break,
  inactive while paused.
- The lengths and the display you picked are kept across sessions. A running
  timer is not: it ends with the session.

## Requirements

Written against Claude Code 2.1.289. Mods are an early-access API that moves
between releases, so a later build may need an update here.

## Develop

```
claude plugin validate mods/pomodoro
claude plugin test mods/pomodoro
claude --plugin-dir mods/pomodoro
```
