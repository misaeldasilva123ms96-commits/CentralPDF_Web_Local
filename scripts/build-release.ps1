[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
$projectPath = [IO.Path]::GetFullPath($projectRoot)

if ($outputPath.TrimEnd([IO.Path]::DirectorySeparatorChar) -eq $projectPath.TrimEnd([IO.Path]::DirectorySeparatorChar)) {
    throw 'A saída da release não pode ser a raiz do projeto.'
}
$protectedDirectories = @('.git', 'app', 'assets', 'docs', 'scripts', 'server', 'vendor')
foreach ($directory in $protectedDirectories) {
    $protectedPath = [IO.Path]::GetFullPath((Join-Path $projectPath $directory)).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if ($outputPath.StartsWith($protectedPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw "A saída da release não pode ficar dentro de $directory."
    }
}
if (Test-Path -LiteralPath $outputPath) {
    throw "A pasta de saída já existe: $outputPath"
}

$versionChecks = @(
    @{ Path = 'README.md'; Pattern = "# Central PDF & Imagem $Version" },
    @{ Path = 'manifest.webmanifest'; Pattern = "Central PDF & Imagem $Version" },
    @{ Path = 'index.html'; Pattern = "Web local $Version" },
    @{ Path = 'assets/js/stable-1.0.js'; Pattern = "const VERSION='$Version'" },
    @{ Path = 'app/package.json'; Pattern = "`"version`": `"$Version`"" },
    @{ Path = 'app/package-lock.json'; Pattern = "`"version`": `"$Version`"" },
    @{ Path = 'app/src/App.tsx'; Pattern = "const BUILD_VERSION = '$Version'" },
    @{ Path = 'sw.js'; Pattern = "centralpdf-v$Version-" },
    @{ Path = 'server/main.go'; Pattern = "`"version`":`"$Version`"" }
)
foreach ($check in $versionChecks) {
    $content = Get-Content -LiteralPath (Join-Path $projectRoot $check.Path) -Raw
    if (-not $content.Contains($check.Pattern)) {
        throw "Versão $Version não encontrada em $($check.Path)."
    }
}

$executable = Join-Path $projectRoot 'CentralPDF_Local_Server.exe'
$checksumFile = Join-Path $projectRoot 'checksums.sha256'
$expectedExecutableHash = ((Get-Content -LiteralPath $checksumFile -Raw) -split '\s+')[0].ToLowerInvariant()
$actualExecutableHash = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualExecutableHash -ne $expectedExecutableHash) {
    throw 'O executável não corresponde ao checksums.sha256 versionado.'
}

$offlineStatus = Get-Content -LiteralPath (Join-Path $projectRoot 'vendor/offline-status.js') -Raw
if ($offlineStatus -notmatch 'prepared:\s*true' -or $offlineStatus -notmatch 'pdfJs:\s*true' -or $offlineStatus -notmatch 'ocr:\s*true') {
    throw 'Os motores offline ainda não foram preparados e verificados.'
}

$requiredOfflineFiles = @(
    'vendor/pdf-lib.min.js',
    'vendor/pdfjs/pdf.min.mjs',
    'vendor/pdfjs/pdf.worker.min.mjs',
    'vendor/pdfjs/LICENSE',
    'vendor/tesseract/tesseract.min.js',
    'vendor/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js',
    'vendor/tessdata/4.0.0/por.traineddata.gz',
    'vendor/UTIF.js',
    'vendor/heic2any.min.js'
)
foreach ($relativePath in $requiredOfflineFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $relativePath))) {
        throw "Motor offline ausente: $relativePath"
    }
}

New-Item -ItemType Directory -Path $outputPath | Out-Null
$packageName = "CentralPDF_Web_Local_v$Version"
$packageRoot = Join-Path $outputPath $packageName
New-Item -ItemType Directory -Path $packageRoot | Out-Null

foreach ($directory in @('assets', 'docs', 'scripts', 'vendor')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $packageRoot -Recurse
}
foreach ($file in @(
    'ABRIR_CENTRAL_PDF.bat',
    'CentralPDF_Local_Server.exe',
    'CHANGELOG.md',
    'checksums.sha256',
    'index.html',
    'manifest.webmanifest',
    'PREPARAR_OFFLINE.bat',
    'README.md',
    'SECURITY.md',
    'sw.js'
)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $packageRoot
}

$zipPath = Join-Path $outputPath "$packageName.zip"
Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal
$releasedExecutable = Join-Path $outputPath 'CentralPDF_Local_Server.exe'
Copy-Item -LiteralPath $executable -Destination $releasedExecutable

$releaseChecksumPath = Join-Path $outputPath "$packageName.sha256"
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$releaseChecksums = @(
    "$zipHash  $(Split-Path -Leaf $zipPath)",
    "$actualExecutableHash  CentralPDF_Local_Server.exe"
)
[IO.File]::WriteAllLines($releaseChecksumPath, $releaseChecksums, [Text.UTF8Encoding]::new($false))

Get-Item -LiteralPath $zipPath, $releasedExecutable, $releaseChecksumPath |
    Select-Object Name, Length, @{ Name = 'SHA256'; Expression = { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() } }
