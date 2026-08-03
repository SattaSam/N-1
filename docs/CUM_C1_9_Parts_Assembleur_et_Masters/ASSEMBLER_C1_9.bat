@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
  echo ERREUR : Python 3 est introuvable.
  pause
  exit /b 10
)

%PYTHON_CMD% -c "import openpyxl" >nul 2>nul
if errorlevel 1 (
  %PYTHON_CMD% -m pip install --user openpyxl
  if errorlevel 1 (
    echo ERREUR : impossible d'installer openpyxl.
    pause
    exit /b 11
  )
)

%PYTHON_CMD% "%~dp0assembler_c1_9.py" --input "%~dp0" --output "CUM_C1_9_MASTER_LOCAL.xlsx"
if errorlevel 1 (
  echo ECHEC DE L'ASSEMBLAGE.
  pause
  exit /b 12
)

echo SUCCES : CUM_C1_9_MASTER_LOCAL.xlsx a ete cree.
pause
