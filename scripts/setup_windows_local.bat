@echo off
REM One-click local (no Docker) setup
cd /d "%~dp0.."
powershell -NoExit -ExecutionPolicy Bypass -File "scripts\setup_windows_local.ps1" -AutoRun -KeepOpen
pause
