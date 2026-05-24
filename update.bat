@echo off
setlocal EnableDelayedExpansion

:: ==========================================================
::  SELF-COPY GUARD: Prevents robocopy from overwriting
::  the running script, causing a silent CMD crash
:: ==========================================================
if "%~dp0"=="%APPDATA%\Adobe\CEP\extensions\mushaftask.extension\" (
    echo [INIT] Copying to TEMP for safe execution...
    copy /Y "%~f0" "%TEMP%\mushaf_update_run.bat" >nul
    "%TEMP%\mushaf_update_run.bat" %*
    exit /b
)

:: ==========================================================
::  Mushaf Task Manager - Updater
:: ==========================================================

if "%~1"=="" (
    set "TARGET_DIR=%APPDATA%\Adobe\CEP\extensions\mushaftask.extension"
) else (
    set "TARGET_DIR=%~1"
)

set "ZIP_URL=https://github.com/mhdmuzakkir/mushaftask.extension/archive/refs/heads/main.zip?nocache=%RANDOM%%RANDOM%"
set "UPDATE_DIR=%TEMP%\mushaf_upd_%RANDOM%%RANDOM%"
set "STATUS_DIR=%TEMP%\mushaftask-update"
set "ZIP_FILE=%TEMP%\mushaf_dl_%RANDOM%.zip"

if not exist "%STATUS_DIR%" mkdir "%STATUS_DIR%"

echo ==========================================
echo   Mushaf Task Manager - Updater
echo ==========================================
echo.

if not exist "%TARGET_DIR%" (
    echo [ERROR] Extension not found at: %TARGET_DIR%
    echo {"status":"error","stage":"install","message":"Extension not found. Run install.bat first."} > "%STATUS_DIR%\status.json"
    goto :finish
)

echo Checking permissions...
set "TEST_FILE=%TARGET_DIR%\.__write_test_%RANDOM%"
type nul > "%TEST_FILE%" 2>nul
if not exist "%TEST_FILE%" (
    echo [ERROR] Cannot write to extension folder.
    echo {"status":"error","stage":"install","message":"Permission denied."} > "%STATUS_DIR%\status.json"
    goto :finish
)
del /F /Q "%TEST_FILE%" 2>nul

if exist "%UPDATE_DIR%" rmdir /S /Q "%UPDATE_DIR%" 2>nul & timeout /t 1 /nobreak >nul
if exist "%ZIP_FILE%" del /F /Q "%ZIP_FILE%" 2>nul

echo {"status":"downloading","stage":"download","message":"Downloading..."} > "%STATUS_DIR%\status.json"
echo Downloading mushaftask...
powershell -NoProfile -Command "$wc=New-Object Net.WebClient; $wc.DownloadFile('%ZIP_URL%','%ZIP_FILE%')"
if not exist "%ZIP_FILE%" (
    echo [ERROR] Download failed.
    echo {"status":"error","stage":"download","message":"Download failed."} > "%STATUS_DIR%\status.json"
    goto :finish
)

echo Extracting...
mkdir "%UPDATE_DIR%"
powershell -NoProfile -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%UPDATE_DIR%' -Force"

set "SOURCE_DIR="
for /d %%D in ("%UPDATE_DIR%\*") do (set "SOURCE_DIR=%%D" & goto :found_source)
:found_source

if not defined SOURCE_DIR (
    echo [ERROR] Could not find extracted files.
    del /F /Q "%ZIP_FILE%" 2>nul
    echo {"status":"error","stage":"extract","message":"Extraction failed."} > "%STATUS_DIR%\status.json"
    goto :finish
)

echo Source: %SOURCE_DIR%
echo Installing files...
robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /E /NFL /NDL /NJH /NJS /nc /ns /np
set "ROBO_ERR=!errorlevel!"
if !ROBO_ERR! geq 8 (
    echo [WARN] Robocopy issues (code: !ROBO_ERR!), retrying xcopy...
    xcopy "%SOURCE_DIR%\*" "%TARGET_DIR%\" /E /Y /I /Q 2>nul
)

if not exist "%TARGET_DIR%\CSXS\manifest.xml" (
    if not exist "%TARGET_DIR%\manifest.xml" (
        echo [ERROR] manifest.xml not found after copy.
        echo {"status":"error","stage":"install","message":"manifest.xml missing."} > "%STATUS_DIR%\status.json"
        goto :finish
    )
)

rmdir /S /Q "%UPDATE_DIR%" 2>nul
del /F /Q "%ZIP_FILE%" 2>nul

for /f %%A in ('dir "%TARGET_DIR%" /s /b ^| find /c /v ""') do set "FILE_COUNT=%%A"

echo.
echo ==========================================
echo   mushaftask updated (%FILE_COUNT% files)
echo ==========================================
echo.

:: ==========================================================
::  COMPANION EXTENSIONS
:: ==========================================================

echo.
echo Checking companion extensions...

call :updateCompanion "ornamentReplacer" "https://github.com/mhdmuzakkir/ornamentReplacer"
call :updateCompanion "symbolPalette" "https://github.com/mhdmuzakkir/symbolPalette"

echo.
echo ==========================================
echo   ALL DONE - Restart Illustrator
echo ==========================================
echo.

echo {"status":"done","stage":"install","message":"Success. Restart Illustrator."} > "%STATUS_DIR%\status.json"

:finish
echo.
pause
endlocal
exit /b 0

:: ==========================================================
::  SUBROUTINES
:: ==========================================================

:updateCompanion
set "COMP_NAME=%~1"
set "COMP_URL=%~2/archive/refs/heads/main.zip?nocache=%RANDOM%%RANDOM%"
set "COMP_ZIP=%TEMP%\mushaf_%COMP_NAME%_%RANDOM%.zip"
set "COMP_EXTRACT=%TEMP%\mushaf_%COMP_NAME%_ext_%RANDOM%"
set "COMP_TARGET=%APPDATA%\Adobe\CEP\extensions\%COMP_NAME%"

echo   [%COMP_NAME%] Checking...

:: Git pull if .git exists (your local dev setup)
if exist "%COMP_TARGET%\.git" (
    pushd "%COMP_TARGET%"
    git pull
    popd
    if !errorlevel! equ 0 (
        echo     [OK] Updated via git pull.
    ) else (
        echo     [WARN] git pull failed, trying ZIP...
        goto :compZip
    )
    goto :compDone
)

:: ZIP download for end-users
:compZip
echo     Downloading from GitHub...
powershell -NoProfile -Command "$wc=New-Object Net.WebClient; $wc.DownloadFile('%COMP_URL%','%COMP_ZIP%')"

if not exist "%COMP_ZIP%" (
    echo     [SKIP] Download failed (repo missing or offline)
    goto :compDone
)

echo     Extracting...
mkdir "%COMP_EXTRACT%"
powershell -NoProfile -Command "Expand-Archive -Path '%COMP_ZIP%' -DestinationPath '%COMP_EXTRACT%' -Force"

set "COMP_SOURCE="
for /d %%D in ("%COMP_EXTRACT%\*") do (set "COMP_SOURCE=%%D" & goto :compFound)
:compFound

if not defined COMP_SOURCE (
    echo     [ERROR] Extraction failed.
    rmdir /S /Q "%COMP_EXTRACT%" 2>nul & del /F /Q "%COMP_ZIP%" 2>nul
    goto :compDone
)

if exist "%COMP_TARGET%" rmdir /S /Q "%COMP_TARGET%" 2>nul & timeout /t 1 /nobreak >nul
mkdir "%COMP_TARGET%" 2>nul

robocopy "%COMP_SOURCE%" "%COMP_TARGET%" /E /NFL /NDL /NJH /NJS /nc /ns /np
set "COMP_ROBO_ERR=!errorlevel!"
if !COMP_ROBO_ERR! geq 8 (
    echo     [WARN] Robocopy issues, trying xcopy...
    xcopy "%COMP_SOURCE%\*" "%COMP_TARGET%\" /E /Y /I /Q 2>nul
)

if exist "%COMP_TARGET%\CSXS\manifest.xml" (
    echo     [OK] Installed successfully.
) else (
    if exist "%COMP_TARGET%\manifest.xml" (
        echo     [OK] Installed successfully.
    ) else (
        echo     [ERROR] Install failed — no manifest.xml found.
    )
)

rmdir /S /Q "%COMP_EXTRACT%" 2>nul
del /F /Q "%COMP_ZIP%" 2>nul

:compDone
goto :eof