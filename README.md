# Mushaf Task Manager

Adobe Illustrator CEP panel extension for managing Quran (Mushaf) digital typesetting workflows across multiple Riwayahs (recitation methods).

## Features

- **File Management** — Open, navigate, and organize Quran page `.ai` files by Surah/Ayah or page number
- **Task Tracking** — Project-wide and page-specific task lists with completion markers
- **Review Queue** — Track files needing review with multi-select bulk operations
- **In Progress Queue** — Filter and monitor active work by user and Riwayah
- **Activity Statistics** — Track daily/weekly/monthly completion stats with user breakdowns
- **Self-Updater** — In-panel update checker and installer (no admin required for AppData installs)
- **Admin Controls** — User management, password resets, and moderation tools

## Installation

### Quick Install (Recommended)

1. Download or clone this repository
2. Double-click **`install.bat`** — installs to `%APPDATA%\Adobe\CEP\extensions\` (no admin required)
3. Enable CEP debug mode in registry:
   ```
   HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11 -> PlayerDebugMode = 1
   ```
4. Open Adobe Illustrator → Window → Extensions → **Mushaf Task Manager**

### Manual Install

Copy the `mushaftask.extension` folder to:
```
%APPDATA%\Adobe\CEP\extensions\mushaftask.extension\
```

## System Requirements

- Adobe Illustrator CC 2021 or newer
- Windows 10/11
- PowerShell (for updater batch files)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| UI | HTML5, CSS3, Vanilla JavaScript |
| Illustrator Bridge | ExtendScript (JSX) |
| CEP Bridge | CSInterface.js |
| File I/O | Node.js APIs (`fs`, `path`, `os`) |
| Data Storage | JSON files on disk |

## Project Structure

```
mushaftask.extension/
├── CSXS/manifest.xml         # CEP extension manifest
├── index.html                # Panel UI entry point
├── js/
│   ├── main.js               # Application orchestrator (~230 lines)
│   └── modules/              # 25 JavaScript modules (IIFE pattern)
│   ├── updater.js            # GitHub self-updater
│   ├── auth.js               # Authentication & user management
│   ├── activity-stats.js     # Activity logging & statistics
│   └── ...
├── jsx/hostscript.jsx        # ExtendScript for Illustrator
├── css/styles.css            # Dark theme panel styles
├── install.bat               # User installer (AppData, no admin)
├── check-update.bat          # Update checker (bypasses firewall)
├── update.bat                # Update installer
└── version.json              # Version source of truth
```

## Updating

The extension can self-update from the Settings panel:

1. Go to **Settings** → **Extension Update**
2. Click **Check for Updates**
3. If an update is found, click **Install Update**
4. Click **Restart Illustrator** when the green banner appears

See [`UPDATE.md`](UPDATE.md) for the full release protocol.

## Documentation

- [`AGENTS.md`](AGENTS.md) — Essential guide for developers and AI agents working on this project
- [`UPDATE.md`](UPDATE.md) — Release checklist and updater troubleshooting
- [`WORKFLOW.md`](WORKFLOW.md) — Full workflow documentation including web viewer and Google Apps Script integration

## License

Private project. All rights reserved.
