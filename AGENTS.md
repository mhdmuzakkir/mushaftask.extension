<!-- From: mushaftask.extension/AGENTS.md -->
# Mushaf Task Manager — Agent Guide

> **Purpose**: Essential context for AI coding agents working on this project. Read this first before making any changes.

---

## Project Overview

**Mushaf Task Manager** is an Adobe CEP (Common Extensibility Platform) panel extension for Adobe Illustrator. It manages the digital typesetting workflow for Quran (Mushaf) pages across multiple Riwayahs (recitation methods / readings). Designers use it to open Quran page files, track task completion, navigate by Surah/Ayah, and move files through an organized pipeline: **In Progress → Review → Completed**.

| Attribute | Value |
|-----------|-------|
| Host Application | Adobe Illustrator (ILST) |
| CEP Version | 11.0 (CSXS.11) |
| Extension Type | Panel (`Type: Panel` in manifest) |
| Panel Size | 320×800px default; min 280×400px; max 500×2000px |
| Total Pages | 604 (standard Madani Mushaf) |

The extension targets Windows primarily. All UI text is in English; Arabic content uses the `DGShamael` and `DIN Next Arabic` fonts.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | HTML5, CSS3, Vanilla JavaScript | No frameworks. Single-page panel UI in `index.html`. |
| Illustrator Integration | ExtendScript (JSX) | `jsx/hostscript.jsx` — file ops, open/close/save, PDF/PNG export. |
| CEP Bridge | `CSXS/lib/CSInterface.js` | Custom minified wrapper around `window.__adobe_cep__`. |
| File I/O | Node.js APIs (`fs`, `path`, `os`) | Available because `--enable-nodejs` + `--mixed-context` are set in `manifest.xml`. |
| Data Storage | JSON files on disk | No database. All state stored in flat JSON files within a user-selected "tasks folder". |
| Styling | CSS Variables (dark theme) | Matches Adobe Illustrator's dark mode aesthetic. Base font size: 12px. |

**Critical constraint**: This is a CEP extension, not a standard web app. ES6 modules (`import`/`export`) are **not used**. Scripts load via traditional `<script>` tags. Node.js APIs are available directly via `require()` in the mixed context.

---

## Project Structure

```
mushaftask.extension/
├── CSXS/
│   ├── manifest.xml          # CEP extension manifest (host: ILST, version 7.0)
│   └── lib/
│       └── CSInterface.js    # Minified CEP bridge library
├── css/
│   ├── styles.css            # All UI styles (~3515 lines, dark theme)
│   ├── mushaf_info.json      # Quran surah/page statistics (9568 lines)
│   ├── DGShamael-Regular.ttf # Arabic typeface
│   ├── surah_names.ttf       # Surah name typeface
│   └── DIN NEXTT ARABIC *.otf# Arabic font family
├── js/
│   ├── main.js               # Application orchestrator (~230 lines)
│   └── modules/              # Modular architecture (22 files, IIFE pattern)
│       ├── core-globals.js   # state, authState, Node.js module refs
│       ├── config.js         # Page→Juz mapping, path utilities
│       ├── utils.js          # Pure utility functions
│       ├── api.js            # Placeholder for future server API
│       ├── illustrator.js    # CEP bridge: browseFolder, getActiveDocumentInfo
│       ├── settings.js       # Load/save ~/Documents/MushafTaskManager/settings.json
│       ├── mushaf-data.js    # Parse css/mushaf_info.json
│       ├── user-assignments.js # Surah range assignments per user
│       ├── task-manager.js   # Task CRUD, completion markers
│       ├── file-manager.js   # File moves, create riwayah, folder scaffolding
│       ├── ui-core.js        # Rendering tasks, progress bars, location display
│       ├── queue-manager.js  # Review & In Progress scanning, filtering, caching
│       ├── batch-export.js   # (merged into export.js) PDF/PNG export
│       ├── export.js         # Batch PDF/PNG export via ExtendScript
│       ├── multi-select.js   # Bulk selection in queues
│       ├── keyboard.js       # Keyboard shortcuts
│       ├── polling.js        # Auto-refresh system (3 modes)
│       ├── quotes.js         # Quote display, user quotes, complaints
│       ├── complaints.js     # Quote complaint review modal
│       ├── auth.js           # SHA256 password hashing, login/logout, user CRUD
│       ├── activity-stats.js # Activity logging, stats, CSV export
│       ├── admin.js          # Admin controls
│       ├── updater.js        # GitHub self-update (AppData installs)
│       └── event-wiring.js   # DOM event listener setup
├── jsx/
│   └── hostscript.jsx        # ExtendScript for Illustrator communication
├── index.html                # Extension panel UI (single HTML file)
├── install-or-update.bat     # Admin installer for Program Files (x86)
├── install.bat               # **User installer** for AppData (no admin required)
├── version.json              # Version info for update checker
├── settings.json             # Template placeholder (real config lives in ~/Documents/)
├── .debug                    # CEP debug config (port 8088 for ILST)
├── quran.png                 # Extension icon
└── assets/
    ├── quotes.json           # Master Arabic quotes database
    └── icons/                # SVG icons
```

### Module Loading Order

`index.html` loads modules in this order (each must be ready before the next):

1. `core-globals.js` — defines `state`, `authState`, `fs`, `path`, `os`
2. `config.js` — `window.MushafConfig`
3. `utils.js` — `window.MushafUtils`
4. `api.js` — `window.MushafAPI` (placeholder)
5. `illustrator.js` — `window.MushafAI`
6. `settings.js` — `saveSettings()`, `loadSettings()`
7. `mushaf-data.js` — Surah/Ayah navigation
8. `user-assignments.js` — `USER_ASSIGNMENTS`
9. `task-manager.js` — Task CRUD
10. `file-manager.js` — File operations
11. `ui-core.js` — UI rendering
12. `queue-manager.js` — Queue scanning
13. `polling.js` — Auto-refresh
14. `export.js` — Batch export
15. `multi-select.js` — Multi-select mode
16. `keyboard.js` — Shortcuts
17. `quotes.js` — Quotes system
18. `complaints.js` — Complaint review
19. `auth.js` — Authentication
20. `activity-stats.js` — Stats
21. `admin.js` — Admin UI
22. `updater.js` — Self-update
23. `event-wiring.js` — Event wiring
24. `main.js` — Orchestrator

**Important**: Because scripts are loaded sequentially via `<script>` tags and use global functions, later modules can call functions defined in earlier modules. There is no explicit module system — dependencies are implicit through load order.

---

## Build and Test Commands

### No Build System

This project has **no build process**, **no package manager**, and **no bundler**. There is no `package.json`, `pyproject.toml`, `Cargo.toml`, `webpack.config.js`, or equivalent.

- Edit files directly.
- Changes take effect after restarting Illustrator or reloading the extension.
- There is no transpilation step.

### Installation Locations

Adobe CEP loads extensions from **multiple locations**:

| Location | Path | Admin Required | Self-Update |
|----------|------|---------------|-------------|
| User (recommended) | `%APPDATA%\Adobe\CEP\extensions\mushaftask.extension\` | **No** | **Yes** — via in-panel updater |
| System (x86) | `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\mushaftask.extension\` | Yes | No — use `install-or-update.bat` |
| System (x64) | `C:\Program Files\Common Files\Adobe\CEP\extensions\mushaftask.extension\` | Yes | No — use `install-or-update.bat` |

**Preferred**: `install.bat` installs to `%APPDATA%` without requiring Administrator privileges. This is the recommended method because:
- No UAC prompts
- The in-panel **GitHub updater** (`js/modules/updater.js`) can self-update from Settings
- No risk of permission issues during file operations

### Installing for Development / Debugging

**Option A — User Install (Recommended)**:
1. Run `install.bat` (double-click, no admin needed)
2. Enable CEP debugging in the registry:
   ```
   HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11 -> PlayerDebugMode = 1
   ```
3. Open Illustrator → Window → Extensions → Mushaf Task Manager
4. Debug via Chrome at `http://localhost:8088` (configured in `.debug`)

**Option B — Manual Copy**:
1. Copy the extension folder to `%APPDATA%\Adobe\CEP\extensions\mushaftask.extension\`
2. Enable debug mode as above
3. Open in Illustrator

### Installer Scripts

- `install.bat` — **No admin required**. Clones/pulls from GitHub to `%APPDATA%\Adobe\CEP\extensions\mushaftask.extension\` (or ZIP fallback if Git is missing)
- `install-or-update.bat` — **Requires Administrator**. Targets `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\mushaftask.extension\`

### Self-Update Mechanism

Because Illustrator may be blocked by application firewalls from making outbound network requests, the updater uses **external batch files** that run outside the Illustrator process context.

**Files involved:**
- `check-update.bat` — Downloads `version.json` from GitHub using PowerShell (bypasses Illustrator firewall rules)
- `update.bat` — Performs the actual update (ZIP download + PowerShell `Expand-Archive` + `robocopy`)
- `js/modules/updater.js` — Spawns the batch files via Node.js `child_process` and reads their result files
- `version.json` — Tracks current version; compared against the remote copy on GitHub

**How it works:**

1. On startup (10s delay), the panel spawns `check-update.bat` via `child_process.exec`. The batch writes its result to `%TEMP%\mushaftask-update\status.json` and downloads the remote `version.json`.
2. The panel reads the status file and compares versions. If a newer version exists and the extension is in a user-writable location (`AppData`), a green badge appears on the Settings tab.
3. In Settings → "Extension Update", the user can click **Check for Updates** to run the batch again, then **Install Update** to run `update.bat`.
4. `update.bat` downloads the ZIP from GitHub, extracts via PowerShell `Expand-Archive`, and copies files with `robocopy` (with `xcopy` fallback on codes ≥ 8).
5. On success, a **green restart banner** appears in the Settings panel with a **"Restart Illustrator"** button. The user must click it manually — auto-restart was removed for reliability.

**Batch argument contract:** `updater.js` passes `[extensionPath]` to `update.bat`. The batch uses this to skip `pause` (via `if "%~1"=="" pause`) and know where to copy files.

**Firewall / Offline Fallback:**

If `child_process.exec` is also blocked by the firewall (or the batch fails for any reason), the updater falls back to a **cached** `remote-version.json` if it exists and is less than 60 minutes old. The user can also:

1. Run `check-update.bat` manually from Windows Explorer (right-click → Open)
2. Return to Illustrator and click **Check for Updates** again
3. The panel will pick up the freshly downloaded `remote-version.json`

The same applies to `update.bat` for installation.

**Limitations:**
- Program Files installations cannot self-update (permission denied). The updater detects this and directs the user to `install-or-update.bat` as Administrator.
- Files actively in use by CEF may fail to copy; the updater logs these but does not block. A restart is required regardless.
- The batch files require PowerShell (available on all Windows versions since XP SP2) for download and extraction.

### Testing

There is **no automated test suite**. Testing is entirely manual. When modifying code, verify:

1. **Panel loads** without console errors in Illustrator.
2. **First-time setup** — folder selection modal works; `settings.json` is created in `~/Documents/MushafTaskManager/`.
3. **Login** — user select, password set/verify, admin detection (`muzakkir` is hardcoded as the default admin).
4. **File open** — Surah/Ayah lookup finds the correct page; "Go" button opens the `.ai` file in Illustrator.
5. **Task toggle** — checking/unchecking project tasks and page tasks persists to JSON in `page-tasks/{riwayah}/`.
6. **Move to Completed** — file moves from `Ajza/` or `Review Task/` to `Completed/Ajza/`, document saves and closes, activity is logged.
7. **Queue refresh** — Review and In Progress lists update after file operations.
8. **Stats tab** — activity logs load and filter by today/week/month.
9. **Keyboard shortcuts** — Ctrl+Shift+N (next page), Ctrl+Shift+P (prev page), Ctrl+Shift+R (refresh UI).
10. **Batch export** — PDF/PNG export via ExtendScript works for selected page ranges.
11. **Updater** — Settings shows correct version, check for updates works, install flow completes, restart banner appears.
12. **Changelog popup** — After updating, the "What's New" modal appears on next login.

---

## Code Organization and Main Modules

Logic is split across `js/main.js` (orchestrator) and `js/modules/*.js` (functional sections). All modules use the **IIFE pattern** exposed on `window`.

### Key Global Objects

- `state` — Central application state (current file, tasks, queues, filters, cached file lists). Defined in `core-globals.js`.
- `authState` — Authentication state (`currentUser`, `isAdmin`, `config`, `configPath`). Defined in `core-globals.js`.
- `CSInterface` — CEP bridge (from `CSXS/lib/CSInterface.js`).
- `fs`, `path`, `os` — Node.js modules (loaded via `require()` in mixed context; guarded with `typeof require !== 'undefined'`).
- `USER_ASSIGNMENTS` — Object mapping lowercase usernames to `{ name, riwayah, surahRange }`.
- `QUOTES` — Array of inspirational quotes.

### Tab Navigation

The UI has five tabs plus modals:

- **HOME** (`#homeTab`) — Main workspace: file open, tasks, review queue, in-progress queue.
- **REVIEW** (`#reviewTab`) — Review queue with multi-select and batch export.
- **IN PROGRESS** (`#inProgressTab`) — In-progress files with user/riwayah filters.
- **STATS** (`#statsTab`) — Activity statistics with today/week/month filters. Export CSV is hidden.
- **SETTINGS** (`#settingsTab`) — Folder paths, password change, performance mode, auto-open, admin controls, updater.

---

## Runtime Architecture

### CEP Context

The extension runs inside Adobe Illustrator's CEF (Chromium Embedded Framework) panel with these command-line flags (from `manifest.xml`):

- `--enable-nodejs` — Node.js APIs available.
- `--mixed-context` — JSX and JS share context.
- `--enable-file-cookies` — File protocol cookie support.
- `--enable-es6-apis` — Limited ES6 API support.

### Communication Flow

```
User clicks in HTML panel
    ↓
JavaScript in modules
    ↓
CSInterface.evalScript('extendScriptFunction()')
    ↓
window.__adobe_cep__.evalScript()
    ↓
jsx/hostscript.jsx executes in Illustrator
    ↓
Callback returns result to JS (always as a string)
```

### Data Storage Locations

**Extension settings** (auto-created):
```
%USERPROFILE%\Documents\MushafTaskManager\settings.json
```
Stores: `tasksFolder`, `projectFolder`, `lastSelectedRiwayah`, `lastSearchedSurah`, `lastSearchedAyah`, `updateMode`, `autoOpenNextPage`, `inProgressUserFilter`, `inProgressRiwayahFilter`, `currentUser`, `rememberMe`.

**Project data** (user-selected "Tasks Folder", typically named `mushaftasks/`):
```
mushaftasks/
├── config.json                 # Users and password hashes
├── riwayah-colors.json         # Riwayah badge colors
├── user-assignments.json       # Surah range assignments (auto-generated)
├── page-tasks/{riwayah}/{page}-tasks.json
├── riwayah-tasks/{riwayah}/riwayah-tasks.json
├── completed/{riwayah}/{page}-completed.json
├── pt-completed/{riwayah}/{page}-pt-completed.json
├── review-queue/{riwayah}/
└── activity/activity-{username}.json
```

**Illustrator files** (user-selected "Project Folder"):
```
{Riwayah}/
├── Ajza/{01-30}/{page}-{riwayah}.ai        # In progress
├── Review Task/{page}-{riwayah}.ai         # Needs review
└── Completed/Ajza/{01-30}/{page}-{riwayah}.ai  # Done
```

---

## Code Style Guidelines

### JavaScript

- **No ES6 modules** — Use traditional script loading and global namespace. All modules are IIFEs exposed on `window`.
- **Var / let / const mixed** — Older code uses `var`; newer additions use `let`/`const`. Do not mass-refactor; follow the surrounding style.
- **Functions are hoisted** — Everything is declared with `function name() {}`.
- **Promises used sparingly** — Mostly callback-based because CEP `evalScript` uses callbacks. Some newer async functions use `async/await` or Promise wrappers for batch operations.
- **Console logging is heavy** — Extensive `console.log()` statements are the primary debugging mechanism for Illustrator panel development. **Do not remove existing logs.** Add new ones liberally when debugging.
- **Path separators** — Always use `path.join()`; Windows paths are the primary target but code should handle both separators.
- **ExtendScript returns strings** — Even booleans and `null` come back as strings from `evalScript()`. The JSX side returns `"null"` (string) for null/undefined and prefixes errors with `"ERROR: "`.

### CSS

- CSS custom properties (variables) in `:root` for theming.
- Dark theme matching Adobe Illustrator native panels.
- `direction: ltr` on most elements; `direction: rtl` only on `.arabic-text`.
- Font size base: 12px.
- Utility class `.hidden` uses `display: none !important`.

### File Naming Conventions

- AI files: `{page}-{riwayah}.ai` (e.g., `001-Hafs.ai`)
- JSON markers: `{page}-tasks.json`, `{page}-pt-completed.json`, `{page}-completed.json`
- Page numbers are 3-digit, zero-padded (001–604)
- Riwayah names are alphanumeric with no spaces

---

## Security Considerations

1. **Password Storage**: SHA256 hashed with a custom inline implementation (not bcrypt/scrypt). Located in `js/modules/auth.js` around line 1. Password hashes are stored in `mushaftasks/config.json`.
2. **No HTTPS**: The related web viewer and daily report system use HTTP (server limitation per docs).
3. **FTP Credentials**: Plain-text credentials are documented in `PROJECT_PROGRESS.md` for the separate PHP endpoint (`receive.php`), which is **not** in this repository.
4. **API Keys**: The Google Apps Script integration uses a configurable `API_KEY` that must be changed from defaults before production.
5. **Local File Access**: The extension has full filesystem access via Node.js `fs` to the user-selected tasks and project folders.
6. **Public Reports**: The daily report viewer is publicly accessible with no authentication.
7. **Hardcoded Admin**: The user `muzakkir` is created automatically as admin if `config.json` does not exist.
8. **Self-Updater**: Downloads code from GitHub over HTTPS and executes file copy operations. Only runs from user-writable paths (`AppData`). Program Files paths are blocked.

---

## Related Systems (Not in This Repo)

This repository contains **only the CEP extension**. The full Mushaf Task Manager ecosystem includes:

- **Web Viewer**: `mushaf.linuxproguru.com` — PHP-based Quran page viewer (not in repo; documented in `PROJECT_PROGRESS.md` and `WORKFLOW.md`).
- **Daily Reports**: Google Apps Script + PHP endpoint (`receive.php`) — automated nightly reports (not in repo).
- **Google Drive**: Activity logs and file storage synced manually or via GAS.

These are documented in `PROJECT_PROGRESS.md`, `SETUP_CHECKLIST.md`, and `WORKFLOW.md` but their source code lives in separate repositories or server environments. The `.gitignore` explicitly excludes `mushaf.linuxproguru.com/*` and `google-scripts/*`.

---

## Common Pitfalls for Agents

1. **Do not add ES6 module imports** — CEP does not support `import/export` in this configuration. Use IIFEs exposed on `window` if creating new modules.
2. **Do not delete `console.log` statements** — They are the primary debugging mechanism for Illustrator panel development.
3. **Path separators** — Always use `path.join()`; Windows paths are the primary target but code should handle both.
4. **ExtendScript returns strings** — Even booleans/nulls come back as strings from `evalScript()`. Check for `"null"`, `"undefined"`, and `"Error"`.
5. **Node.js availability** — Check `typeof require !== 'undefined'` before using `fs`/`path`/`os`; graceful degradation is expected.
6. **Queue caching** — `state.cachedReviewFiles` and `state.cachedInProgressFiles` are used to avoid repeated disk scans. Always call `invalidateQueueCache()` after file operations that affect queues.
7. **Activity logging wraps `moveToCompleted`** — The original `moveToCompleted` is stored and replaced with a wrapper that logs activity. When modifying file-move logic, ensure the wrapper still fires or update the wrapper accordingly.
8. **Self-update safety** — The updater module checks `isUserInstall()` before allowing file copy. Do not bypass this check; overwriting Program Files without elevation will fail silently or throw EPERM.
9. **Script load order matters** — If adding a new module, insert it in `index.html` before `event-wiring.js` and after its dependencies. Register any new `window` globals in `core-globals.js` if they need to be shared.
10. **Version tracking (3 locations + changelog)** — When releasing, update:
    - `version.json` → `"version"`
    - `js/modules/updater.js` → `CURRENT_VERSION`
    - `CSXS/manifest.xml` → `ExtensionBundleVersion` and `Extension Version`
    - `js/modules/utils.js` → `CHANGELOG` — add entry so the "What's New" popup shows correctly
    The updater reads `version.json` from the `main` branch raw URL.
11. **Batch-based updater** — The updater spawns `check-update.bat` / `update.bat` via Node.js `child_process`. `updater.js` must call `update.bat` (not `do-update.bat`). If modifying the update flow, ensure the batch files and `updater.js` stay in sync. The batch files write JSON to `%TEMP%\mushaftask-update\status.json`.
12. **Custom confirm modal** — Never use native `confirm()`. Use `showConfirm(message, onConfirm, onCancel)` from `js/modules/utils.js`. It provides a dark-themed modal consistent with the panel UI.
13. **No forced re-login on every update** — First install (`lastSeenVersion == null`) forces login. Version changes only set a flag to show the changelog on next login.

---

*Last updated: April 26, 2026*
