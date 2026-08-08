@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALLER_MISSIONS_CUMULATIVE_V1.ps1"
echo.
pause
