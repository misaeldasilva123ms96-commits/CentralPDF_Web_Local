@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "vendor" mkdir "vendor"
if not exist "vendor\tesseract" mkdir "vendor\tesseract"
if not exist "vendor\tesseract-core" mkdir "vendor\tesseract-core"
if not exist "vendor\tessdata\4.0.0" mkdir "vendor\tessdata\4.0.0"

echo.
echo Central PDF 1.0 - Preparacao offline
echo =================================
echo Esta etapa baixa os motores publicos uma unica vez para a pasta vendor.
echo Nenhum documento pessoal sera enviado.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue';" ^
  "$items=@(" ^
  "@('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js','vendor/pdf-lib.min.js',300000)," ^
  "@('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','vendor/pdf.min.js',200000)," ^
  "@('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','vendor/pdf.worker.min.js',500000)," ^
  "@('https://esm.sh/@libpdf/core@0.4.1?bundle','vendor/libpdf-core.mjs',50000)," ^
  "@('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js','vendor/tesseract/tesseract.min.js',50000)," ^
  "@('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js','vendor/tesseract/worker.min.js',90000)," ^
  "@('https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js','vendor/tesseract-core/tesseract-core.wasm.js',3000000)," ^
  "@('https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd.wasm.js','vendor/tesseract-core/tesseract-core-simd.wasm.js',3000000)," ^
  "@('https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js','vendor/tesseract-core/tesseract-core-lstm.wasm.js',2500000)," ^
  "@('https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd-lstm.wasm.js','vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',2500000)," ^
  "@('https://tessdata.projectnaptha.com/4.0.0/por.traineddata.gz','vendor/tessdata/4.0.0/por.traineddata.gz',500000)," ^
  "@('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz','vendor/tessdata/4.0.0/eng.traineddata.gz',500000)," ^
  "@('https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.min.js','vendor/UTIF.min.js',20000)," ^
  "@('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js','vendor/heic2any.min.js',10000)" ^
  ");" ^
  "foreach($item in $items){ Write-Host ('Baixando '+$item[1]+'...'); Invoke-WebRequest -UseBasicParsing -Uri $item[0] -OutFile $item[1]; if((Get-Item $item[1]).Length -lt [int]$item[2]){ throw ('Arquivo incompleto: '+$item[1]) } };" ^
  "Write-Host 'Motores verificados com sucesso.'"

if errorlevel 1 (
  echo.
  echo Nao foi possivel concluir o download.
  echo Verifique a internet, o proxy ou as regras da empresa.
  echo A abertura direta continua disponivel pelo index.html.
  pause
  exit /b 1
)

echo.
echo Preparacao concluida. PDF, seguranca, OCR e conversao HEIC/TIFF poderao usar motores locais.
if exist "%~dp0CentralPDF_Local_Server.exe" start "" "%~dp0CentralPDF_Local_Server.exe"
pause
exit /b 0
