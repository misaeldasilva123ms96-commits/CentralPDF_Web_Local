import json
from pathlib import Path


root = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (root / relative_path).read_text(encoding="utf-8")


package = json.loads(read("app/package.json"))
lock = json.loads(read("app/package-lock.json"))
index = read("index.html")
manifest = read("manifest.webmanifest")
stable = read("assets/js/stable-1.0.js")
app_source = read("app/src/App.tsx")
service_worker = read("sw.js")
server = read("server/main.go")
readme = read("README.md")
changelog = read("CHANGELOG.md")
workflow = read(".github/workflows/release.yml")
builder = read("scripts/build-release.ps1")
release_notes = read("docs/releases/2.0.1.md")

# Versão corrente nas fontes oficiais das duas interfaces e do servidor local.
assert package["version"] == "2.0.1"
assert lock["version"] == "2.0.1"
assert lock["packages"][""]["version"] == "2.0.1"
assert "const BUILD_VERSION = '2.0.1';" in app_source
assert "Web local 2.0.1" in index
assert "v2.0.1" in index
assert "Central PDF & Imagem — Web Local 2.0.1" in index
assert "const VERSION='2.0.1';" in stable
assert 'Central PDF & Imagem 2.0.1' in manifest
assert '"version":"2.0.1"' in server
assert readme.startswith("# Central PDF & Imagem 2.0.1\n")
assert changelog.startswith("## 2.0.1 —")
assert "centralpdf-v2.0.1-pages-19" in service_worker

# O pacote continua genérico e produz os três nomes oficiais para qualquer SemVer estável.
assert 'CentralPDF_Web_Local_v$Version' in builder
assert 'CentralPDF_Local_Server.exe' in builder
assert '$packageName.sha256' in builder
assert "2.0.1" not in builder

# O workflow aceita 2.0.1 e versões estáveis futuras sem lógica exclusiva desta release.
assert '"v[0-9]*.[0-9]*.[0-9]*"' in workflow
assert "^v[0-9]+\\.[0-9]+\\.[0-9]+$" in workflow
assert 'docs/releases/$version.md' in workflow
assert "sha256sum -c" in workflow
assert "2.0.1" not in workflow

# A documentação preserva a alpha publicada e usa somente comparações entre tags reais.
assert "v2.0.0-alpha.1" in release_notes
assert "compare/v2.0.0-alpha.1...v2.0.1" in release_notes
assert "compare/v1.2.1...v2.0.1" in release_notes
assert "compare/v2.0.0...v2.0.1" not in release_notes
for pull_request in (26, 27, 28, 29, 30):
    assert f"pull/{pull_request}" in release_notes

print("release-2.0.1: passed")
