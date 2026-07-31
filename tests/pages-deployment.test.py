from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = (root / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

required = [
    "branches: [main]",
    "pull_request:",
    "./scripts/prepare-offline.ps1",
    "cp index.html manifest.webmanifest sw.js _site/",
    "cp -R assets vendor _site/",
    "test ! -e _site/CentralPDF_Local_Server.exe",
    "test ! -e _site/server",
    "test ! -e _site/tests",
    "actions/configure-pages@v5",
    "actions/upload-pages-artifact@v3",
    "actions/deploy-pages@v4",
    "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
]

for value in required:
    assert value in workflow, value

assert "cp -R . _site" not in workflow
assert "contents: write" not in workflow

print("pages-deployment: passed")
