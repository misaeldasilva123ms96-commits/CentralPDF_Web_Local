@echo off
setlocal EnableExtensions
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 INICIAR_PREVIA.py
  exit /b
)
where python >nul 2>nul
if not errorlevel 1 (
  python INICIAR_PREVIA.py
  exit /b
)
echo Esta previa local requer Python 3.
echo Execute pelo ambiente local do Codex ou instale o Python para iniciar.
pause
