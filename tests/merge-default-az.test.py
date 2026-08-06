from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'assets/js/app.js').read_text(encoding='utf-8')

assert '<option value="nameAsc" selected>Nome: A → Z</option>' in app
assert 'function applyDefaultMergeNameOrder()' in app
assert "if (prefix === 'merge' && ($('#mergeSourceSort')?.value || 'nameAsc') === 'nameAsc') applyDefaultMergeNameOrder();" in app
print('merge-default-az: passed')
