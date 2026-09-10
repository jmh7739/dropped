@echo off
cd /d "%~dp0"
title Dropped Trend Auto Worker

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  pause
  exit /b 1
)

if not exist node_modules (
  call npm install
  if errorlevel 1 goto error
)

echo Dropped automatic worker is running.
echo Keep this window open. Data refreshes every 1/4 hours and the extension handles affiliate links.
call npm run start:auto
if errorlevel 1 goto error
exit /b 0

:error
echo.
echo Automatic worker stopped because of an error.
pause
exit /b 1
