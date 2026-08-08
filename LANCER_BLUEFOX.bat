@echo off
setlocal
cd /d "%~dp0"
title BlueFox Odyssey

echo Actualisation automatique du catalogue Images...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Images\GENERER_CATALOGUE_IMAGES.ps1"
if errorlevel 1 (
  echo.
  echo La mise a jour du catalogue Images a echoue.
  echo Le jeu n'est pas lance pour eviter d'utiliser des references obsoletes.
  pause
  exit /b 1
)

echo.
echo Lancement local de BlueFox Odyssey...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bluefox-local-server.ps1"

if errorlevel 1 (
  echo.
  echo Le lanceur local a rencontre une erreur.
  echo Verifiez que PowerShell est disponible puis relancez ce fichier.
  pause
)
