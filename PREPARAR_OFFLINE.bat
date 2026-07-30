@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo Central PDF 1.2.0 - Preparacao offline verificada
echo =================================================
echo Esta etapa baixa motores publicos com versoes fixas e valida SHA-256.
echo Nenhum documento pessoal sera enviado.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\prepare-offline.ps1"

if errorlevel 1 (
  echo.
  echo Nao foi possivel concluir ou validar o download.
  echo Nenhum arquivo parcial sera usado pelo aplicativo.
  echo Verifique a internet, o proxy ou as regras da empresa.
  pause
  exit /b 1
)

echo.
echo Preparacao concluida e hashes validados.
echo PDF, seguranca, OCR e conversao HEIC/TIFF usarao motores locais.
if exist "%~dp0CentralPDF_Local_Server.exe" start "" "%~dp0CentralPDF_Local_Server.exe"
pause
exit /b 0
