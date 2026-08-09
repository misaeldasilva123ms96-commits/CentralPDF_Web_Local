from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = (root / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")
builder = (root / "scripts" / "build-release.ps1").read_text(encoding="utf-8")
readme = (root / "README.md").read_text(encoding="utf-8")
attributes = (root / ".gitattributes").read_text(encoding="utf-8")

for fragment in (
    "branches: [main]",
    "paths:",
    '"app/package.json"',
    '"docs/releases/**"',
    "workflow_dispatch:",
    "contents: write",
    "id-token: write",
    "attestations: write",
    "actions/attest@v4",
    "fetch-depth: 0",
    "persist-credentials: false",
    "Resolve release metadata",
    "require('./app/package.json').version",
    'if [[ "$version" == *-* ]]',
    'echo "prerelease=true"',
    'gh release view "$tag"',
    "Build CentralPDF 2.0",
    "cmp --silent CentralPDF_Local_Server.release-1.exe CentralPDF_Local_Server.release-2.exe",
    "./scripts/build-release.ps1",
    "-ServerExecutable",
    "actions/attest@v4",
    "gh api --method POST",
    'ref="refs/tags/$RELEASE_TAG"',
    "gh release create",
    '"$release_dir/CentralPDF_Web_Local_v$RELEASE_VERSION.zip"',
    '"$release_dir/CentralPDF_Local_Server.exe"',
    '"$release_dir/CentralPDF_Web_Local_v$RELEASE_VERSION.sha256"',
    'if [[ ! -f "$asset" ]]',
    '"${release_assets[@]}"',
    '--repo "$GITHUB_REPOSITORY"',
    "--verify-tag",
    "--fail-on-no-commits",
    '--notes-file "docs/releases/$RELEASE_VERSION.md"',
    "--prerelease",
):
    assert fragment in workflow, fragment

assert '"${{ runner.temp }}"/release/*' not in workflow
assert 'tags:' not in workflow

for fragment in (
    "ValidatePattern('^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$')",
    "[string]$ServerExecutable",
    "app/package.json",
    "app/dist",
    "docs/releases/$Version.md",
    "A saída da release deve ficar fora da árvore do projeto.",
    "Compress-Archive",
    "Get-FileHash",
    "CentralPDF_Local_Server.exe",
    "THIRD_PARTY_NOTICES.md",
    "RELEASE_NOTES.md",
):
    assert fragment in builder, fragment

for obsolete_fragment in (
    "O executável não corresponde ao checksums.sha256 versionado.",
    "Os motores offline ainda não foram preparados e verificados.",
):
    assert obsolete_fragment not in builder, obsolete_fragment

assert "gh attestation verify" in readme
assert "Releases" in readme
assert "vendor/pptxgen.min.js text eol=lf" in attributes
print("release-provenance: passed")
