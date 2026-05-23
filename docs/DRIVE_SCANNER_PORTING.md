# Drive Scanner Porting Guide

> **Purpose**: Reuse the `drive-scanner.js` module across all Mushaf tools for automatic Google Drive discovery.

---

## What It Does

The Drive Scanner automatically finds the `mushafproject` folder on any connected drive, including:

1. **Direct folders** — `G:\My Drive\mushafproject`
2. **Shortcuts** — Windows `.lnk` shortcuts inside Drive that point to `mushafproject`
3. **Multiple accounts** — Scans all drive letters (`G:`, `H:`, etc.) and all Google Drive roots
4. **Auto-save** — Saves discovered paths to settings so users never have to browse manually

---

## Files

| File | Location | Purpose |
|------|----------|---------|
| `drive-scanner.js` | `js/modules/drive-scanner.js` | The reusable module (no dependencies on other modules) |

---

## How to Port to Another Tool

### Step 1: Copy the module

Copy `drive-scanner.js` into your project's script folder.

### Step 2: Load it in your HTML

```html
<script src="js/modules/drive-scanner.js"></script>
```

> **CEP extensions**: Load before your main script.  
> **Browser apps**: Also works, but drive scanning is limited (no Node.js = no drive enumeration).

### Step 3: Call it at startup

**For CEP / Node.js environments** (mushaftask, webp exporter, symbol palette):

```javascript
// In your init / startup code
var settings = loadSettings(); // however you load settings

// If no paths configured, or paths are broken, auto-scan
if (!settings || !settings.tasksFolder || !isAccessible(settings.tasksFolder)) {
    var result = window.DriveScanner.autoDetectAndSave();
    if (result && result.success) {
        console.log('Auto-detected:', result.projectRoot);
        // result.tasksFolder      → mushafproject/mushaftasks
        // result.projectFolder    → mushafproject/mushaffiles
        // result.candidates       → all matches found (for UI pick-list)
    } else {
        console.log('Auto-detect failed, show manual browse dialog');
    }
}
```

**For browser environments** (mushafweb):

Browsers can't scan drives. Instead, use the tool-specific scan once the user provides the project root:

```javascript
// After user selects or types the project root path
var result = window.DriveScanner.validateProjectPath(userProvidedPath);
if (result.isValid) {
    localStorage.setItem('tasksFolder', result.tasksFolder);
    localStorage.setItem('projectFolder', result.projectFolder);
}
```

### Step 4: Add a "Scan Drives" button to your UI

Give users a manual fallback. Anywhere you have a path input, add:

```html
<button onclick="manualScan()">🔍 Auto-Detect from Google Drive</button>
```

```javascript
function manualScan() {
    var result = window.DriveScanner.autoDetectAndSave();
    if (result && result.success) {
        // Fill your inputs
        document.getElementById('tasksPath').value = result.tasksFolder;
        document.getElementById('projectPath').value = result.projectFolder;
        showToast('Found and saved!', 'success');
    } else {
        showToast('Not found. Is Google Drive connected?', 'warning');
    }
}
```

---

## API Reference

### `window.DriveScanner.autoDetectAndSave()`

**Returns:** `{Object}`

```javascript
{
    success: true,
    tasksFolder: "G:\\My Drive\\mushafproject\\mushaftasks",
    projectFolder: "G:\\My Drive\\mushafproject\\mushaffiles",
    projectRoot: "G:\\My Drive\\mushafproject",
    candidateCount: 2,
    candidates: [ /* ranked list */ ]
}
```

### `window.DriveScanner.scanForProject()`

Runs the full scan without saving. Returns an array of candidate objects ranked by score.

```javascript
var candidates = window.DriveScanner.scanForProject();
// candidates[0] is the best match
candidates.forEach(function(c) {
    console.log(c.path, 'score:', c.score, 'type:', c.type);
});
```

### `window.DriveScanner.scanForTool(toolName, expectedFiles)`

Finds a tool-specific subfolder inside `mushafproject`.

```javascript
var result = window.DriveScanner.scanForTool('mushafweb', ['index.html', 'config.js']);
if (result.success) {
    console.log('mushafweb found at:', result.path);
}
```

### `window.DriveScanner.validateProjectPath(path)`

Validates any path as a `mushafproject` candidate.

```javascript
var validation = window.DriveScanner.validateProjectPath('G:\\My Drive\\mushafproject');
// validation.isValid      → true/false
// validation.score        → 0-100+ (higher = better match)
// validation.foundSubfolders → ['mushaftasks', 'mushaffiles']
// validation.tasksFolder  → full path to mushaftasks
// validation.projectFolder → full path to mushaffiles
```

---

## Tool-Specific Integration Notes

### mushaftask (CEP Extension) ✅ DONE

- Auto-scan on startup if no valid paths
- "Scan Drives" button on Drive Missing modal
- "Auto-Detect" button on Setup modal and Settings modal
- Saves to `%USERPROFILE%\Documents\MushafTaskManager\settings.json`

### mushafweb (Web Viewer)

**Challenge**: Runs in browser — can't enumerate drives.

**Solution**:
1. Host the scanner JS file on your web server
2. Use `scanForTool()` and `validateProjectPath()` after the user provides a path
3. Or, if running inside a CEP panel wrapper, full drive scanning works

**Recommended flow**:
```javascript
// Server-side config file (generated by an admin)
fetch('config/paths.json').then(r => r.json()).then(config => {
    var validation = window.DriveScanner.validateProjectPath(config.projectRoot);
    if (validation.isValid) {
        initApp(validation.tasksFolder);
    }
});
```

### mushafwebp exporter (CEP / Standalone)

Same as mushaftask — copy `drive-scanner.js`, load it, call `autoDetectAndSave()` on startup.

```javascript
// In your exporter's init()
if (!settings || !settings.sourceFolder) {
    var result = window.DriveScanner.autoDetectAndSave();
    if (result.success) {
        settings.sourceFolder = result.projectFolder; // mushaffiles
        settings.outputFolder = result.tasksFolder + '\\webp-export'; // or wherever
        saveSettings();
    }
}
```

### symbol palette (CEP Extension)

Same pattern. Symbols are likely stored inside `mushaffiles` or a parallel folder.

```javascript
var result = window.DriveScanner.scanForTool('symbol-palette', ['symbols.json']);
if (result.success) {
    settings.symbolsPath = result.path;
}
```

---

## Scoring System

The scanner ranks candidates so the best match wins:

| Signal | Points |
|--------|--------|
| `mushaftasks` subfolder exists | +10 |
| `mushaffiles` subfolder exists | +10 |
| `config.json` inside `mushaftasks` | +20 |
| Riwayah folders inside `mushaffiles` | +15 |
| Direct folder (not shortcut) | ties broken in favor |

### Google Drive Shared Folder Shortcuts

When a team member adds a **shared folder shortcut** to their Drive (not owned by them), Google Drive for Desktop stores the real contents in a hidden folder:

```
G:\My Drive\.shortcut-targets-by-id\{drive-file-id}\mushafproject\
```

The scanner **automatically dives into `.shortcut-targets-by-id`** and scans every `{drive-file-id}` subfolder for `mushafproject`. This means team members don't need to own the folder — they just need it shared with them and added to their Drive.

If two Google Drive accounts both have `mushafproject`, the one with more content wins.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Drive scanner not available" | `drive-scanner.js` not loaded | Check `<script>` tag order |
| No candidates found | Google Drive not mounted | Connect Drive, wait for sync, click Retry |
| Wrong folder picked | Multiple `mushafproject` folders | Use `scanForProject()` to show a pick-list UI |
| Shortcut not resolved | `.lnk` target is a URL, not a path | Only file-system shortcuts work; cloud-only shortcuts won't resolve |
| Shared folder not found | `mushafproject` is a Drive shortcut, not a real folder | Scanner scans `.shortcut-targets-by-id` automatically — ensure Drive sync is complete |
| Browser can't scan | Security sandbox | Use `validateProjectPath()` with a user-provided path instead |

---

## Customization

Change the folder name or expected subfolders:

```javascript
// After loading drive-scanner.js, override before calling scan:
window.DriveScanner.PROJECT_FOLDER_NAME = 'mushaf-project-v2';
window.DriveScanner.EXPECTED_SUBFOLDERS = ['data', 'files'];
```

---

*Last updated: April 26, 2026*
