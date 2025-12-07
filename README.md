# Claude Usage Monitor

![screenshot](https://raw.githubusercontent.com/nanase/vscode-claude-usage/refs/heads/main/docs/img/screenshot.png)

VSCode extension to display Claude API usage in the status bar.

## Features

- Display Claude usage (5-hour and 7-day utilization) in the status bar
- Show reset times in tooltip with countdown
- Automatic refresh at configurable intervals

## Installation

1. Download the `.vsix` file from releases
2. In VSCode, open Command Palette (`Ctrl+Shift+P`)
3. Run `Extensions: Install from VSIX...`
4. Select the downloaded file

## Setup

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `Claude Usage: Setup Credentials`
3. Enter your Claude session key
4. Enter your Claude organization ID

### How to get credentials

1. **Session Key**: Open Claude.ai in browser, open DevTools (F12), go to Application > Cookies > claude.ai, copy the `sessionKey` value
2. **Organization ID**: In Claude.ai, open DevTools Network tab, look for API requests to `/api/organizations/{org-id}/...`, the UUID in the URL is your organization ID

## Commands

| Command | Description |
|---------|-------------|
| `Claude Usage: Setup Credentials` | Set session key and organization ID |
| `Claude Usage: Refresh Usage` | Manually refresh usage data |
| `Claude Usage: Clear Credentials` | Remove stored credentials |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `claudeUsage.refreshInterval` | `5` | Refresh interval in minutes |
| `claudeUsage.refreshOnlyWhenFocused` | `true` | Only auto-refresh when the window is focused (reduces duplicate API calls when multiple windows are open) |

## Status Bar Display

Format: `Claude: {5-hour}% / {7-day}%`

Hover over the status bar item to see:
- 5-hour utilization with reset time
- 7-day utilization with reset time
- Time remaining until reset

## Disclaimer

**USE AT YOUR OWN RISK**

This extension uses Claude's unofficial/internal API to retrieve usage data. The author is not responsible for any consequences resulting from the use of this extension.

This extension only retrieves usage data. However, please understand the risks before using it. 😉

## License

MIT
