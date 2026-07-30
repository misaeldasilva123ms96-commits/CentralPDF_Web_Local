from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css_files = [
    'assets/css/header-settings-1.0.1.css',
    'assets/css/theme-and-visual-1.0.3.css',
    'assets/css/dark-theme-polish-1.0.4.css',
    'assets/css/home-dark-refine-1.0.5.css',
    'assets/css/dark-theme-audit-1.0.6.css',
    'assets/css/settings-fit-1.0.7.css',
    'assets/css/foundation.css',
    'assets/css/experience-0.15.css',
]
css = '\n'.join((root / path).read_text(encoding='utf-8') for path in css_files)
html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
body{{margin:0;min-height:100vh;background:#0a101b;font-family:Inter,Segoe UI,Arial,sans-serif;}}
.stage{{position:relative;min-height:100vh;padding:14px;box-sizing:border-box;display:flex;justify-content:flex-end;align-items:flex-start;}}
</style></head><body data-theme="dark"><div class="stage"><div id="cp101SettingsMenu" class="cp101-settings-menu"><button id="cp101SettingsButton" class="cp101-settings-trigger" type="button" aria-expanded="true"><svg></svg><span>Configurações</span></button><div id="cp101SettingsPanel" class="cp101-settings-panel"><div class="cp101-settings-head"><small>Atalhos do produto</small><strong>Configurações rápidas</strong><span>Reunimos projetos, resultados, fluxos, diagnósticos, qualidade e aparência em um painel mais limpo.</span></div><div class="cp101-settings-body"><section class="cp101-settings-section"><div class="cp101-settings-section-title">Aparência</div><div class="cp101-theme-section"><div class="cp101-theme-head"><div><strong>Tema da interface</strong><span>Escolha entre modo claro e escuro.</span></div><span class="cp101-theme-badge">Visual</span></div><div class="cp101-theme-options"><button class="cp101-theme-option" aria-pressed="false"><span class="swatch"></span><span><b>Tema claro</b><small>Limpo, suave e ideal para o dia.</small></span></button><button class="cp101-theme-option" aria-pressed="true"><span class="swatch"></span><span><b>Tema escuro</b><small>Mais confortável para uso prolongado.</small></span></button></div><div class="cp101-theme-note">Dica: o tema vale para toda a Central PDF & Imagem.</div></div></section><section class="cp101-settings-section"><div class="cp101-settings-section-title">Projetos e sistema</div><div class="cp101-settings-list">{"".join(['<button class="foundation-top-button"><span class="label">Item</span></button>' for _ in range(4)])}</div></section><section class="cp101-settings-section"><div class="cp101-settings-section-title">Continuidade</div><div class="cp101-settings-list">{"".join(['<button class="foundation-top-button"><span class="label">Item</span></button>' for _ in range(4)])}</div></section><section class="cp101-settings-section"><div class="cp101-settings-section-title">Qualidade da versão</div><div class="cp101-settings-list">{"".join(['<button class="foundation-top-button"><span class="label">Item</span></button>' for _ in range(3)])}</div></section><section class="cp101-settings-section"><div class="cp101-settings-section-title">Extra</div><div class="cp101-settings-list">{"".join(['<button class="foundation-top-button"><span class="label">Item adicional</span></button>' for _ in range(5)])}</div></section></div><div class="cp101-settings-footer"><span>Feche com Esc ou clicando fora.</span><button type="button">Fechar</button></div></div></div></div></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width': 437, 'height': 700})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate("""() => {
      const panel = document.querySelector('#cp101SettingsPanel');
      const body = document.querySelector('.cp101-settings-body');
      const footer = document.querySelector('.cp101-settings-footer');
      const panelRect = panel.getBoundingClientRect();
      return {
        panelHeight: panelRect.height,
        panelBottom: panelRect.bottom,
        viewportHeight: window.innerHeight,
        bodyOverflowY: getComputedStyle(body).overflowY,
        bodyScrollable: body.scrollHeight > body.clientHeight,
        footerVisible: footer.getBoundingClientRect().bottom <= window.innerHeight,
        columns: getComputedStyle(document.querySelector('.cp101-theme-options')).gridTemplateColumns,
      };
    }""")
    assert values['panelBottom'] <= values['viewportHeight']
    assert values['panelHeight'] < values['viewportHeight']
    assert values['bodyOverflowY'] in ('auto', 'scroll')
    assert values['bodyScrollable'] is True
    assert values['footerVisible'] is True
    assert values['columns'].count(' ') == 0  # single-column grid on shorter viewports
    print('settings-panel-fit-1.0.7: passed')
    browser.close()
