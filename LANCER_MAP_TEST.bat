@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bluefox-local-server.ps1" -StartPage "map-test/index.html" -WindowTitle "BlueFox - Laboratoire de maps"
endlocal
