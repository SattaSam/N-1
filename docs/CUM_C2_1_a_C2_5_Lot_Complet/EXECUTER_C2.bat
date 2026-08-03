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
  echo ERREUR : Python 3 introuvable.
  pause
  exit /b 10
)
%PYTHON_CMD% -c "import openpyxl" >nul 2>nul
if errorlevel 1 (
  %PYTHON_CMD% -m pip install --user openpyxl
  if errorlevel 1 (
    echo ERREUR : installation de openpyxl impossible.
    pause
    exit /b 11
  )
)
echo Assemblage C2...
%PYTHON_CMD% assembler_c2.py --input . --output CUM_C2_MASTER_LOCAL.xlsx
if errorlevel 1 goto :fail
echo Compilation JSON...
%PYTHON_CMD% compiler_cum.py --workbook CUM_MASTER_GLOBAL_C2_ASSEMBLE.xlsx --output compiled
if errorlevel 1 goto :fail
echo Validation...
%PYTHON_CMD% validator_cum.py --compiled compiled --output validation-report.json
if errorlevel 1 echo Le validateur a detecte des erreurs. Consultez validation-report.json.
echo Graphe...
%PYTHON_CMD% graph_cum.py --compiled compiled --output CUM_DEPENDANCES.graphml
echo.
echo TRAITEMENT TERMINE.
pause
exit /b 0
:fail
echo ECHEC. Consultez les messages ci-dessus.
pause
exit /b 12
