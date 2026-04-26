@echo off
setlocal EnableDelayedExpansion

:: ==========================================
::  MushafTask Extension - User Install
::  No Administrator privileges required
::  Installs to: %APPDATA%\Adobe\CEP\extensions
:: ==========================================

set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\mushaftask.extension"
set "REPO_URL=https://github.com/mhdmuzakkir/mushaftask.extension.git"

echo ==========================================
echo   MushafTask Extension - User Installer
echo ==========================================
echo.
echo This installer does NOT require Administrator.
echo It will install to:
echo   %TARGET_DIR%
echo.

:: Ensure parent directory exists
if not exist "%APPDATA%\Adobe\CEP\extensions" (
    echo Creating extensions directory...
    mkdir "%APPDATA%\Adobe\CEP\extensions"
)

:: Check if already installed
if exist "%TARGET_DIR%\.git" (
    echo Existing installation found at:
    echo   %TARGET_DIR%
    echo.
    echo Updating to latest version...
    cd /d "%TARGET_DIR%"
    git pull
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Update failed. Please check your internet connection.
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
        echo [ERROR] Clone failed. Please check your internet connection.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Extension installed successfully!
)

echo.
echo You may need to restart Adobe Illustrator to see changes.
echo.
echo IMPORTANT: Enable debug mode if this is a fresh install:
echo   reg add "HKCU\SOFTWARE\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
echo.
pause
endlocal
