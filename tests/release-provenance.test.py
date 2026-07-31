from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = (root / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")
builder = (root / "scripts" / "build-release.ps1").read_text(encoding="utf-8")
readme = (root / "README.md").read_text(encoding="utf-8")
attributes = (root / ".gitattributes").read_text(encoding="utf-8")

for fragment in (
    'tags:',
    '"v[0-9]+.[0-9]+.[0-9]+"',
    'workflow_dispatch:',
    'RELEASE_TAG:',
    'ref: ${{ env.RELEASE_TAG }}',
    'contents: write',
    'id-token: write',
    'attestations: write',
    'actions/attest@v4',
    'fetch-depth: 0',
    'git rev-parse "$RELEASE_TAG^{commit}"',
    'git merge-base --is-ancestor "$tag_commit" origin/main',
    'sha256sum -c checksums.sha256',
    'cmp --silent CentralPDF_Local_Server.exe CentralPDF_Local_Server.release.exe',
    './scripts/prepare-offline.ps1',
    './scripts/build-release.ps1',
    'gh release create',
    'find "$release_dir" -maxdepth 1 -type f',
    '"${#release_assets[@]}" -ne 3',
    '"${release_assets[@]}"',
    '--repo "$GITHUB_REPOSITORY"',
    '--verify-tag',
    '--fail-on-no-commits',
):
    assert fragment in workflow, fragment

assert '"${{ runner.temp }}"/release/*' not in workflow

for fragment in (
    "A saída da release deve ficar fora da árvore do projeto.",
    "O executável não corresponde ao checksums.sha256 versionado.",
    "Os motores offline ainda não foram preparados e verificados.",
    "Compress-Archive",
    "Get-FileHash",
    "CentralPDF_Local_Server.exe",
):
    assert fragment in builder, fragment

assert "gh attestation verify" in readme
assert "Releases" in readme
assert "vendor/pptxgen.min.js text eol=lf" in attributes
print("release-provenance: passed")
