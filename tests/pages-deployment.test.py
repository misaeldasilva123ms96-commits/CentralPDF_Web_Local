from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = (root / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

required = [
    "branches: [main]",
    "pull_request:",
    "actions/checkout@v7",
    "persist-credentials: false",
    "actions/setup-node@v7",
    "cache-dependency-path: app/package-lock.json",
    "working-directory: app",
    "npm ci",
    "npm run build",
    "cp -R app/dist/. _site/",
    "test -f _site/index.html",
    "test -d _site/assets",
    "test -f _site/standard_fonts/LiberationSans-Regular.ttf",
    "test -f _site/standard_fonts/LICENSE_LIBERATION",
    "test ! -e _site/CentralPDF_Local_Server.exe",
    "test ! -e _site/server",
    "test ! -e _site/tests",
    "actions/configure-pages@v6",
    "actions/upload-pages-artifact@v5",
    "actions/deploy-pages@v5",
    "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
]

for value in required:
    assert value in workflow, value

for legacy_fragment in (
    "./scripts/prepare-offline.ps1",
    "cp index.html manifest.webmanifest sw.js _site/",
    "cp -R assets vendor _site/",
    "actions/cache@v6",
    "cp -R . _site",
):
    assert legacy_fragment not in workflow, legacy_fragment

assert "contents: write" not in workflow

print("pages-deployment: passed")
