from pathlib import Path

source_path = Path('scripts/apply-editor-restricted-pdf-fix.py')
source = source_path.read_text(encoding='utf-8')
dq = '"' * 3
sq = "'" * 3
source = source.replace(
    "Path('tests/editor-restricted-runtime.test.py').write_text(" + dq + 'from',
    "Path('tests/editor-restricted-runtime.test.py').write_text(" + sq + 'from',
    1,
)
source = source.replace("page.evaluate(r" + sq + '() => {', "page.evaluate(" + dq + '() => {', 1)
source = source.replace('    }' + sq + ')', '    }' + dq + ')', 1)
source = source.replace(
    '    browser.close()\n' + dq + ", encoding='utf-8')",
    '    browser.close()\n' + sq + ", encoding='utf-8')",
    1,
)
compiled = compile(source, str(source_path), 'exec')
exec(compiled, {'__name__': '__main__'})
