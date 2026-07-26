@echo off
setlocal
cd /d "%~dp0"
title BlueFox Odyssey - Verification des images

if not exist "Images\" (
  echo ERREUR : le dossier Images est absent.
  echo Il doit etre place a cote de index.html.
  pause
  exit /b 1
)

echo Reconstruction du catalogue depuis le dossier Images...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\generer-catalogue-images.ps1"
if errorlevel 1 (
  echo.
  echo ECHEC : le catalogue n'a pas pu etre reconstruit.
  pause
  exit /b 1
)

echo.
echo Catalogue repare. Lancement de BlueFox Odyssey...
start "" "%~dp0LANCER_BLUEFOX.bat"
timeout /t 2 /nobreak >nul
exit /b 0
