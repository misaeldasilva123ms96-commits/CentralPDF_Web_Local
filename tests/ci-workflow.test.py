from pathlib import Path


root = Path(__file__).resolve().parents[1]
workflow = (root / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")

required = [
    "actions/checkout@v7",
    "actions/setup-node@v7",
    "actions/setup-python@v7",
    "actions/setup-go@v7",
    "node-version: 22",
    'python-version: "3.12"',
    'go-version: "1.26.5"',
    "cmp --silent CentralPDF_Local_Server.exe CentralPDF_Local_Server.ci.exe",
]

for value in required:
    assert value in workflow, value

assert "permissions:\n  contents: read" in workflow

print("ci-workflow: passed")
