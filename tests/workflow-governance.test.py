from pathlib import Path

root = Path(__file__).resolve().parents[1]
ci = (root / '.github/workflows/ci.yml').read_text(encoding='utf-8')
pages = (root / '.github/workflows/pages.yml').read_text(encoding='utf-8')

for name, workflow in [('CI', ci), ('Pages', pages)]:
    assert 'workflow_dispatch:' in workflow, f'{name} precisa permitir execução manual'
    assert 'types: [opened, synchronize, reopened, ready_for_review]' in workflow
    assert "github.event.pull_request.number || github.ref" in workflow
    assert "cancel-in-progress: ${{ github.event_name == 'pull_request' }}" in workflow

assert 'group: ci-${{ github.event.pull_request.number || github.ref }}' in ci
assert 'group: pages-${{ github.event.pull_request.number || github.ref }}' in pages
assert "branches: [main, \"agent/**\"]" in ci
assert 'branches: [main]' in pages
assert "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'" in pages

print('workflow-governance: passed')
