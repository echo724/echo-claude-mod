# echo-claude-mod

Mods for Claude Code. Install and usage notes live in each mod's own README.

## echo-widget

[mods/echo-widget](mods/echo-widget/README.md)

Widgets above the prompt, each in its own box, switched on or off by a command:

```
                           ╭──────────────────────╮
                           │     October 2026     │
╭────────────────────────╮ │ Su Mo Tu We Th Fr Sa │
│ ⠀⠀⠐⠀⠀⠃⠀⠂⠀⠀             │ │              1  2  3 │
│ ⠐⠀⣰⣾⣿⠀⠀⠀⠀⠂   17:30     │ │  4  5  6  7  8  9 10 │
│ ⠤⠀⣿⣿⠰⠦⢄⣀⠀⠤   ━━╌╌╌╌╌╌  │ │ 11 12 13 14 15 16 17 │
│ ⠠⠀⠹⢿⣿⣿⡿⠏⠀⠄   FOCUS  #1 │ │ 18 19 20 21 22 23 24 │
│ ⠀⠀⠠⠀⠀⡄⠀⠄⠀⠀             │ │ 25 26 27 28 29 30 31 │
╰────────────────────────╯ ╰──────────────────────╯
```

| Command | What it does |
| --- | --- |
| `/echo-widget` | List the widgets and whether each is on |
| `/echo-widget <name>` | Switch one on or off: `pomo` or `calendar` |
| `/pomo` | Start, pause or resume |
| `/pomo-skip` | Jump to the next phase |
| `/pomo-reset` | Stop and clear the timer |
| `/pomo-set <focus> [break]` | Set the minutes, e.g. `/pomo-set 50 10` |
| `/pomo-stats` | Time focused and rested, today and in all |

## pomodoro

The pomodoro timer by itself, without the widget boxes.


[mods/pomodoro](mods/pomodoro/README.md)

As a dial above the prompt:

```
⠀⠀⠐⠀⠀⠃⠀⠂⠀⠀
⠐⠀⣰⣾⣿⠀⠀⠀⠀⠂   17:30
⠤⠀⣿⣿⠰⠦⢄⣀⠀⠤   ━━╌╌╌╌╌╌
⠠⠀⠹⢿⣿⣿⡿⠏⠀⠄   FOCUS  #1
⠀⠀⠠⠀⠀⡄⠀⠄⠀⠀
```

The disk is the time left: it takes your theme's error color (success during a
break), the hand its text color, and the scale its inactive color.

Or in the hint line under the prompt:

```
? for shortcuts  FOCUS 17:30 #1 ━━╌╌╌╌╌╌
```

| Command | What it does |
| --- | --- |
| `/pomo` | Start, pause or resume |
| `/pomo-skip` | Jump to the next phase |
| `/pomo-reset` | Stop and clear the timer |
| `/pomo-set <focus> [break]` | Set the minutes, e.g. `/pomo-set 50 10` |
| `/pomo-stats` | Time focused and rested, today and in all |
| `/pomo-clock` | Show as a dial above the prompt |
| `/pomo-line` | Show in the hint line under the prompt |
