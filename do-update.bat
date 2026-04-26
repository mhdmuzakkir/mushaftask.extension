@echo off
setlocal EnableDelayedExpansion

:: ==========================================================
::  MushafTask Extension - Updater
::  Runs OUTSIDE Illustrator to bypass firewall restrictions.
::  Expects extension path as first argument.
::  Writes result to %%TEMP%%\mushaftask-update\status.json
::
::  If this batch fails when run from Illustrator, the user
::  can run it manually from Windows Explorer.
:: ==========================================================

set "EXTENSION_PATH=%~1"
set "UPDATE_DIR=%TEMP%\mushaftask-update"
set "ZIP_URL=https://github.com/mhdmuzakkir/mushaftask.extension/archive/refs/heads/main.zip"

if "%EXTENSION_PATH%"=="" (
    echo {"status":"error","message":"Extension path not provided"} > "%UPDATE_DIR%\status.json"
    exit /b 1
)

:: Ensure temp dir exists
if not exist "%UPDATE_DIR%" mkdir "%UPDATE_DIR%"

:: Write "downloading" status
echo {"status":"downloading","stage":"download","message":"Starting update..."} > "%UPDATE_DIR%\status.json"

:: Check if this is a git installation (preferred: fast and clean)
if exist "%EXTENSION_PATH%\.git" (
    cd /d "%EXTENSION_PATH%"
    git pull > "%UPDATE_DIR%\update-log.txt" 2>&1
    if !errorlevel! equ 0 (
        echo {"status":"done","stage":"install","message":"Update completed via Git. Please restart Illustrator."} > "%UPDATE_DIR%\status.json"
        exit /b 0
    ) else (
        echo {"status":"error","stage":"install","message":"Git pull failed. See update-log.txt for details."} > "%UPDATE_DIR%\status.json"
        exit /b 1
    )
)

:: Not a git repo - download ZIP
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $wc=New-Object Net.WebClient; $wc.DownloadFile('%ZIP_URL%','%UPDATE_DIR%\update.zip'); exit 0 } catch { exit 1 }" >nul 2>&1

if errorlevel 1 (
    :: Fallback: bitsadmin
    bitsadmin /transfer mushaf-update /download /priority normal "%ZIP_URL%" "%UPDATE_DIR%\update.zip" >nul 2>&1
)

if not exist "%UPDATE_DIR%\update.zip" (
    echo {"status":"error","stage":"download","message":"Failed to download update ZIP. Check internet connection."} > "%UPDATE_DIR%\status.json"
    exit /b 1
)

:: Extract
echo {"status":"extracting","stage":"extract","message":"Extracting update..."} > "%UPDATE_DIR%\status.json"
powershell -NoProfile -Command "Expand-Archive -Path '%UPDATE_DIR%\update.zip' -DestinationPath '%UPDATE_DIR%\extracted' -Force" >nul 2>&1

if errorlevel 1 (
    echo {"status":"error","stage":"extract","message":"Failed to extract update ZIP."} > "%UPDATE_DIR%\status.json"
    exit /b 1
)

:: Find extracted folder (GitHub names it mushaftask.extension-main)
set "SOURCE_DIR="
for /d %%D in ("%UPDATE_DIR%\extracted\mushaftask*") do (
    set "SOURCE_DIR=%%D"
    goto :found
)
:found

if "%SOURCE_DIR%"=="" (
    echo {"status":"error","stage":"install","message":"Could not find extracted folder."} > "%UPDATE_DIR%\status.json"
    exit /b 1
)

:: Copy files (xcopy handles recursion, /Y suppresses overwrite prompts, /Q quiet)
echo {"status":"copying","stage":"copy","message":"Copying files..."} > "%UPDATE_DIR%\status.json"
xcopy "%SOURCE_DIR%\*" "%EXTENSION_PATH%\" /E /Y /I /Q >nul 2>&1

:: Done
echo {"status":"done","stage":"install","message":"Update installed successfully. Please restart Illustrator."} > "%UPDATE_DIR%\status.json"
exit /b 0
