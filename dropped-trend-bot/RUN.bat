@echo off
cd /d "%~dp0"
title Dropped Trend GUI

echo ========================================
echo Dropped Trend GUI
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Install Node.js LTS first.
    pause
    exit /b 1
)

if not exist package.json (
    echo ERROR: package.json not found.
    pause
    exit /b 1
)

if not exist node_modules\.bin\electron.cmd (
    echo Installing npm packages...
    call npm install

    if errorlevel 1 goto error
)

if not exist node_modules\.bin\playwright.cmd (
    echo Installing Playwright...
    call npm install

    if errorlevel 1 goto error
)

echo.
echo Installing/checking Chromium...
call npx playwright install chromium

if errorlevel 1 goto error

echo.
echo Starting GUI...
call npm start

if errorlevel 1 goto error

pause
exit /b 0

:error

echo.
echo ========================================
echo ERROR occurred.
echo ========================================
echo.

pause
exit /b 1