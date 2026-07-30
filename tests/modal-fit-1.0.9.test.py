from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css_files = [
    'assets/css/styles.css',
    'assets/css/foundation.css',
    'assets/css/experience-0.15.css',
    'assets/css/stable-1.0.css',
    'assets/css/header-settings-1.0.1.css',
    'assets/css/theme-and-visual-1.0.3.css',
    'assets/css/dark-theme-polish-1.0.4.css',
    'assets/css/home-dark-refine-1.0.5.css',
    'assets/css/dark-theme-audit-1.0.6.css',
    'assets/css/settings-fit-1.0.7.css',
    'assets/css/dialog-audit-1.0.8.css',
    'assets/css/modal-fit-1.0.9.css',
]
css = '\n'.join((root / path).read_text(encoding='utf-8') for path in css_files)

flow_cards = ''.join(
    f'<article><small>Modelo</small><h3>Fluxo {i}</h3><p>Organizar páginas, numerar e proteger.</p><div><span><b>1</b>Organizar PDF</span><i>→</i><span><b>2</b>Numerar páginas avançado</span><i>→</i><span><b>3</b>Proteger PDF</span></div><button class="primary">Iniciar fluxo</button></article>'
    for i in range(1, 5)
)

html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
body{{margin:0;min-height:100vh;background:#08111e;font-family:Inter,Segoe UI,Arial,sans-serif;}}
.cp15-dialog,.cp10-dialog{{display:block;}}
</style></head><body data-theme="dark">
<dialog class="cp15-dialog" open><section class="wide"><header><div><small>Processamento em sequência</small><h2>Fluxos de trabalho</h2><p>O resultado de uma etapa entra diretamente na próxima.</p></div><button>×</button></header><main><div class="cp15-flow-grid">{flow_cards}</div><div class="cp15-builder"><h3>Criar fluxo personalizado</h3><input value="Meu fluxo"><div id="cp15Steps"><div><b>1</b><select><option>Organizar PDF</option></select><button>×</button></div><div><b>2</b><select><option>Editar PDF</option></select><button>×</button></div></div><div><button>Adicionar etapa</button><button class="primary">Salvar fluxo</button></div></div></main></section></dialog>
<dialog class="cp15-dialog" open><section class="wide"><header><div><small>Continuidade local</small><h2>Resultados da sessão</h2><p>Baixe novamente ou use o resultado diretamente em outra ferramenta.</p></div><button>×</button></header><main><div class="cp15-empty"><strong>Nenhum resultado nesta sessão</strong><p>Os arquivos concluídos aparecerão aqui.</p></div></main><footer><span>Os resultados permanecem somente nesta sessão.</span><button class="danger">Limpar resultados</button></footer></section></dialog>
</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    # short viewport similar to user screenshots
    page = browser.new_page(viewport={'width': 884, 'height': 499})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate("""() => {
      const dialogs = Array.from(document.querySelectorAll('.cp15-dialog section'));
      const flow = dialogs[0].getBoundingClientRect();
      const results = dialogs[1].getBoundingClientRect();
      const flowMain = document.querySelectorAll('.cp15-dialog main')[0];
      const resultsFooter = document.querySelectorAll('.cp15-dialog footer')[0].getBoundingClientRect();
      return {
        flowWidthRatio: flow.width / window.innerWidth,
        flowLeft: flow.left,
        flowRightGap: window.innerWidth - flow.right,
        flowHeightFits: flow.height <= window.innerHeight - 6,
        flowMainScrollable: flowMain.scrollHeight >= flowMain.clientHeight,
        resultsWidthRatio: results.width / window.innerWidth,
        resultsFooterVisible: resultsFooter.bottom <= window.innerHeight,
      };
    }""")
    assert values['flowWidthRatio'] > 0.96
    assert values['resultsWidthRatio'] > 0.96
    assert values['flowLeft'] >= 0
    assert values['flowRightGap'] >= 0
    assert values['flowHeightFits'] is True
    assert values['flowMainScrollable'] is True
    assert values['resultsFooterVisible'] is True
    print('modal-fit-1.0.9: passed')
    browser.close()
