[CmdletBinding()]
param(
    [switch]$ListOnly
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pdfJsVersion = '6.2.108'
$pdfJsPackage = @{
    Url = "https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-$pdfJsVersion.tgz"
    Sha256 = 'b3e68d5cda70551a90b3f771419d379e20fc788ce056fa32de73608e01df47f4'
    MinBytes = 8000000
    ApiSha256 = '9fab0c910bf1484835c5c2aeb68f7eb3dfce7f9eb435a004526c5af86d70890c'
    WorkerSha256 = 'bc0d1b88ea0b66196b1d36a58ac243c6d92adfe725624e2a9fdd381bdf8ef434'
    ResourcesSha256 = '960886d4e606e53b75909ea28efae08ff7f41011b1b8b09ed370f9c9087761be'
}

$items = @(
    @{ Url = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'; Path = 'vendor/pdf-lib.min.js'; MinBytes = 300000; Sha256 = '0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js'; Path = 'vendor/tesseract/tesseract.min.js'; MinBytes = 50000; Sha256 = '000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js'; Path = 'vendor/tesseract/worker.min.js'; MinBytes = 90000; Sha256 = '576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core.wasm.js'; MinBytes = 3000000; Sha256 = '0bc6ce3e5fbbd0cd89706cf2fd70960e3372f4f01ee24265b26990808aaeb286' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-simd.wasm.js'; MinBytes = 3000000; Sha256 = '6b61ef4e911b5cf57e656bbfe983d6e2b3711a02dd164154ddda064566e8e09d' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-lstm.wasm.js'; MinBytes = 2500000; Sha256 = 'eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd-lstm.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js'; MinBytes = 2500000; Sha256 = 'c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-relaxedsimd.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-relaxedsimd.wasm.js'; MinBytes = 3000000; Sha256 = '843074aa5bad1cc6421b74a86201768ced9f244795e4d81435435a61a40ce535' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-relaxedsimd-lstm.wasm.js'; Path = 'vendor/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js'; MinBytes = 2500000; Sha256 = '861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3' },
    @{ Url = 'https://tessdata.projectnaptha.com/4.0.0/por.traineddata.gz'; Path = 'vendor/tessdata/4.0.0/por.traineddata.gz'; MinBytes = 500000; Sha256 = '3f5feea9dfc39106c92348089097a39bec66e9d6d09ca49befebb0bb60947374' },
    @{ Url = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'; Path = 'vendor/tessdata/4.0.0/eng.traineddata.gz'; MinBytes = 500000; Sha256 = 'ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468' },
    # jsDelivr minifica UTIF.min.js dinamicamente, portanto o hash pode mudar
    # sem alteração da versão. UTIF.js é o arquivo original do pacote npm.
    @{ Url = 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js'; Path = 'vendor/UTIF.js'; MinBytes = 50000; Sha256 = 'e3e76115f49571e39624c3316a76b3c4c5b2c5ca518dfec4b66a9f7af8c6d059' },
    @{ Url = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'; Path = 'vendor/heic2any.min.js'; MinBytes = 10000; Sha256 = '0963cfa50e9e1e7e6af929a40a81e3e898a673f1270eafa6917dd137e4968164' }
)

if ($ListOnly) {
    $items | ForEach-Object { '{0}  {1}' -f $_.Sha256, $_.Path }
    '{0}  pdfjs-dist-{1}.tgz (origem de vendor/pdfjs/)' -f $pdfJsPackage.Sha256, $pdfJsVersion
    exit 0
}

foreach ($item in $items) {
    $target = Join-Path $projectRoot $item.Path
    $targetDirectory = Split-Path -Parent $target
    $partial = "$target.partial"
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue

    if (Test-Path -LiteralPath $target) {
        $existing = Get-Item -LiteralPath $target
        $existingHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash.ToLowerInvariant()
        if ($existing.Length -ge [int64]$item.MinBytes -and $existingHash -eq $item.Sha256) {
            Write-Host "Reutilizando $($item.Path): SHA-256 válido."
            continue
        }
    }

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

function Get-PdfJsResourceDigest([string]$PdfJsRoot) {
    $hashLines = Get-ChildItem -LiteralPath $PdfJsRoot -File -Recurse | Where-Object {
        $_.FullName -match '[\\/](cmaps|iccs|standard_fonts|wasm)[\\/]'
    } | Sort-Object FullName | ForEach-Object {
        $relative = $_.FullName.Substring($PdfJsRoot.Length).TrimStart('\', '/').Replace('\', '/')
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
        "$relative $hash"
    }
    $bytes = [Text.Encoding]::UTF8.GetBytes(($hashLines -join "`n"))
    return ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))).ToLowerInvariant()
}

function Test-PdfJsInstallation {
    $pdfJsRoot = Join-Path $projectRoot 'vendor/pdfjs'
    $apiPath = Join-Path $pdfJsRoot 'pdf.min.mjs'
    $workerPath = Join-Path $pdfJsRoot 'pdf.worker.min.mjs'
    $licensePath = Join-Path $pdfJsRoot 'LICENSE'
    if (!(Test-Path -LiteralPath $apiPath) -or !(Test-Path -LiteralPath $workerPath) -or !(Test-Path -LiteralPath $licensePath)) {
        return $false
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $apiPath).Hash.ToLowerInvariant() -ne $pdfJsPackage.ApiSha256) { return $false }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $workerPath).Hash.ToLowerInvariant() -ne $pdfJsPackage.WorkerSha256) { return $false }
    return (Get-PdfJsResourceDigest $pdfJsRoot) -eq $pdfJsPackage.ResourcesSha256
}

if (Test-PdfJsInstallation) {
    Write-Host "Reutilizando PDF.js ${pdfJsVersion}: módulos e recursos válidos."
}
else {
    $pdfJsRoot = Join-Path $projectRoot 'vendor/pdfjs'
    $archive = Join-Path ([IO.Path]::GetTempPath()) "centralpdf-pdfjs-$pdfJsVersion-$PID.tgz"
    $extractRoot = Join-Path ([IO.Path]::GetTempPath()) "centralpdf-pdfjs-$pdfJsVersion-$PID"
    try {
        Write-Host "Baixando e verificando PDF.js $pdfJsVersion..."
        Invoke-WebRequest -UseBasicParsing -Uri $pdfJsPackage.Url -OutFile $archive
        $archiveFile = Get-Item -LiteralPath $archive
        if ($archiveFile.Length -lt [int64]$pdfJsPackage.MinBytes) { throw 'Pacote PDF.js incompleto.' }
        $archiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
        if ($archiveHash -ne $pdfJsPackage.Sha256) {
            throw "SHA-256 inválido para PDF.js. Esperado $($pdfJsPackage.Sha256); recebido $archiveHash"
        }

        New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
        & tar -xzf $archive -C $extractRoot
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível extrair o pacote PDF.js.' }

        if (Test-Path -LiteralPath $pdfJsRoot) { Remove-Item -LiteralPath $pdfJsRoot -Recurse -Force }
        New-Item -ItemType Directory -Path $pdfJsRoot -Force | Out-Null
        $packageRoot = Join-Path $extractRoot 'package'
        Copy-Item -LiteralPath (Join-Path $packageRoot 'legacy/build/pdf.min.mjs') -Destination $pdfJsRoot
        Copy-Item -LiteralPath (Join-Path $packageRoot 'legacy/build/pdf.worker.min.mjs') -Destination $pdfJsRoot
        Copy-Item -LiteralPath (Join-Path $packageRoot 'LICENSE') -Destination $pdfJsRoot
        foreach ($directory in @('cmaps', 'iccs', 'standard_fonts', 'wasm')) {
            Copy-Item -LiteralPath (Join-Path $packageRoot $directory) -Destination $pdfJsRoot -Recurse
        }
        if (!(Test-PdfJsInstallation)) { throw 'A instalação extraída do PDF.js não passou na validação.' }
    }
    finally {
        Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$pdfJsRoot = Join-Path $projectRoot 'vendor/pdfjs'
$pdfJsAssets = Get-ChildItem -LiteralPath $pdfJsRoot -File -Recurse | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($projectRoot.Length).TrimStart('\', '/').Replace('\', '/')
    "./$relative"
}
$manifestPath = Join-Path $projectRoot 'vendor/pdfjs-manifest.js'
$manifestJson = ConvertTo-Json -Compress -InputObject @($pdfJsAssets)
$manifest = "self.CentralPDFPdfJsAssets = Object.freeze($manifestJson);"
[IO.File]::WriteAllText($manifestPath, $manifest, [Text.UTF8Encoding]::new($false))

$statusPath = Join-Path $projectRoot 'vendor/offline-status.js'
$preparedAt = [DateTime]::UtcNow.ToString('o')
$status = "window.CentralPDFOfflineStatus = Object.freeze({ prepared: true, preparedAt: '$preparedAt', pdfLib: true, pdfJs: true, pdfJsVersion: '$pdfJsVersion', pdfWorker: true, libPdf: true, ocr: true, conversions: true });"
[IO.File]::WriteAllText($statusPath, $status, [Text.UTF8Encoding]::new($false))
Write-Host 'Motores baixados e verificados com sucesso.'
