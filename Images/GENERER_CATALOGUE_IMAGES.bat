@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0GENERER_CATALOGUE_IMAGES.ps1"
if errorlevel 1 (
  echo.
  echo La generation du catalogue a echoue.
  pause
  exit /b 1
)
echo.
echo Le catalogue Images a ete actualise.
pause
