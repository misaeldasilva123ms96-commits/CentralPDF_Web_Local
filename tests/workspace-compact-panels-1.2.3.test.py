from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css_files = [
    'assets/css/styles.css',
    'assets/css/ux-redesign.css',
    'assets/css/layout-controls.css',
    'assets/css/tool-quality-1.2.0.css',
    'assets/css/dark-theme-polish-1.0.4.css',
    'assets/css/workspace-visual-fixes-1.2.2.css',
]
css = '\n'.join((root / path).read_text(encoding='utf-8') for path in css_files)

html = f'''<!doctype html><html><head><style>{css}</style></head>
<body class="sidebar-collapsed" data-theme="dark" data-workspace-open="true">
  <header class="topbar">Cabeçalho</header>
  <main class="workspace" style="height:700px">
    <aside class="sidebar">
      <div class="sidebar-sticky-head">
        <div class="sidebar-search-row">
          <label class="sidebar-search"><input placeholder="Buscar"></label>
          <button class="sidebar-collapse-button">›</button>
        </div>
      </div>
      <nav class="workspace-tool-nav"><button class="tool active"><svg></svg><span><b>Juntar PDFs</b></span></button></nav>
    </aside>
    <section class="main-panel"><div class="stepper">Conteúdo</div></section>
    <aside class="settings-panel">
      <div class="settings-heading"><div><span>Configuração</span><h2>Resumo da união</h2><p>Revise as opções.</p></div><button class="settings-panel-close">›</button></div>
      <section id="cpToolPreflight" class="cp-tool-preflight" aria-label="Resumo técnico da ferramenta">
        <header><div class="cp-tool-preflight-summary"><strong>Avançada</strong><span>Páginas</span><span>2+ PDFs → PDF</span><span>Lote</span><span>7 arquivos</span></div><span class="cp-tool-preflight-engine">pdf-lib</span></header>
        <ul><li class="ok"><span>✓</span>Pré-verificação sem bloqueios.</li></ul>
      </section>
      <div style="height:900px"></div>
    </aside>
  </main>
</body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
    page = browser.new_page(viewport={'width': 1368, 'height': 596})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate('''() => {
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
      const workspace = document.querySelector('.workspace').getBoundingClientRect();
      const sidebarHead = document.querySelector('.sidebar-sticky-head').getBoundingClientRect();
      const collapse = document.querySelector('.sidebar-collapse-button').getBoundingClientRect();
      const settings = document.querySelector('.settings-panel').getBoundingClientRect();
      const heading = document.querySelector('.settings-heading').getBoundingClientRect();
      const card = document.querySelector('.cp-tool-preflight').getBoundingClientRect();
      return {
        sidebarHeadGap: sidebarHead.top - sidebar.top,
        sidebarGap: sidebar.top - workspace.top,
        collapseGap: collapse.top - sidebar.top,
        settingsGap: settings.top - workspace.top,
        settingsHeadingGap: heading.top - settings.top,
        cardHeight: card.height,
        sidebarTop: getComputedStyle(document.querySelector('.sidebar')).top,
        settingsTop: getComputedStyle(document.querySelector('.settings-panel')).top,
        okListDisplay: getComputedStyle(document.querySelector('.cp-tool-preflight > ul')).display,
        headingPosition: getComputedStyle(document.querySelector('.settings-heading')).position,
        headingBackground: getComputedStyle(document.querySelector('.settings-heading')).backgroundColor,
      };
    }''')
    assert values['sidebarHeadGap'] <= 1, values
    assert values['sidebarGap'] <= 1, values
    assert values['collapseGap'] <= 10, values
    assert values['settingsGap'] <= 1, values
    assert values['settingsHeadingGap'] <= 1, values
    assert values['sidebarTop'] == '0px', values
    assert values['settingsTop'] == '0px', values
    assert values['cardHeight'] <= 50, values
    assert values['okListDisplay'] == 'none', values
    assert values['headingPosition'] == 'sticky', values
    rgb = [int(part) for part in values['headingBackground'].replace('rgba(', '').replace('rgb(', '').replace(')', '').split(',')[:3]]
    assert max(rgb) < 60, values

    page.locator('.cp-tool-preflight > ul').evaluate("node => { node.innerHTML = '<li class=\"warn\"><span>!</span>Aviso importante.</li>'; }")
    warning = page.evaluate('''() => ({
      display: getComputedStyle(document.querySelector('.cp-tool-preflight > ul')).display,
      height: document.querySelector('.cp-tool-preflight').getBoundingClientRect().height
    })''')
    assert warning['display'] == 'grid', warning
    assert warning['height'] <= 80, warning

    page.set_viewport_size({'width': 480, 'height': 800})
    mobile = page.evaluate('''() => ({
      height: document.querySelector('.cp-tool-preflight').getBoundingClientRect().height,
      summaryDisplay: getComputedStyle(document.querySelector('.cp-tool-preflight-summary')).display
    })''')
    assert mobile['height'] <= 100, mobile
    assert mobile['summaryDisplay'] == 'flex', mobile
    browser.close()

print('workspace-compact-panels-1.2.3: passed')
