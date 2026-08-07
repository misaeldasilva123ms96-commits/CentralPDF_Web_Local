from pathlib import Path
from bs4 import BeautifulSoup
import re

root = Path(__file__).resolve().parents[1]
index = (root/'index.html').read_text(encoding='utf-8')
app = (root/'assets/js/app.js').read_text(encoding='utf-8')
quality = (root/'assets/js/tool-quality-1.2.0.js').read_text(encoding='utf-8')
stable = (root/'assets/js/stable-1.0.js').read_text(encoding='utf-8')
sw = (root/'sw.js').read_text(encoding='utf-8')
soup = BeautifulSoup(index, 'html.parser')

tools = [node.get('data-tool') for node in soup.select('.tool-card[data-tool]')]
assert len(tools) == 34
assert len(set(tools)) == 34

registry_match = re.search(r'const registry = \{(.*?)\n  \};', quality, re.S)
assert registry_match
registry_body = registry_match.group(1)
registry_keys = re.findall(r'^\s{4}([A-Za-z][A-Za-z0-9]*):\{', registry_body, re.M)
assert registry_keys == tools, (len(registry_keys), registry_keys)

for key in tools:
    assert re.search(rf'^    {re.escape(key)}: \{{', app, re.M), key
    assert re.search(rf'\b{re.escape(key)}\b', quality), key

assert 'function getToolHandlers()' in app
assert 'getToolCapabilities:' in app
assert 'getProfessionalEngineStatus:' in app
assert 'centralpdf-files-changed' in app
assert 'CentralPDFToolQuality?.beginRun' in app
assert 'CentralPDFToolQuality?.finishRun' in app
assert 'CentralPDFToolQuality?.failRun' in app
assert 'arquivo(s) vazio(s) foram ignorados' in app
assert 'validação de saída' in quality
assert "text!=='%PDF-'" in quality
assert 'A saída compactada ou Office não possui assinatura ZIP válida.' in quality
assert 'Auditoria das 34 ferramentas' in quality
assert 'aria-label="Resumo técnico da ferramenta"' in quality
assert 'cp-tool-preflight-summary' in quality
assert 'Profundidade da ferramenta' not in quality
assert 'cp-tool-preflight-grid' not in quality
assert 'toolAudit=window.CentralPDFToolQuality?.auditTools' in stable
assert 'Auditoria das ferramentas' in stable
assert 'assets/css/tool-quality-1.2.0.css' in index
assert 'assets/js/tool-quality-1.2.0.js' in index
assert './assets/css/tool-quality-1.2.0.css' in sw
assert './assets/js/tool-quality-1.2.0.js?v=1.2.3' in sw
assert 'Web local 1.2.1' in index
assert "const VERSION='1.2.1';" in stable
print('tool-quality-1.2.1: passed')
