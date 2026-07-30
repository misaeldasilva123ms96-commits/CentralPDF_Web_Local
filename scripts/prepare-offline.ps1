[CmdletBinding()]
param(
    [switch]$ListOnly
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot

$items = @(
    @{ Url = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'; Path = 'vendor/pdf-lib.min.js'; MinBytes = 300000; Sha256 = '0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f' },
    @{ Url = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; Path = 'vendor/pdf.min.js'; MinBytes = 200000; Sha256 = '5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946' },
    @{ Url = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; Path = 'vendor/pdf.worker.min.js'; MinBytes = 500000; Sha256 = 'feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js'; Path = 'vendor/tesseract/tesseract.min.js'; MinBytes = 50000; Sha256 = '000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js'; Path = 'vendor/tesseract/worker.min.js'; MinBytes = 90000; Sha256 = '576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core.wasm.js'; MinBytes = 3000000; Sha256 = '0bc6ce3e5fbbd0cd89706cf2fd70960e3372f4f01ee24265b26990808aaeb286' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-simd.wasm.js'; MinBytes = 3000000; Sha256 = '6b61ef4e911b5cf57e656bbfe983d6e2b3711a02dd164154ddda064566e8e09d' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-lstm.wasm.js'; MinBytes = 2500000; Sha256 = 'eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd-lstm.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js'; MinBytes = 2500000; Sha256 = 'c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38' },
    @{ Url = 'https://tessdata.projectnaptha.com/4.0.0/por.traineddata.gz'; Path = 'vendor/tessdata/4.0.0/por.traineddata.gz'; MinBytes = 500000; Sha256 = '3f5feea9dfc39106c92348089097a39bec66e9d6d09ca49befebb0bb60947374' },
    @{ Url = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'; Path = 'vendor/tessdata/4.0.0/eng.traineddata.gz'; MinBytes = 500000; Sha256 = 'ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.min.js'; Path = 'vendor/UTIF.min.js'; MinBytes = 20000; Sha256 = '14213e3d31a30b1bc535e35359f3b91ad7d8539192ae191d63f6e6b49039b56f' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'; Path = 'vendor/heic2any.min.js'; MinBytes = 10000; Sha256 = '0963cfa50e9e1e7e6af929a40a81e3e898a673f1270eafa6917dd137e4968164' }
)

if ($ListOnly) {
    $items | ForEach-Object { '{0}  {1}' -f $_.Sha256, $_.Path }
    exit 0
}

foreach ($item in $items) {
    $target = Join-Path $projectRoot $item.Path
    $targetDirectory = Split-Path -Parent $target
    $partial = "$target.partial"
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue

    try {
        Write-Host "Baixando $($item.Path)..."
        Invoke-WebRequest -UseBasicParsing -Uri $item.Url -OutFile $partial
        $file = Get-Item -LiteralPath $partial
        if ($file.Length -lt [int64]$item.MinBytes) {
            throw "Arquivo incompleto: $($item.Path)"
        }
        $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $partial).Hash.ToLowerInvariant()
        if ($actualHash -ne $item.Sha256) {
            throw "SHA-256 inválido para $($item.Path). Esperado $($item.Sha256); recebido $actualHash"
        }
        Move-Item -LiteralPath $partial -Destination $target -Force
    }
    catch {
        Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
        throw
    }
}

$statusPath = Join-Path $projectRoot 'vendor/offline-status.js'
$preparedAt = [DateTime]::UtcNow.ToString('o')
$status = "window.CentralPDFOfflineStatus = Object.freeze({ prepared: true, preparedAt: '$preparedAt', pdfLib: true, pdfJs: true, pdfWorker: true, libPdf: true, ocr: true, conversions: true });"
[IO.File]::WriteAllText($statusPath, $status, [Text.UTF8Encoding]::new($false))
Write-Host 'Motores baixados e verificados com sucesso.'
