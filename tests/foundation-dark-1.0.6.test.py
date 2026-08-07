from pathlib import Path
from playwright.sync_api import sync_playwright
import re

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css_links = [link.split('?', 1)[0] for link in re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/>', html)]
css = '\n'.join((root / path).read_text(encoding='utf-8') for path in css_links)
html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/>', '', html)
html = re.sub(r'\s*<link rel="manifest" href="[^"]+"\s*/>', '', html)
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)
html = html.replace('<body>', '<body data-theme="dark">')
html = html.replace('</head>', f'<style>{css}</style></head>')
html = html.replace('</body>', '''
<dialog class="foundation-dialog" open>
  <div class="foundation-dialog-shell">
    <div class="foundation-dialog-head"><div><small>Diagnóstico</small><h2>Compatibilidade e modo offline</h2><p>Confira os motores, armazenamento e forma de abertura da aplicação.</p></div><button class="foundation-dialog-close" type="button">×</button></div>
    <div class="foundation-dialog-body">
      <div class="foundation-offline-banner"><span class="dot"></span><div><strong>Uso offline ainda não preparado</strong><small>Abra pelo arquivo ABRIR_CENTRAL_PDF.bat para habilitar cache e recuperação avançada.</small></div></div>
      <div class="foundation-grid">
        <div class="foundation-card"><div class="foundation-card-head"><div><h3>Motores principais</h3><p>Componentes utilizados para leitura, geração e empacotamento.</p></div><span class="foundation-status-pill ok">Prontos</span></div><div class="foundation-list"><div class="foundation-list-row"><span class="icon">P</span><div><strong>pdf-lib</strong><small>Origem: internet</small></div><span class="foundation-status-pill ok">Pronto</span></div><div class="foundation-list-row"><span class="icon">O</span><div><strong>OCR Tesseract.js</strong><small>Origem: não carregado</small></div><span class="foundation-status-pill warn">Sob demanda</span></div></div></div>
        <div class="foundation-card"><div class="foundation-card-head"><div><h3>Ambiente</h3><p>Recursos disponíveis na forma atual de abertura.</p></div><span class="foundation-status-pill warn">Arquivo aberto diretamente</span></div><div class="foundation-metric-row"><div class="foundation-metric"><small>Service Worker</small><strong>Indisponível</strong></div><div class="foundation-metric"><small>Recuperação</small><strong>Disponível</strong></div><div class="foundation-metric"><small>Protocolo</small><strong>file://</strong></div></div></div>
      </div>
    </div>
    <div class="foundation-dialog-actions"><button class="foundation-button primary" type="button">Preparar uso offline</button><button class="foundation-button" type="button">Verificar novamente</button></div>
  </div>
</dialog>
</body>''')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width': 800, 'height': 580})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate("""() => {
      const css = s => getComputedStyle(document.querySelector(s));
      return {
        shellBg: css('.foundation-dialog-shell').backgroundImage,
        shellColor: css('.foundation-dialog-shell').backgroundColor,
        closeBg: css('.foundation-dialog-close').backgroundColor,
        actionsBg: css('.foundation-dialog-actions').backgroundImage,
        bannerBg: css('.foundation-offline-banner').backgroundImage,
        cardBg: css('.foundation-card').backgroundImage,
        pillWarnBg: css('.foundation-status-pill.warn').backgroundColor,
        metricBg: css('.foundation-metric').backgroundImage,
        primaryBg: css('.foundation-button.primary').backgroundImage,
        titleColor: css('.foundation-dialog-head h2').color,
      };
    }""")
    assert values['shellColor'] == 'rgb(17, 22, 35)'
    assert values['closeBg'] == 'rgb(18, 28, 44)'
    assert 'gradient' in values['actionsBg']
    assert 'gradient' in values['bannerBg']
    assert 'gradient' in values['cardBg']
    assert values['pillWarnBg'] == 'rgb(37, 29, 15)'
    assert 'gradient' in values['metricBg']
    assert 'gradient' in values['primaryBg']
    assert values['titleColor'] == 'rgb(243, 246, 255)'
    print('foundation-dark-1.0.6: passed')
    browser.close()
