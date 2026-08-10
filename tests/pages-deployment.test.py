from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = (root / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

required = [
    "branches: [main]",
    "pull_request:",
    "./scripts/prepare-offline.ps1",
    "cp index.html manifest.webmanifest sw.js _site/",
    "cp -R assets vendor _site/",
    "vendor/pdfjs",
    "vendor/pdfjs-manifest.js",
    "test -f _site/vendor/pdfjs/pdf.min.mjs",
    "test -f _site/vendor/pdfjs/pdf.worker.min.mjs",
    "test -f _site/vendor/pdfjs/LICENSE",
    "test ! -e _site/CentralPDF_Local_Server.exe",
    "test ! -e _site/server",
    "test ! -e _site/tests",
    "actions/checkout@v7",
    "actions/cache@v6",
    "actions/configure-pages@v6",
    "actions/upload-pages-artifact@v5",
    "actions/deploy-pages@v5",
    "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
]

for value in required:
    assert value in workflow, value

assert "cp -R . _site" not in workflow
assert "contents: write" not in workflow

print("pages-deployment: passed")
