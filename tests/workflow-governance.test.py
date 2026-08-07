from pathlib import Path


root = Path(__file__).resolve().parents[1]
ci = (root / ".github/workflows/ci.yml").read_text(encoding="utf-8")
pages = (root / ".github/workflows/pages.yml").read_text(encoding="utf-8")

for name, workflow in (("CI", ci), ("Pages", pages)):
    assert "workflow_dispatch:" in workflow, f"{name} precisa permitir execução manual"
    assert "pull_request:" in workflow, f"{name} precisa validar pull requests"
    assert "types: [opened, synchronize, reopened, ready_for_review]" in workflow
    assert "github.event.pull_request.number || github.ref" in workflow
    assert "cancel-in-progress: ${{ github.event_name == 'pull_request' }}" in workflow
    assert "permissions:\n  contents: read" in workflow
    assert "contents: write" not in workflow

assert "group: ci-${{ github.event.pull_request.number || github.ref }}" in ci
assert "group: pages-${{ github.event.pull_request.number || github.ref }}" in pages
assert "branches: [main]" in ci
assert '"agent/**"' not in ci, "push em branch de PR duplica a CI"
assert "branches: [main]" in pages
assert "jobs:\n  test:" in ci, "o check obrigatório precisa continuar se chamando test"
assert "jobs:\n  build:" in pages, "o check obrigatório precisa continuar se chamando build"
assert "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'" in pages
assert "pages: write" in pages and "id-token: write" in pages

print("workflow-governance: passed")
