# echo-claude-mod

Mods for Claude Code. Install and usage notes live in each mod's own README.

## echo-widget

[mods/echo-widget](mods/echo-widget/README.md)

Widgets above the prompt, each in its own box, switched on or off by a command:

![A pomodoro timer, a calendar and the context window as Tetris, each in a rounded box](docs/echo-widget.svg)

| Command | What it does |
| --- | --- |
| `/echo-widget` | List the widgets and whether each is on |
| `/echo-widget pomo` | Switch the pomodoro timer on or off |
| `/echo-widget calendar` | Switch the calendar on or off |
| `/echo-widget context` | Switch the context well on or off |
| `/pomo` | Start, pause or resume the timer |
| `/pomo-skip` | Jump to the next phase |
| `/pomo-reset` | Stop and clear the timer |
| `/pomo-set <focus> [break]` | Set the minutes, e.g. `/pomo-set 50 10` |
| `/pomo-stats` | Time focused and rested, today and in all |
