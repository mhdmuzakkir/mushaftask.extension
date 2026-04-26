@echo off
setlocal EnableDelayedExpansion

:: Target installation path
set "TARGET_DIR=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\mushaftask.extension"
set "REPO_URL=https://github.com/mhdmuzakkir/mushaftask.extension.git"

:: Check for admin privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please run this batch file as Administrator.
    echo Right-click the file and select "Run as administrator".
    pause
    exit /b 1
)

echo ==========================================
echo   MushafTask Extension Installer/Updater
echo ==========================================
echo.

:: Ensure parent directory exists
if not exist "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions" (
    echo Creating extensions directory...
    mkdir "C:\Program Files (x86)\Common Files\Adobe\CEP\extensions"
)

:: Check if already installed
if exist "%TARGET_DIR%\.git" (
    echo Existing installation found at:
    echo   %TARGET_DIR%
    echo.
    echo Updating to latest version...
    cd /d "%TARGET_DIR%"
    git pull
    if %errorlevel% neq 0 (
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
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Clone failed. Please check your internet connection.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Extension installed successfully!
)

echo.
echo You may need to restart Adobe applications to see changes.
echo.
pause
endlocal
