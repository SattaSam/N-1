@echo off
setlocal
cd /d "%~dp0"
title BlueFox Odyssey

echo Lancement local de BlueFox Odyssey...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bluefox-local-server.ps1"

if errorlevel 1 (
  echo.
  echo Le lanceur local a rencontre une erreur.
  echo Verifiez que PowerShell est disponible puis relancez ce fichier.
  pause
)
