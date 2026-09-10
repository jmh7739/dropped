@echo off
cd /d "%~dp0"
title Dropped Trend GUI Build

echo ========================================
echo Dropped Trend GUI EXE Build
echo ========================================
echo.

where node >nul 2>nul

if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    pause
    exit /b 1
)

echo [1/3] npm install
call npm install

if errorlevel 1 goto error

echo.
echo [2/3] Playwright Chromium
call npx playwright install chromium

if errorlevel 1 goto error

echo.
echo [3/3] Build EXE
call npm run build:win

if errorlevel 1 goto error

echo.
echo ========================================
echo BUILD COMPLETE
echo ========================================

echo.
echo Check:
echo dist\Dropped-Trend-GUI-0.2.0.exe
echo.

pause
exit /b 0

:error

echo.
echo BUILD FAILED
echo.

pause
exit /b 1