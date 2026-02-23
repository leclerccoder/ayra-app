@echo off
REM One-click launcher for the PowerShell setup script
cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -File "scripts\setup_windows.ps1" -AutoRun
pause
