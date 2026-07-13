@echo off
setlocal
cd /d "%~dp0"

where pnpm > "%TEMP%\dax-query-plan-viewer-pnpm.txt"
if errorlevel 1 (
  echo pnpm is required but was not found on PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call pnpm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173'"
call pnpm dev --host 127.0.0.1
