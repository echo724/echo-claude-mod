# echo-claude-mod

Mods for Claude Code. Install and usage notes live in each mod's own README.

## pomodoro

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
