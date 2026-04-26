@echo off
setlocal EnableDelayedExpansion

:: ==========================================================
::  Mushaf Task Manager - Team Installer
::  No Administrator required.
::  Installs to: %%APPDATA%%\Adobe\CEP\extensions\
:: ==========================================================

set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\mushaftask.extension"
set "REPO_URL=https://github.com/mhdmuzakkir/mushaftask.extension.git"
set "ZIP_URL=https://github.com/mhdmuzakkir/mushaftask.extension/archive/refs/heads/main.zip"
set "UPDATE_DIR=%TEMP%\mushaftask-installer"

echo ==========================================
echo   Mushaf Task Manager - Team Installer
echo ==========================================
echo.

:: Ensure extensions directory exists
if not exist "%APPDATA%\Adobe\CEP\extensions" (
    echo Creating CEP extensions directory...
    mkdir "%APPDATA%\Adobe\CEP\extensions"
)

:: Check if Git is available
where git >nul 2>&1
if %errorlevel% equ 0 (
    echo [Git found] Using Git clone/pull method.
    echo.

    if exist "%TARGET_DIR%\.git" (
        echo Existing installation found.
        echo Updating to latest version...
        cd /d "%TARGET_DIR%"
        git pull
        if !errorlevel! neq 0 (
            echo.
            echo [ERROR] Git pull failed. Check your internet connection.
            pause
            exit /b 1
        )
        echo.
        echo [SUCCESS] Extension updated successfully!
    ) else (
        echo Installing to:
        echo   %TARGET_DIR%
        echo.
        git clone "%REPO_URL%" "%TARGET_DIR%"
        if !errorlevel! neq 0 (
            echo.
            echo [ERROR] Git clone failed. Check your internet connection.
            pause
            exit /b 1
        )
        echo.
        echo [SUCCESS] Extension installed successfully!
    )
) else (
    echo [Git not found] Using ZIP download method.
    echo.

    if not exist "%UPDATE_DIR%" mkdir "%UPDATE_DIR%"

    :: Download ZIP via PowerShell
    echo Downloading latest version...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $wc=New-Object Net.WebClient; $wc.DownloadFile('%ZIP_URL%','%UPDATE_DIR%\mushaf.zip'); exit 0 } catch { exit 1 }" >nul 2>&1

    if errorlevel 1 (
        echo [ERROR] Download failed. Check your internet connection.
        pause
        exit /b 1
    )

    :: Extract
    echo Extracting files...
    powershell -NoProfile -Command "Expand-Archive -Path '%UPDATE_DIR%\mushaf.zip' -DestinationPath '%UPDATE_DIR%\extracted' -Force" >nul 2>&1

    if errorlevel 1 (
        echo [ERROR] Extraction failed.
        pause
        exit /b 1
    )

    :: Find extracted folder
    set "SOURCE_DIR="
    for /d %%D in ("%UPDATE_DIR%\extracted\mushaftask*") do (
        set "SOURCE_DIR=%%D"
        goto :found
    )
    :found

    if "%SOURCE_DIR%"=="" (
        echo [ERROR] Could not find extracted folder.
        pause
        exit /b 1
    )

    :: Copy files
    echo Copying files to extension folder...
    if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
    xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /Y /I /Q >nul 2>&1

    echo.
    echo [SUCCESS] Extension installed successfully!
)

:: Enable CEP debug mode (HKCU = no admin required)
echo.
echo Enabling CEP debug mode...
reg add "HKCU\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
if %errorlevel% equ 0 (
    echo Debug mode enabled.
) else (
    echo Could not enable debug mode automatically.
    echo You can enable it manually by running:
    echo   reg add "HKCU\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
)

echo.
echo ==========================================
echo   INSTALLATION COMPLETE
echo ==========================================
echo.
echo Location: %TARGET_DIR%
echo.
echo NEXT STEPS:
echo 1. Restart Adobe Illustrator if it is already open.
echo 2. Open Illustrator ^> Window ^> Extensions ^> Mushaf Task Manager
echo 3. On first run, select your Tasks Folder and Project Folder.
echo.
pause
endlocal
