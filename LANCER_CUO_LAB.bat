@echo off
setlocal
cd /d "%~dp0"
title BlueFox CUO Lab

echo Lancement local du banc de validation CUO...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bluefox-local-server.ps1" -StartPage "cuo-lab/index.html" -WindowTitle "BlueFox CUO Lab"

if errorlevel 1 (
  echo.
  echo Le lanceur CUO a rencontre une erreur.
  echo Verifiez que PowerShell est disponible puis relancez ce fichier.
  pause
)
