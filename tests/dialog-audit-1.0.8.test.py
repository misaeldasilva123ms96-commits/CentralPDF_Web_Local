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
]
css = '\n'.join((root / path).read_text(encoding='utf-8') for path in css_files)

html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
body{{margin:0;min-height:100vh;background:radial-gradient(circle at 30% -10%, rgba(114,96,255,.16), transparent 32%),linear-gradient(180deg,#07101d 0%, #0a1424 100%);font-family:Inter,Segoe UI,Arial,sans-serif;}}
.stage{{padding:16px;display:grid;gap:18px;}}
.cp15-dialog,.cp10-dialog{{position:relative;display:block;margin:0 auto;inset:auto;}}
</style></head><body data-theme="dark"><div class="stage">
<dialog class="cp15-dialog" open><section class="wide"><header><div><small>Processamento em sequência</small><h2>Fluxos de trabalho</h2><p>O resultado de uma etapa entra diretamente na próxima.</p></div><button>×</button></header><main><div class="cp15-flow-grid"><article><small>Modelo</small><h3>Organizar e proteger</h3><p>Organizar páginas, numerar e proteger.</p><div><span><b>1</b>Organizar PDF</span><i>→</i><span><b>2</b>Numerar páginas avançado</span><i>→</i><span><b>3</b>Proteger PDF</span></div><button class="primary">Iniciar fluxo</button></article><article><small>Modelo</small><h3>Documento revisado</h3><p>Editar, limpar metadados e proteger.</p><div><span><b>1</b>Editar PDF</span><i>→</i><span><b>2</b>Limpar metadados</span><i>→</i><span><b>3</b>Proteger PDF</span></div><button class="primary">Iniciar fluxo</button></article></div></main></section></dialog>

<dialog class="cp15-dialog" open><section class="wide"><header><div><small>Continuidade local</small><h2>Resultados da sessão</h2><p>Baixe novamente ou use o resultado diretamente em outra ferramenta.</p></div><button>×</button></header><main><div class="cp15-empty"><strong>Nenhum resultado nesta sessão</strong><p>Os arquivos concluídos aparecerão aqui.</p></div></main><footer><span>Os resultados permanecem somente nesta sessão.</span><button class="danger">Limpar resultados</button></footer></section></dialog>

<dialog class="cp10-dialog" open><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Qualidade da versão 1.0</small><h2>Autodiagnóstico da instalação</h2><p>Verificação local dos módulos, motores e condições do navegador.</p></div><button class="cp10-close">×</button></div><div class="cp10-dialog-body"><div class="cp10-check-summary"><div class="cp10-metric"><small>Versão</small><strong>1.0</strong></div><div class="cp10-metric"><small>Ferramentas</small><strong>34</strong></div><div class="cp10-metric"><small>Aprovados</small><strong>4</strong></div><div class="cp10-metric"><small>Avisos</small><strong>0</strong></div></div><div class="cp10-check-list"><div class="cp10-check ok"><span>✓</span><div><strong>Armazenamento local</strong><small>Disponível</small></div><em>OK</em></div><div class="cp10-check ok"><span>✓</span><div><strong>Acessibilidade 1.0</strong><small>Preferências e navegação por teclado ativas</small></div><em>OK</em></div></div><div class="cp10-error-log"><div class="cp10-error-log-head"><div><strong>Registro local de erros</strong><small>Máximo de 25 ocorrências nesta instalação.</small></div><button class="cp10-button danger">Limpar</button></div><div class="cp10-empty">Nenhum erro registrado nesta instalação.</div></div></div><div class="cp10-dialog-actions"><button class="cp10-button">Acessibilidade</button><button class="cp10-button">Baixar diagnóstico</button><button class="cp10-button primary">Verificar agora</button></div></div></dialog>
</div></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width': 856, 'height': 900})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate("""() => {
      const flowSection = document.querySelectorAll('.cp15-dialog section')[0];
      const resultsSection = document.querySelectorAll('.cp15-dialog section')[1];
      const quality = document.querySelector('.cp10-dialog-shell');
      const qButton = document.querySelector('.cp10-button.primary');
      const qMetric = document.querySelector('.cp10-metric');
      const qActions = document.querySelector('.cp10-dialog-actions');
      const resultsFooter = document.querySelectorAll('.cp15-dialog footer')[0];
      const styles = (el) => getComputedStyle(el);
      return {
        flowNoOverflow: flowSection.scrollWidth <= flowSection.clientWidth + 1,
        resultsNoOverflow: resultsSection.scrollWidth <= resultsSection.clientWidth + 1,
        flowColumns: styles(document.querySelector('.cp15-flow-grid')).gridTemplateColumns,
        qualityBg: styles(quality).backgroundImage,
        metricBg: styles(qMetric).backgroundImage,
        primaryBg: styles(qButton).backgroundImage,
        footerWrap: styles(resultsFooter).flexWrap,
        actionsWrap: styles(qActions).flexWrap,
      };
    }""")
    assert values['flowNoOverflow'] is True
    assert values['resultsNoOverflow'] is True
    assert values['flowColumns'].count(' ') == 0  # single column at this width
    assert 'gradient' in values['qualityBg']
    assert 'gradient' in values['metricBg']
    assert 'gradient' in values['primaryBg']
    assert values['footerWrap'] == 'wrap'
    assert values['actionsWrap'] == 'wrap'
    print('dialog-audit-1.0.8: passed')
    browser.close()
