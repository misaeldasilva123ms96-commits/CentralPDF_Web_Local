import json
from pathlib import Path


root = Path(__file__).resolve().parents[1]

# A interface 1.2.1 permanece como baseline histórico e não é mais a versão publicada.
index = (root / "index.html").read_text(encoding="utf-8")
stable = (root / "assets" / "js" / "stable-1.0.js").read_text(encoding="utf-8")
foundation = (root / "assets" / "js" / "foundation.js").read_text(encoding="utf-8")
manifest = (root / "manifest.webmanifest").read_text(encoding="utf-8")
service_worker = (root / "sw.js").read_text(encoding="utf-8")
baseline = (root / "docs" / "architecture" / "BASELINE_1.2.1.md").read_text(encoding="utf-8")

assert "Web local 1.2.1" in index
assert "v1.2.1" in index
assert "const APP_VERSION = '1.2.1';" in foundation
assert "Central PDF & Imagem 1.2.1" in manifest
assert "centralpdf-v1.2.1-pages-8" in service_worker
assert "1.2.1" in stable
assert baseline.strip()

# A versão corrente é definida pela aplicação 2.0 e sincronizada com o servidor e a documentação.
package = json.loads((root / "app" / "package.json").read_text(encoding="utf-8"))
package_lock = json.loads((root / "app" / "package-lock.json").read_text(encoding="utf-8"))
app_source = (root / "app" / "src" / "App.tsx").read_text(encoding="utf-8")
server = (root / "server" / "main.go").read_text(encoding="utf-8")
readme = (root / "README.md").read_text(encoding="utf-8")

version = package["version"]
assert version == "2.0.0-alpha.2"
assert package_lock["version"] == version
assert package_lock["packages"][""]["version"] == version
assert f"const BUILD_VERSION = '{version}';" in app_source
assert f'const appVersion = "{version}"' in server
assert readme.startswith(f"# CentralPDF {version}\n")
assert f'docs/releases/{version}.md' in readme
assert (root / "docs" / "releases" / f"{version}.md").is_file()
assert 'const appVersion = "1.2.1"' not in server

print("version-sync-current-and-baseline: passed")
