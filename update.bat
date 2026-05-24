@echo off
setlocal EnableDelayedExpansion

:: ==========================================================
::  Mushaf Task Manager - Updater (Robust ZIP-based update)
::  Runs OUTSIDE Illustrator to bypass firewall restrictions.
::  Can be run standalone (double-click) or from updater.js.
::  Writes result to %%TEMP%%\mushaftask-update\status.json
::
::  Usage:
::    update.bat                 -> Updates AppData install
::    update.bat "<extension_path>" -> Updates specific path
:: ==========================================================

:: Target directory: argument or default to AppData
if "%~1"== "" (
    set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\mushaftask.extension"
) else (
    set "TARGET_DIR=%~1"
)

set "ZIP_URL=https://github.com/mhdmuzakkir/mushaftask.extension/archive/refs/heads/main.zip?nocache=%RANDOM%%RANDOM%"
set "UPDATE_DIR=%TEMP%\mushaf_upd_%RANDOM%%RANDOM%"
set "STATUS_DIR=%TEMP%\mushaftask-update"
set "ZIP_FILE=%TEMP%\mushaf_dl_%RANDOM%.zip"

:: Ensure status dir exists
if not exist "%STATUS_DIR%" mkdir "%STATUS_DIR%"

echo ==========================================
echo    Mushaf Task Manager - Updater
echo ==========================================
echo.

:: Verify target exists
if not exist "%TARGET_DIR%" (
    echo [ERROR] Extension not found at:
    echo   %TARGET_DIR%
    echo.
    echo Run install.bat first, or pass the correct path as argument.
    echo {"status":"error","stage":"install","message":"Extension not found at %TARGET_DIR%. Run install.bat first."} > "%STATUS_DIR%\status.json"
    pause
    exit /b 1
)

:: Check if target is writable (Program Files installs cannot self-update)
echo Checking permissions...
set "TEST_FILE=%TARGET_DIR%\.__write_test_%RANDOM%"
type nul > "%TEST_FILE%" 2>nul
if not exist "%TEST_FILE%" (
    echo [ERROR] Cannot write to extension folder.
    echo   %TARGET_DIR%
    echo.
    echo If installed in Program Files, run as Administrator,
    echo or reinstall to AppData using install.bat
    echo {"status":"error","stage":"install","message":"Permission denied. Program Files installs cannot self-update. Reinstall to AppData or run as Administrator."} > "%STATUS_DIR%\status.json"
    pause
    exit /b 1
)
del /F /Q "%TEST_FILE%" 2>nul

:: Clean old temp files completely
if exist "%UPDATE_DIR%" (
    rmdir /S /Q "%UPDATE_DIR%" 2>nul
    timeout /t 1 /nobreak >nul
)
if exist "%ZIP_FILE%" del /F /Q "%ZIP_FILE%" 2>nul

:: Write status
echo {"status":"downloading","stage":"download","message":"Downloading update from GitHub..."} > "%STATUS_DIR%\status.json"

:: Download ZIP to explicit temp file
echo Downloading from GitHub...
powershell -NoProfile -Command "$wc=New-Object Net.WebClient; $wc.DownloadFile('%ZIP_URL%','%ZIP_FILE%')"
if not exist "%ZIP_FILE%" (
    echo [ERROR] Download failed. Check internet connection.
    echo {"status":"error","stage":"download","message":"Failed to download update ZIP. Check internet connection."} > "%STATUS_DIR%\status.json"
    pause
    exit /b 1
)

:: Extract to completely separate temp folder
echo {"status":"extracting","stage":"extract","message":"Extracting update..."} > "%STATUS_DIR%\status.json"
echo Extracting...
mkdir "%UPDATE_DIR%"
powershell -NoProfile -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%UPDATE_DIR%' -Force"

:: Find the extracted subfolder (GitHub adds -main suffix)
set "SOURCE_DIR="
for /d %%D in ("%UPDATE_DIR%\*") do (
    set "SOURCE_DIR=%%D"
    goto :found_source
)
:found_source

if not defined SOURCE_DIR (
    echo [ERROR] Could not find extracted files.
    del /F /Q "%ZIP_FILE%" 2>nul
    echo {"status":"error","stage":"extract","message":"Could not find extracted files after ZIP extraction."} > "%STATUS_DIR%\status.json"
    pause
    exit /b 1
)

echo Source found: %SOURCE_DIR%

:: Copy using ROBOCOPY (update existing files, add new ones, don't delete extras in target)
echo {"status":"copying","stage":"copy","message":"Copying files to extension folder..."} > "%STATUS_DIR%\status.json"
echo Installing files...
robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /E /NFL /NDL /NJH /NJS /nc /ns /np
set "ROBO_ERR=!errorlevel!"

:: Robocopy exit codes: 0-7 = success, 8+ = error
if !ROBO_ERR! geq 8 (
    echo [WARNING] Robocopy had issues ^(code: !ROBO_ERR!^), retrying with xcopy...
    xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /Y /I /Q 2>nul
)

:: Verify installation
if not exist "%TARGET_DIR%\CSXS\manifest.xml" (
    if not exist "%TARGET_DIR%\manifest.xml" (
        echo [ERROR] Update incomplete. manifest.xml not found.
        echo Source directory contained:
        dir "%SOURCE_DIR%" /b
        echo {"status":"error","stage":"install","message":"Update incomplete. manifest.xml not found after copy."} > "%STATUS_DIR%\status.json"
        pause
        exit /b 1
    )
)

:: Cleanup temp files
echo {"status":"cleaning","stage":"clean","message":"Cleaning up temporary files..."} > "%STATUS_DIR%\status.json"
echo Cleaning up...
rmdir /S /Q "%UPDATE_DIR%" 2>nul
del /F /Q "%ZIP_FILE%" 2>nul

:: Count installed files
for /f %%A in ('dir "%TARGET_DIR%" /s /b ^| find /c /v ""') do set "FILE_COUNT=%%A"

echo.
echo ==========================================
echo    SUCCESS - Main Update Complete
echo ==========================================
echo.
echo Location: %TARGET_DIR%
echo Files: %FILE_COUNT%
echo.

:: ==========================================================
::  COMPANION EXTENSIONS: ornamentReplacer + symbolPalette
:: ==========================================================

echo Checking companion extensions...

:: --- ornamentReplacer ---
set "OR_ZIP_URL=https://github.com/mhdmuzakkir/ornamentReplacer/archive/refs/heads/main.zip?nocache=%RANDOM%%RANDOM%"
set "OR_ZIP=%TEMP%\mushaf_or_dl_%RANDOM%.zip"
set "OR_EXTRACT=%TEMP%\mushaf_or_ext_%RANDOM%%RANDOM%"
set "OR_TARGET=%APPDATA%\Adobe\CEP\extensions\ornamentReplacer"

echo   [1/2] Downloading ornamentReplacer...
powershell -NoProfile -Command "$wc=New-Object Net.WebClient; $wc.DownloadFile('%OR_ZIP_URL%','%OR_ZIP%')" >nul 2>&1

if exist "%OR_ZIP%" (
    for %%F in ("%OR_ZIP%") do (
        if %%~zF GTR 0 (
            if exist "%OR_EXTRACT%" rmdir /S /Q "%OR_EXTRACT%" 2>nul
            mkdir "%OR_EXTRACT%" 2>nul
            powershell -NoProfile -Command "Expand-Archive -Path '%OR_ZIP%' -DestinationPath '%OR_EXTRACT%' -Force" >nul 2>&1
            
            set "OR_FOUND="
            for /d %%D in ("%OR_EXTRACT%\*") do (
                set "OR_FOUND=1"
                if exist "%OR_TARGET%" rmdir /S /Q "%OR_TARGET%" 2>nul
                mkdir "%OR_TARGET%" 2>nul
                robocopy "%%D" "%OR_TARGET%" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul 2>&1
                echo         ornamentReplacer installed successfully.
            )
            if not defined OR_FOUND echo     [ERROR] Extraction folder was empty for ornamentReplacer.
            rmdir /S /Q "%OR_EXTRACT%" 2>nul
        ) else (
            echo     [WARNING] ornamentReplacer download failed (0-byte payload. Check repository branch name/privacy).
        )
    )
    del /F /Q "%OR_ZIP%" 2>nul
) else (
    echo         ornamentReplacer download skipped (network error).
)

:: --- symbolPalette ---
set "SP_ZIP_URL=https://github.com/mhdmuzakkir/symbolPalette/archive/refs/heads/main.zip?nocache=%RANDOM%%RANDOM%"
set "SP_ZIP=%TEMP%\mushaf_sp_dl_%RANDOM%.zip"
set "SP_EXTRACT=%TEMP%\mushaf_sp_ext_%RANDOM%%RANDOM%"
set "SP_TARGET=%APPDATA%\Adobe\CEP\extensions\symbolPalette"

echo   [2/2] Downloading symbolPalette...
powershell -NoProfile -Command "$wc=New-Object Net.WebClient; $wc.DownloadFile('%SP_ZIP_URL%','%SP_ZIP%')" >nul 2>&1

if exist "%SP_ZIP%" (
    for %%F in ("%SP_ZIP%") do (
        if %%~zF GTR 0 (
            if exist "%SP_EXTRACT%" rmdir /S /Q "%SP_EXTRACT%" 2>nul
            mkdir "%SP_EXTRACT%" 2>nul
            powershell -NoProfile -Command "Expand-Archive -Path '%SP_ZIP%' -DestinationPath '%SP_EXTRACT%' -Force" >nul 2>&1
            
            set "SP_FOUND="
            for /d %%D in ("%SP_EXTRACT%\*") do (
                set "SP_FOUND=1"
                if exist "%SP_TARGET%" rmdir /S /Q "%SP_TARGET%" 2>nul
                mkdir "%SP_TARGET%" 2>nul
                robocopy "%%D" "%SP_TARGET%" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul 2>&1
                echo         symbolPalette installed successfully.
            )
            if not defined SP_FOUND echo     [ERROR] Extraction folder was empty for symbolPalette.
            rmdir /S /Q "%SP_EXTRACT%" 2>nul
        ) else (
            echo     [WARNING] symbolPalette download failed (0-byte payload. Check repository branch name/privacy).
        )
    )
    del /F /Q "%SP_ZIP%" 2>nul
) else (
    echo         symbolPalette download skipped (network error).
)

:: Write final status
echo {"status":"done","stage":"install","message":"Update completed. Please restart Illustrator."} > "%STATUS_DIR%\status.json"

echo.
echo ==========================================
echo    ALL TASKS COMPLETE
echo ==========================================
echo 1. CLOSE Illustrator completely if running.
echo 2. Reopen Illustrator to reload extensions.
echo.

if "%~1"== "" pause
endlocal
exit /b 0