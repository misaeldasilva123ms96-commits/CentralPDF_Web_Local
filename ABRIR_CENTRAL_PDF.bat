@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if exist "%~dp0CentralPDF_Local_Server.exe" (
  start "" "%~dp0CentralPDF_Local_Server.exe"
  exit /b 0
)

rem Fallback seguro: usa um servidor HTTP local, evitando as limitacoes do file://.
where py >nul 2>nul
if not errorlevel 1 (
  start "Central PDF - servidor" /min py -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html"
  exit /b 0
)

where python >nul 2>nul
if not errorlevel 1 (
  start "Central PDF - servidor" /min python -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html"
  exit /b 0
)

echo.
echo Nao foi possivel iniciar o servidor local.
echo Mantenha o arquivo CentralPDF_Local_Server.exe na mesma pasta
echo ou instale o Python para usar o modo alternativo.
echo.
echo Evite abrir index.html diretamente, pois o navegador limita os Workers PDF.
pause
exit /b 1
