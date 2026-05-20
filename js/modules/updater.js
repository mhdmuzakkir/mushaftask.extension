/**
 * Mushaf Task Manager - Self Updater (Batch-based)
 * 
 * Because Illustrator may be blocked by firewall from making outbound connections,
 * this updater runs external batch files (check-update.bat / do-update.bat) via
 * Node.js child_process. Those batch files run outside Illustrator's process context
 * and typically bypass application-level firewall rules.
 * 
 * If even child_process is blocked, the user can run the batch files manually
 * from Windows Explorer. The panel will read the result files they produce.
 */
(function(window) {
    'use strict';

    var REPO_OWNER = 'mhdmuzakkir';
    var REPO_NAME = 'mushaftask.extension';
    var CURRENT_VERSION = '2.1.3';

    var UPDATE_STATUS = {
        idle: 'idle',
        checking: 'checking',
        available: 'available',
        downloading: 'downloading',
        installing: 'installing',
        done: 'done',
        error: 'error'
    };

    var status = UPDATE_STATUS.idle;
    var lastCheckResult = null;
    var UPDATE_DIR = path.join(os.tmpdir(), 'mushaftask-update');
    var STATUS_FILE = path.join(UPDATE_DIR, 'status.json');
    var REMOTE_VERSION_FILE = path.join(UPDATE_DIR, 'remote-version.json');

    function getExtensionPath() {
        try {
            var home = os.homedir();
            var candidates = [
                path.join(home, 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions', 'mushaftask.extension'),
                path.join(home, 'AppData', 'Local', 'Adobe', 'CEP', 'extensions', 'mushaftask.extension'),
                path.join(home, 'AppData', 'Roaming', 'Adobe', 'CEP', 'extensions', 'mushaftask.extension-main'),
                'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions\\mushaftask.extension',
                'C:\\Program Files\\Common Files\\Adobe\\CEP\\extensions\\mushaftask.extension'
            ];

            for (var i = 0; i < candidates.length; i++) {
                var manifestPath = path.join(candidates[i], 'CSXS', 'manifest.xml');
                if (fs.existsSync(manifestPath)) {
                    return candidates[i];
                }
            }
        } catch (e) {
            console.error('Error finding extension path:', e);
        }
        return null;
    }

    function isUserInstall(extensionPath) {
        if (!extensionPath) return false;
        return extensionPath.toLowerCase().indexOf('appdata') !== -1;
    }

    function compareVersions(a, b) {
        var pa = a.split('.').map(Number);
        var pb = b.split('.').map(Number);
        for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
            var na = pa[i] || 0;
            var nb = pb[i] || 0;
            if (na > nb) return 1;
            if (na < nb) return -1;
        }
        return 0;
    }

    function ensureUpdateDir() {
        try {
            if (!fs.existsSync(UPDATE_DIR)) {
                fs.mkdirSync(UPDATE_DIR, { recursive: true });
            }
        } catch (e) {
            console.error('Error creating update dir:', e);
        }
    }

    function readStatusFile() {
        try {
            if (fs.existsSync(STATUS_FILE)) {
                return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('Error reading status file:', e);
        }
        return null;
    }

    function getFileAgeMinutes(filePath) {
        try {
            var stats = fs.statSync(filePath);
            return (Date.now() - stats.mtime.getTime()) / 60000;
        } catch (e) {
            return Infinity;
        }
    }

    function getBatchPath(batchName) {
        var extPath = getExtensionPath();
        if (extPath) {
            var batchInExt = path.join(extPath, batchName);
            if (fs.existsSync(batchInExt)) {
                return batchInExt;
            }
        }
        return batchName;
    }

    function runBatch(batchName, args, onProgress, timeoutMs) {
        return new Promise(function(resolve, reject) {
            try {
                var child_process = require('child_process');
                var batchPath = getBatchPath(batchName);
                var cmd = '"' + batchPath + '"';
                if (args && args.length > 0) {
                    cmd += ' ' + args.map(function(a) {
                        return '"' + a.replace(/"/g, '\"') + '"';
                    }).join(' ');
                }

                console.log('Running batch:', cmd);

                // Poll status file for progress
                var pollInterval = setInterval(function() {
                    var st = readStatusFile();
                    if (st && onProgress) {
                        onProgress(st);
                    }
                }, 500);

                var opts = {
                    timeout: timeoutMs || 300000,
                    windowsHide: true
                };

                child_process.exec(cmd, opts, function(error, stdout, stderr) {
                    clearInterval(pollInterval);
                    var finalStatus = readStatusFile();
                    if (error) {
                        console.error('Batch error:', error.message, stderr);
                    }
                    if (stdout) {
                        console.log('Batch stdout:', stdout);
                    }
                    if (finalStatus && finalStatus.status === 'error') {
                        reject(new Error(finalStatus.message || 'Batch failed'));
                    } else if (error && (!finalStatus || finalStatus.status !== 'done')) {
                        reject(new Error(finalStatus ? finalStatus.message : (stderr || error.message)));
                    } else {
                        resolve(finalStatus || { status: 'done', message: 'Batch completed' });
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    function checkForUpdates() {
        return new Promise(function(resolve) {
            status = UPDATE_STATUS.checking;
            ensureUpdateDir();
            var extensionPath = getExtensionPath();
            var remoteVersionAge = getFileAgeMinutes(REMOTE_VERSION_FILE);

            // If we have a recent cached remote version (< 60 min), use it while re-checking in background
            var cachedResult = null;
            if (fs.existsSync(REMOTE_VERSION_FILE) && remoteVersionAge < 60) {
                try {
                    var remote = JSON.parse(fs.readFileSync(REMOTE_VERSION_FILE, 'utf8'));
                    cachedResult = {
                        hasUpdate: compareVersions(remote.version, CURRENT_VERSION) > 0,
                        currentVersion: CURRENT_VERSION,
                        remoteVersion: remote.version,
                        isUserInstall: isUserInstall(extensionPath),
                        extensionPath: extensionPath,
                        fromCache: true
                    };
                    console.log('Using cached remote version (age: ' + Math.round(remoteVersionAge) + ' min)');
                } catch (e) {
                    console.log('Cached version file corrupt, will re-download');
                }
            }

            // Run the batch file to fetch fresh version info
            runBatch('check-update.bat', [], function(progress) {
                console.log('Check progress:', progress.status, progress.message);
            }).then(function(result) {
                if (fs.existsSync(REMOTE_VERSION_FILE)) {
                    try {
                        var remote = JSON.parse(fs.readFileSync(REMOTE_VERSION_FILE, 'utf8'));
                        var hasUpdate = compareVersions(remote.version, CURRENT_VERSION) > 0;
                        lastCheckResult = {
                            hasUpdate: hasUpdate,
                            currentVersion: CURRENT_VERSION,
                            remoteVersion: remote.version,
                            isUserInstall: isUserInstall(extensionPath),
                            extensionPath: extensionPath,
                            fromCache: false
                        };
                        status = hasUpdate ? UPDATE_STATUS.available : UPDATE_STATUS.idle;
                        resolve(lastCheckResult);
                    } catch (e) {
                        status = UPDATE_STATUS.error;
                        resolve({ hasUpdate: false, error: 'Failed to parse version info', details: e.message });
                    }
                } else {
                    // Batch failed to download, but we might have a stale cache
                    if (cachedResult) {
                        console.log('Batch failed, falling back to cached version');
                        status = cachedResult.hasUpdate ? UPDATE_STATUS.available : UPDATE_STATUS.idle;
                        resolve(cachedResult);
                    } else {
                        status = UPDATE_STATUS.error;
                        var st = readStatusFile();
                        resolve({
                            hasUpdate: false,
                            error: st ? st.message : 'Update check failed. Firewall may block Illustrator. Run check-update.bat manually, then try again.'
                        });
                    }
                }
            }).catch(function(err) {
                // Batch execution failed - maybe child_process blocked too
                if (cachedResult) {
                    console.log('Batch exec failed, falling back to cached version');
                    status = cachedResult.hasUpdate ? UPDATE_STATUS.available : UPDATE_STATUS.idle;
                    resolve(cachedResult);
                } else {
                    status = UPDATE_STATUS.error;
                    resolve({
                        hasUpdate: false,
                        error: 'Could not run update checker. ' + err.message + ' Try running check-update.bat manually from Windows Explorer.'
                    });
                }
            });
        });
    }

    function installUpdate(onProgress) {
        return new Promise(function(resolve, reject) {
            if (!lastCheckResult || !lastCheckResult.hasUpdate) {
                reject(new Error('No update available'));
                return;
            }

            var extensionPath = getExtensionPath();
            if (!extensionPath) {
                reject(new Error('Could not locate extension installation folder'));
                return;
            }

            if (!isUserInstall(extensionPath)) {
                reject(new Error('Extension is installed in Program Files. Please run install-or-update.bat as Administrator, or reinstall to AppData\\Roaming\\Adobe\\CEP\\extensions\\'));
                return;
            }

            ensureUpdateDir();
            status = UPDATE_STATUS.downloading;

            runBatch('update.bat', [extensionPath], function(progress) {
                if (onProgress) {
                    var percent = 0;
                    if (progress.stage === 'download') percent = 25;
                    else if (progress.stage === 'extract') percent = 60;
                    else if (progress.stage === 'copy') percent = 85;
                    else if (progress.status === 'done') percent = 100;
                    onProgress({ stage: progress.stage || progress.status, percent: percent, message: progress.message });
                }
            }, 600000).then(function(result) {
                status = UPDATE_STATUS.done;
                if (onProgress) onProgress({ stage: 'done', percent: 100, message: result.message });
                resolve({ success: true, extensionPath: extensionPath, version: lastCheckResult.remoteVersion });
            }).catch(function(err) {
                status = UPDATE_STATUS.error;
                reject(err);
            });
        });
    }

    function getUpdateStatus() {
        return status;
    }

    function getLastCheckResult() {
        return lastCheckResult;
    }

    function restartIllustrator() {
        try {
            var child_process = require('child_process');
            var spawn = child_process.spawn;

            // Get Illustrator.exe path — try PowerShell first (works on Win 10/11), then WMIC, then common paths
            var illustratorPath = null;
            try {
                var psResult = child_process.execSync('powershell -NoProfile -Command "(Get-Process Illustrator -ErrorAction SilentlyContinue).Path"', { encoding: 'utf8', timeout: 5000 }).trim();
                if (psResult && fs.existsSync(psResult)) {
                    illustratorPath = psResult;
                    console.log('Found Illustrator via PowerShell:', illustratorPath);
                }
            } catch (e) {
                console.log('PowerShell path lookup failed');
            }

            if (!illustratorPath) {
                try {
                    var wmicResult = child_process.execSync('wmic process where "name=\'Illustrator.exe\'" get ExecutablePath /value', { encoding: 'utf8', timeout: 5000 });
                    var match = wmicResult.match(/ExecutablePath=([^\r\n]+)/);
                    if (match && match[1]) {
                        illustratorPath = match[1].trim();
                        console.log('Found Illustrator via WMIC:', illustratorPath);
                    }
                } catch (e) {
                    console.log('WMIC path lookup failed');
                }
            }

            if (!illustratorPath) {
                var pf = process.env['ProgramFiles'] || 'C:\\Program Files';
                var pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
                var years = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];
                for (var i = 0; i < years.length; i++) {
                    var candidates = [
                        path.join(pf, 'Adobe', 'Adobe Illustrator ' + years[i], 'Support Files', 'Contents', 'Windows', 'Illustrator.exe'),
                        path.join(pf86, 'Adobe', 'Adobe Illustrator ' + years[i], 'Support Files', 'Contents', 'Windows', 'Illustrator.exe')
                    ];
                    for (var j = 0; j < candidates.length; j++) {
                        if (fs.existsSync(candidates[j])) {
                            illustratorPath = candidates[j];
                            console.log('Found Illustrator via fallback:', illustratorPath);
                            break;
                        }
                    }
                    if (illustratorPath) break;
                }
            }

            if (!illustratorPath) {
                console.error('Could not find Illustrator.exe');
                if (typeof showToast === 'function') {
                    showToast('Update installed. Please restart Illustrator manually.', 'warning');
                }
                return false;
            }

            // Create a self-deleting restart batch that waits, then launches Illustrator
            var restartBatPath = path.join(os.tmpdir(), 'mushaf_restart_' + Date.now() + '.bat');
            var batContent = '@echo off\r\n' +
                'echo Waiting for Illustrator to close...\r\n' +
                'timeout /t 4 /nobreak >nul\r\n' +
                'echo Restarting Illustrator...\r\n' +
                'start "" "' + illustratorPath.replace(/"/g, '""') + '"\r\n' +
                'del /F /Q "%~f0"\r\n';
            fs.writeFileSync(restartBatPath, batContent);

            // Spawn detached so it survives when Illustrator closes
            var child = spawn('cmd.exe', ['/c', restartBatPath], {
                detached: true,
                windowsHide: true,
                stdio: 'ignore'
            });
            child.unref();

            // Give the batch a moment to start, then try graceful quit via ExtendScript
            setTimeout(function() {
                try {
                    if (typeof window.CSInterface !== 'undefined') {
                        var csInterface = new window.CSInterface();
                        csInterface.evalScript('(function() { for (var i = app.documents.length - 1; i >= 0; i--) { try { app.documents[i].save(); } catch(e) { } } app.quit(); })();');
                        console.log('ExtendScript quit sent');
                    } else {
                        console.log('CSInterface not available for graceful quit');
                    }
                } catch (e) {
                    console.error('ExtendScript quit failed:', e);
                }
            }, 800);

            // Force kill if Illustrator is still running after 4 seconds
            setTimeout(function() {
                try {
                    child_process.exec('taskkill /f /im Illustrator.exe', { windowsHide: true });
                    console.log('Taskkill fallback executed');
                } catch (e) {
                    console.log('Taskkill fallback failed:', e);
                }
            }, 4000);

            return true;
        } catch (e) {
            console.error('Restart setup failed:', e);
            return false;
        }
    }

    window.Updater = {
        checkForUpdates: checkForUpdates,
        installUpdate: installUpdate,
        getUpdateStatus: getUpdateStatus,
        getLastCheckResult: getLastCheckResult,
        restartIllustrator: restartIllustrator,
        CURRENT_VERSION: CURRENT_VERSION,
        isUserInstall: function() { return isUserInstall(getExtensionPath()); },
        getExtensionPath: getExtensionPath
    };

})(window);
