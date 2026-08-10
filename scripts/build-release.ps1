[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$')]
    [string]$Version,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [Parameter(Mandatory = $true)]
    [string]$ServerExecutable
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
$projectPath = [IO.Path]::GetFullPath($projectRoot)
$serverExecutablePath = [IO.Path]::GetFullPath($ServerExecutable)

if ($outputPath.StartsWith($projectPath, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'A saída da release deve ficar fora da árvore do projeto.'
}
if (Test-Path -LiteralPath $outputPath) {
    throw "A pasta de saída já existe: $outputPath"
}
if (-not (Test-Path -LiteralPath $serverExecutablePath -PathType Leaf)) {
    throw "Executável do servidor ausente: $serverExecutablePath"
}

$appPackagePath = Join-Path $projectRoot 'app/package.json'
$appPackage = Get-Content -LiteralPath $appPackagePath -Raw | ConvertFrom-Json
if ($appPackage.version -ne $Version) {
    throw "A versão do app ($($appPackage.version)) não corresponde à release $Version."
}

$versionChecks = @(
    @{ Path = 'app/src/App.tsx'; Pattern = "const BUILD_VERSION = '$Version';" },
    @{ Path = 'server/main.go'; Pattern = "const appVersion = `"$Version`"" }
)
foreach ($check in $versionChecks) {
    $content = Get-Content -LiteralPath (Join-Path $projectRoot $check.Path) -Raw
    if (-not $content.Contains($check.Pattern)) {
        throw "Versão $Version não encontrada em $($check.Path)."
    }
}

$appDist = Join-Path $projectRoot 'app/dist'
if (-not (Test-Path -LiteralPath (Join-Path $appDist 'index.html') -PathType Leaf)) {
    throw 'O build do CentralPDF 2.0 não foi encontrado em app/dist.'
}
if (-not (Test-Path -LiteralPath (Join-Path $appDist 'assets') -PathType Container)) {
    throw 'Os assets do build do CentralPDF 2.0 estão ausentes.'
}

$releaseNotesPath = Join-Path $projectRoot "docs/releases/$Version.md"
if (-not (Test-Path -LiteralPath $releaseNotesPath -PathType Leaf)) {
    throw "Notas da release ausentes: docs/releases/$Version.md"
}

New-Item -ItemType Directory -Path $outputPath | Out-Null
$packageName = "CentralPDF_Web_Local_v$Version"
$packageRoot = Join-Path $outputPath $packageName
New-Item -ItemType Directory -Path $packageRoot | Out-Null

Get-ChildItem -LiteralPath $appDist -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse -Force
}

foreach ($file in @(
    'ABRIR_CENTRAL_PDF.bat',
    'README.md',
    'SECURITY.md',
    'THIRD_PARTY_NOTICES.md'
)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $packageRoot
}
Copy-Item -LiteralPath $releaseNotesPath -Destination (Join-Path $packageRoot 'RELEASE_NOTES.md')
Copy-Item -LiteralPath $serverExecutablePath -Destination (Join-Path $packageRoot 'CentralPDF_Local_Server.exe')

$zipPath = Join-Path $outputPath "$packageName.zip"
Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal

$releasedExecutable = Join-Path $outputPath 'CentralPDF_Local_Server.exe'
Copy-Item -LiteralPath $serverExecutablePath -Destination $releasedExecutable
$actualExecutableHash = (Get-FileHash -LiteralPath $releasedExecutable -Algorithm SHA256).Hash.ToLowerInvariant()

$releaseChecksumPath = Join-Path $outputPath "$packageName.sha256"
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$releaseChecksums = @(
    "$zipHash  $(Split-Path -Leaf $zipPath)",
    "$actualExecutableHash  CentralPDF_Local_Server.exe"
)
[IO.File]::WriteAllLines($releaseChecksumPath, $releaseChecksums, [Text.UTF8Encoding]::new($false))

Get-Item -LiteralPath $zipPath, $releasedExecutable, $releaseChecksumPath |
    Select-Object Name, Length, @{ Name = 'SHA256'; Expression = { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() } }
