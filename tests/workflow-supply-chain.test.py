"""Relevant actions are immutable, maintenance cannot deploy, real gates are wired."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
for p in (ROOT/'.github/workflows').glob('*.yml'):
    for action,ref in re.findall(r'uses:\s+([\w-]+/[\w-]+)@([^\s#]+)',p.read_text()):
        assert re.fullmatch('[0-9a-f]{40}',ref),(p,action,ref)
ci=(ROOT/'.github/workflows/ci.yml').read_text()
assert 'schedule:' in ci and 'npm --prefix app audit --audit-level=moderate' in ci
assert 'deploy-pages' not in ci
pages=(ROOT/'.github/workflows/pages.yml').read_text()
assert 'verify-static-site.py _site --require-engines' in pages
assert "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'" in pages
for eco in ['npm','gomod','github-actions']:assert f'package-ecosystem: {eco}' in (ROOT/'.github/dependabot.yml').read_text()
assert 'xargs -0 -n1 python scripts/run-browser-test.py' in ci
for script in ['tool-regression-real','offline-tools-real','editor-cross-browser-real']:
    assert f'python scripts/run-browser-test.py tests/{script}.py' in pages
print('workflow-supply-chain: immutable action refs, weekly CI, dependency audit and asset gate passed')
