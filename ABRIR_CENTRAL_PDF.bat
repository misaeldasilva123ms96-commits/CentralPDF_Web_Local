@echo off
setlocal
cd /d "%~dp0"

if exist "%~dp0CentralPDF_Local_Server.exe" (
  start "" "%~dp0CentralPDF_Local_Server.exe"
  exit /b 0
)

rem Fallback para computadores que bloqueiam executaveis locais.
start "" "%~dp0index.html"
exit /b 0
