@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\generer-catalogue-images.ps1"
if errorlevel 1 (
  echo.
  echo La generation du catalogue a echoue.
  pause
  exit /b 1
)
echo.
echo Le catalogue est pret.
echo Lancez maintenant BlueFox avec LANCER_BLUEFOX.bat.
echo Ne lancez pas index.html directement.
pause
