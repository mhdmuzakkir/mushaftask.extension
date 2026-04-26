# Mushaf Task Manager — Update & Release Protocol

> **For:** Kimi agents, maintainers, and future developers  
> **Purpose:** Step-by-step checklist for every release. Follow this to keep versions, installers, and the self-updater in sync.

---

## Does the Extension Support Self-Updates?

**Yes.** The full flow is implemented and wired:

| Step | File | What it does |
|------|------|--------------|
| 1 | `check-update.bat` | Runs **outside** Illustrator (bypasses firewall). Downloads remote `version.json` from GitHub `main` branch. |
| 2 | `js/modules/updater.js` | Spawns `check-update.bat` via Node.js `child_process`, reads `%TEMP%\mushaftask-update\status.json`, compares versions. |
| 3 | `index.html` + `js/modules/event-wiring.js` | Settings panel shows **"Check for Updates"** button. If update found, reveals **"Install Update"** button. |
| 4 | `update.bat` | Runs **outside** Illustrator. Downloads ZIP + PowerShell `Expand-Archive` + `robocopy` (same robust method as `install.bat`). |
| 5 | `js/modules/updater.js` | Spawns `update.bat` with the extension path as argument. Monitors progress via status file. |
| 6 | Panel UI | On success, shows a **green restart banner** with a **"Restart Illustrator"** button. User clicks to restart. |

**Requirements for self-update to work:**
- Extension must be installed in a **user-writable** location: `%APPDATA%\Adobe\CEP\extensions\mushaftask.extension\`
- Program Files installs **cannot** self-update (permission denied)
- `version.json` must exist on the GitHub `main` branch

---

## Version Number Locations (MUST all match)

Every release, update **all three** of these:

### 1. `version.json` (GitHub source of truth)
```json
{
  "version": "1.0.1",
  "manifestVersion": "1.0.1",
  ...
}
```

### 2. `js/modules/updater.js` (local version constant)
```javascript
var CURRENT_VERSION = '1.0.1';
```

### 3. `CSXS/manifest.xml` (CEP manifest)
```xml
<ExtensionManifest Version="7.0" ExtensionBundleId="com.mushaf.taskmanager" ExtensionBundleVersion="1.0.1"
    ExtensionBundleName="Mushaf Task Manager" ...>
    <ExtensionList>
        <Extension Id="com.mushaf.taskmanager.panel" Version="1.0.1"/>
    </ExtensionList>
```

> **Rule:** If any of these three are out of sync, the updater will behave unpredictably (e.g., telling users an update exists when they're already on the latest version, or vice versa).

---

## Release Checklist

### Before pushing to GitHub
- [ ] Update `version.json` → `"version"`
- [ ] Update `js/modules/updater.js` → `CURRENT_VERSION`
- [ ] Update `CSXS/manifest.xml` → `ExtensionBundleVersion` and `Extension Version`
- [ ] Update `js/modules/utils.js` → `CHANGELOG` — add new entry for this version so the **"What's New"** popup shows correctly after update
- [ ] Test the extension locally in Illustrator (open a file, toggle tasks, move to completed)
- [ ] Run `install.bat` locally to verify it installs/updates cleanly
- [ ] Verify `check-update.bat` works when run manually (double-click)

### After pushing to GitHub
- [ ] Confirm `https://raw.githubusercontent.com/mhdmuzakkir/mushaftask.extension/main/version.json` returns the new version
- [ ] Open the installed extension → Settings → **Check for Updates**
- [ ] Confirm it detects the new version and shows **"Install Update"**
- [ ] Click **Install Update**, wait for completion
- [ ] Confirm the **green restart banner** appears with **"Restart Illustrator"** button
- [ ] Click **Restart Illustrator**, confirm new version loads and changelog popup appears

---

## Restart Flow After Update

When `update.bat` completes successfully:

1. `updater.js` shows a **green restart banner** in the Settings panel
2. Banner contains: checkmark icon, success message, and a **"Restart Illustrator"** button
3. User clicks the button → `restartIllustrator()` runs:
   - Finds `Illustrator.exe` via PowerShell `(Get-Process Illustrator).Path`
   - Falls back to WMIC, then common install paths
   - Writes a self-deleting restart batch to `%TEMP%`
   - Spawns the batch detached (waits 4s, then launches Illustrator)
   - Sends ExtendScript `app.quit()` after 500ms to close current Illustrator
4. User re-opens the extension → changelog popup appears (if `lastSeenVersion` changed)

**Important:** There is no auto-restart timeout. The user must manually click the button.

---

## File Organization (DO NOT MOVE these)

These files **must** stay at the extension root because the updater looks for them there:

| File | Why it must stay at root |
|------|--------------------------|
| `check-update.bat` | `updater.js` resolves it via `path.join(extensionPath, 'check-update.bat')` |
| `update.bat` | Same — resolved relative to extension root |
| `version.json` | Read by `check-update.bat` and compared against remote copy |
| `index.html` | CEP entry point (`MainPath` in manifest) |
| `CSXS/manifest.xml` | CEP manifest — must be at `CSXS/manifest.xml` |
| `install.bat` | Team installer — should be easy to find |

Files that **can** be organized into subfolders:
- Documentation → `docs/`
- Utility scripts → `scripts/`

---

## Installer Files Summary

| File | Audience | Admin Required | Method |
|------|----------|---------------|--------|
| `install.bat` | **Team (primary)** | No | Git clone/pull, or ZIP fallback |
| `install-or-update.bat` | IT/Admin | **Yes** | Git clone/pull to Program Files (x86) |

---

## Troubleshooting Updates

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Network download failed" | Firewall blocks Illustrator | Run `check-update.bat` manually from Explorer, then click Check again in panel |
| "Extension is in Program Files" | Installed to system path | Reinstall via `install.bat` to AppData, or use `install-or-update.bat` as Admin |
| Batch runs but panel doesn't see result | `child_process` also blocked | The batch still wrote `%TEMP%\mushaftask-update\remote-version.json`. Panel will read it on next check. |
| "Git pull failed" | `.git` repo conflict | Delete the extension folder and re-run `install.bat` |
| Update fails mid-copy | File locked by Illustrator | Close Illustrator completely and run `update.bat` manually |

---

---

## ⚠️ Critical Reminder

> **After every confirmed update that is ready for release, you MUST update both the version number AND the changelog.**
>
> If you bump the version in `version.json`, `updater.js`, and `manifest.xml` but forget to add a `CHANGELOG` entry in `js/modules/utils.js`, users who update will see a blank or missing "What's New" popup after restarting Illustrator.

---

*Last updated: April 26, 2026*
