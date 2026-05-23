# MushafProject Migration Plan

> Moving from `mushaftasks` + `mushaffiles` at Google Drive root → `mushafproject/mushaftasks` + `mushafproject/mushaffiles`

---

## Quick Decision Matrix

| Project | Code Changes? | Files to Edit | Effort | Who Does It |
|---------|--------------|---------------|--------|-------------|
| **mushaftask** | ✅ Yes (done) | `drive-scanner.js`, `main.js`, `event-wiring.js`, `index.html` | Low | ✅ Done |
| **mushaf-webp-exporter** | ✅ Yes | `auto-detect.js`, `index.html` | Low | You |
| **symbolPalette** | ❌ No | None | Zero | Users re-browse |
| **ornamentReplacer** | ⚠️ Maybe | `lib/main.js` (one function) | Low | You, if needed |
| **mushafweb** (server) | ✅ Yes | `cron/sync.php`, `cron/sync-all.php`, +13 API files | Medium | You |
| **mushaf-preview-server** | ❌ No | None | Zero | N/A |

---

## 1. mushaftask.extension ✅ DONE

### What's Already Done
- `drive-scanner.js` auto-discovers `mushafproject` across all drives, shortcuts, and `.shortcut-targets-by-id`
- Auto-scan runs on startup before showing Setup/Drive Missing modals
- "Auto-Detect" buttons added to Setup, Settings, and Drive Missing modals

### What You Still Need To Do
1. **Move folders in Google Drive**:
   ```
   My Drive/mushaftasks    → My Drive/mushafproject/mushaftasks
   My Drive/mushaffiles    → My Drive/mushafproject/mushaffiles
   ```
2. **Restart Illustrator** — the panel will auto-detect new paths
3. **Update rclone config** (server side) — see Section 5

---

## 2. mushaf-webp-exporter.extension

### Problem
`js/modules/auto-detect.js` searches for `mushaffiles` and `mushaftask` **directly** under the Drive root. It won't find them nested inside `mushafproject/`.

### Changes Needed

#### A. `js/modules/auto-detect.js` — `findGoogleDrivePaths()`

Find this code (around the drive scanning loop):
```javascript
const filesPath = path.join(candidate, 'mushaffiles');
const tasksPath = path.join(candidate, 'mushaftask');
```

Replace with nested search:
```javascript
// Try root-level first (backward compatibility)
let filesPath = path.join(candidate, 'mushaffiles');
let tasksPath = path.join(candidate, 'mushaftask');

// Try nested under mushafproject/
const filesPathNested = path.join(candidate, 'mushafproject', 'mushaffiles');
const tasksPathNested = path.join(candidate, 'mushafproject', 'mushaftask');

if (fs.existsSync(filesPathNested)) filesPath = filesPathNested;
if (fs.existsSync(tasksPathNested)) tasksPath = tasksPathNested;
```

#### B. `index.html` — hint text labels

Find:
```html
<span class="hint-text">(auto: mushaffiles)</span>
<span class="hint-text">(auto: mushaftask)</span>
<span class="hint-text">(auto: mushaffiles/webp)</span>
```

Replace with:
```html
<span class="hint-text">(auto: mushafproject/mushaffiles)</span>
<span class="hint-text">(auto: mushafproject/mushaftask)</span>
<span class="hint-text">(auto: mushafproject/mushaffiles/webp)</span>
```

#### C. Optional: Port `drive-scanner.js`

Instead of the above manual changes, you can **copy `mushaftask.extension/js/modules/drive-scanner.js`** into the webp exporter and use `window.DriveScanner.autoDetectAndSave()`. This gives you:
- Multi-drive scanning
- `.shortcut-targets-by-id` support
- Shortcut resolution
- Better scoring

Load order in `index.html`:
```html
<script src="js/modules/drive-scanner.js"></script>
<script src="js/modules/auto-detect.js"></script>
```

Then in `auto-detect.js`, replace `findGoogleDrivePaths()` logic with:
```javascript
function findGoogleDrivePaths() {
    if (window.DriveScanner) {
        var result = window.DriveScanner.autoDetectAndSave();
        if (result && result.success) {
            return {
                mushafFiles: result.projectFolder,
                mushafTasks: result.tasksFolder
            };
        }
    }
    // fallback to old logic...
}
```

---

## 3. symbolPalette

### Status: No Code Changes Required

`symbolPalette` has a **fully user-configurable root folder**. The path is stored in `localStorage` under `symbolPalette_data_v3`.

### What Users Do
1. Open the panel
2. Click **"Select Root Folder"**
3. Browse to the new location: `G:\My Drive\mushafproject\mushaffiles\SymbolsRoot` (or wherever `symbols/` + `numbers/` live)
4. Done

### If You Pre-Seed Paths for New Users
If you deploy with a default `localStorage` value, update the seeded path from:
```javascript
// Old
{ rootFolder: "G:/My Drive/mushaffiles/SymbolsRoot" }

// New
{ rootFolder: "G:/My Drive/mushafproject/mushaffiles/SymbolsRoot" }
```

---

## 4. ornamentReplacer

### Status: Depends on Your `projectFolder` Semantics

`ornamentReplacer` reads `~/Documents/MushafTaskManager/settings.json` to get `projectFolder` for **Riwayah-to-Riwayah Layer Copy**.

#### Scenario A: `projectFolder` still points to `mushaffiles`
If MushafTaskManager's `settings.json` stores:
```json
{
  "projectFolder": "G:/My Drive/mushafproject/mushaffiles",
  "tasksFolder": "G:/My Drive/mushafproject/mushaftasks"
}
```
→ **No code changes needed.** `ornamentReplacer` will read `projectFolder` and find riwayahs at `mushaffiles/Hafs/Ajza`.

#### Scenario B: `projectFolder` points to `mushafproject` root
If you change `projectFolder` to:
```json
{
  "projectFolder": "G:/My Drive/mushafproject"
}
```
→ **BREAKING.** `ornamentReplacer` will look for `mushafproject/Hafs/Ajza` and fail.

### Fix (if Scenario B)

In `ornamentReplacer/lib/main.js`, update `readMushafTaskSettings()`:

```javascript
function readMushafTaskSettings() {
    try {
        var settingsPath = getMushafTaskSettingsPath();
        if (!fs.existsSync(settingsPath)) return null;
        var raw = fs.readFileSync(settingsPath, 'utf8');
        var settings = JSON.parse(raw);
        
        // NEW: Support both old (projectFolder = mushaffiles) 
        // and new (projectFolder = mushafproject root) structures
        if (settings.projectFolder) {
            var projectRoot = settings.projectFolder.replace(/\\/g, '/');
            
            // If projectFolder points to mushafproject root instead of mushaffiles,
            // derive the actual files path
            if (!fs.existsSync(path.join(projectRoot, 'Hafs', 'Ajza')) &&
                fs.existsSync(path.join(projectRoot, 'mushaffiles', 'Hafs', 'Ajza'))) {
                settings.projectFolder = path.join(projectRoot, 'mushaffiles');
                console.log('ornamentReplacer: derived mushaffiles path from mushafproject root');
            }
        }
        
        return settings;
    } catch (e) {
        console.error('Error reading MushafTaskManager settings:', e);
        return null;
    }
}
```

This makes `ornamentReplacer` **backward-compatible** with both old and new structures.

---

## 5. mushafweb / mushaf.linuxproguru.com (Web Server)

### Problem
Paths are scattered across **15+ PHP files** with **no central config**. Every file has its own hardcoded `$config` array or `__DIR__ . '/../mushaftasks/'`.

### Critical Files to Change

#### A. Cron / Sync Scripts

**`cron/sync-all.php`** — already partially updated by you:
```php
// Line 7: Already has this (you updated it)
'drive_remote' => 'gdrive:/mushafproject/mushaftasks/',

// Line 6: STILL OLD — must update
'ftp_remote' => 'myftp:/mushaftasks/',
// Should be:
'ftp_remote' => 'myftp:/mushafproject/mushaftasks/',
```

**`cron/sync.php`** — all hardcoded rclone paths:
```php
// OLD (every occurrence):
gdrive:/mushaftasks/pt-completed
myftp:/mushaftasks/pt-completed
gdrive:/mushaftasks/page-tasks

// NEW:
gdrive:/mushafproject/mushaftasks/pt-completed
myftp:/mushafproject/mushaftasks/pt-completed
gdrive:/mushafproject/mushaftasks/page-tasks
```

#### B. PHP Task APIs (Local Paths)

These use `__DIR__ . '/../mushaftasks/'` — **only change if local server also restructures**:
- `api/submit.php`
- `api/get-page-tasks.php`
- `api/mark-page-tasks-done.php`
- `scripts/generate-tasks.php`
- `admin/cleanup-completed.php`
- `api/list-archived.php`

If **only Google Drive** restructures (local server stays as `mushaftasks/`):
→ **No changes needed** for these files.

#### C. WebP / Image APIs

These use `__DIR__ . '/../webp/'`:
- `api/get-files.php`
- `api/serve-file.php`
- `api/webp-upload.php`
- `api/webp-delete.php`
- `api/generate-pdf.php`
- `api/get-riwayahs.php`

If your WebP images are synced from `mushaffiles` on Drive to `webp/` on the server:
→ **No changes needed** for these files (local paths stay the same).

### Recommended Refactor

Because paths are duplicated everywhere, create a single `config.php`:

```php
<?php
// config.php — place at mushaf.linuxproguru.com/config.php

define('BASE_DIR', dirname(__DIR__));
define('TASKS_DIR', BASE_DIR . '/mushaftasks/');
define('WEBP_DIR', BASE_DIR . '/webp/');
define('USERS_DIR', BASE_DIR . '/users/');
define('CACHE_DIR', BASE_DIR . '/cache/');
define('REPORTS_DIR', BASE_DIR . '/reports/');

// rclone remotes
define('RCLONE_DRIVE', 'gdrive:/mushafproject/mushaftasks/');
define('RCLONE_FTP', 'myftp:/mushafproject/mushaftasks/');
define('RCLONE_BIN', '/home/bin/rclone');
```

Then in every PHP file, replace:
```php
// OLD
$config = [
    'local_base' => '/home/www/mushaf.linuxproguru.com/mushaftasks/',
    'drive_remote' => 'gdrive:/mushafproject/mushaftasks/',
    'ftp_remote' => 'myftp:/mushaftasks/',
];

// NEW
require_once __DIR__ . '/../config.php';
$config = [
    'local_base' => TASKS_DIR,
    'drive_remote' => RCLONE_DRIVE,
    'ftp_remote' => RCLONE_FTP,
];
```

This prevents future pain when paths change again.

---

## 6. mushaf-preview-server.js

### Status: No Changes Required

This is a simple Node.js static file server:
```javascript
const ROOT = path.join(__dirname, 'mushaf.linuxproguru.com');
```

It serves whatever is in the `mushaf.linuxproguru.com` folder. As long as the web server files are in the same place, the preview server doesn't care about Google Drive structure.

---

## Migration Checklist

### Phase 1: Prepare (Do First)
- [ ] Stop cron jobs on the web server (`crontab -e`)
- [ ] Back up all `mushaftasks/` JSON files locally and on Drive
- [ ] Back up `mushaffiles/` Illustrator files
- [ ] Notify team: "Don't open Illustrator panels until I say go"

### Phase 2: Move Folders
- [ ] In Google Drive web UI: create `mushafproject/` folder
- [ ] Move `mushaftasks` into `mushafproject/`
- [ ] Move `mushaffiles` into `mushafproject/`
- [ ] Wait for Drive sync to complete on all team machines
- [ ] Verify team members with shortcuts: shortcuts should auto-update

### Phase 3: Update mushaftask.extension
- [ ] Code changes: ✅ Already done (drive scanner)
- [ ] Test: Open panel → should auto-detect new paths
- [ ] Verify: Check Settings modal shows correct paths

### Phase 4: Update mushaf-webp-exporter
- [ ] Edit `js/modules/auto-detect.js` (nested path search)
- [ ] Edit `index.html` (hint labels)
- [ ] Test: Open panel → auto-detect should find paths

### Phase 5: Update ornamentReplacer (if needed)
- [ ] If `projectFolder` semantics changed: apply backward-compat fix
- [ ] Test: Layer Copy → Riwayah dropdown should populate

### Phase 6: Update Web Server
- [ ] Edit `cron/sync.php` rclone paths
- [ ] Edit `cron/sync-all.php` `ftp_remote`
- [ ] (Optional) Create `config.php` and refactor all API files
- [ ] Test manually: `php cron/sync-all.php`
- [ ] Re-enable cron jobs

### Phase 7: Update Team
- [ ] SymbolPalette users: click "Select Root Folder" and re-browse
- [ ] Everyone: restart Illustrator panels

---

## Rollback Plan

If something breaks:

1. **Google Drive**: Move folders back to root ( Drive undo works for 30 days)
2. **mushaftask**: The drive scanner will re-detect root-level folders on next launch
3. **Web server**: Revert PHP file changes from git (if you commit before changing)
4. **rclone**: Old paths will still work if folders are moved back

---

*Last updated: April 26, 2026*
