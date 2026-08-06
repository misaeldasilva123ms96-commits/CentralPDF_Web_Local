from pathlib import Path

CSS_PATH = 'assets/css/workspace-compact-panels-1.2.3.css'
CACHE_OLD = 'centralpdf-v1.2.1-pages-6'
CACHE_NEW = 'centralpdf-v1.2.1-pages-7'

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
link = f'  <link rel="stylesheet" href="{CSS_PATH}" />'
if CSS_PATH not in index:
    anchor = '  <link rel="stylesheet" href="assets/css/workspace-visual-fixes-1.2.2.css" />'
    if anchor not in index:
        raise RuntimeError('Ponto de inclusão do CSS compacto não encontrado em index.html.')
    index = index.replace(anchor, anchor + '\n' + link, 1)
index_path.write_text(index, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
if CACHE_OLD in sw:
    sw = sw.replace(CACHE_OLD, CACHE_NEW)
if f"'./{CSS_PATH}'" not in sw:
    anchor = "  './assets/css/workspace-visual-fixes-1.2.2.css',"
    if anchor not in sw:
        raise RuntimeError('Ponto de inclusão do CSS compacto não encontrado em sw.js.')
    sw = sw.replace(anchor, anchor + f"\n  './{CSS_PATH}',", 1)
sw_path.write_text(sw, encoding='utf-8')

for test_path in Path('tests').glob('*'):
    if test_path.suffix not in {'.py', '.js'}:
        continue
    text = test_path.read_text(encoding='utf-8')
    changed = text.replace(CACHE_OLD, CACHE_NEW)
    if changed != text:
        test_path.write_text(changed, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## Painéis laterais compactos e alinhados\n\n- remove a faixa vazia no topo da barra de ferramentas recolhida;\n- fixa o cabeçalho do painel de configurações no topo, sem espaço morto;\n- reduz o cartão “Profundidade da ferramenta” para um resumo objetivo;\n- mantém avisos e erros visíveis, ocultando detalhes redundantes quando não há problema;\n- aplica o mesmo comportamento às 34 ferramentas, nos temas claro e escuro;\n- renova o cache para entregar o ajuste visual imediatamente.\n\n'''
if entry not in changelog:
    changelog_path.write_text(entry + changelog, encoding='utf-8')
