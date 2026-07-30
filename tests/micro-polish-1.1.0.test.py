from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css_files = [
    'assets/css/styles.css',
    'assets/css/experience-0.15.css',
    'assets/css/ux-redesign.css',
    'assets/css/header-settings-1.0.1.css',
    'assets/css/theme-and-visual-1.0.3.css',
    'assets/css/dark-theme-polish-1.0.4.css',
    'assets/css/home-dark-refine-1.0.5.css',
    'assets/css/dark-theme-audit-1.0.6.css',
    'assets/css/settings-fit-1.0.7.css',
    'assets/css/dialog-audit-1.0.8.css',
    'assets/css/modal-fit-1.0.9.css',
    'assets/css/micro-polish-1.1.0.css',
]
css = '\n'.join((root / path).read_text(encoding='utf-8') for path in css_files)
html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}
body{{margin:0;background:#07101d;font-family:Inter,Segoe UI,Arial,sans-serif;padding:16px;}}
.grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}}
</style></head><body data-theme="dark"><div class="grid">
<article class="tool-card featured"><span class="recommended">Recomendado</span><span class="cp15-star" aria-pressed="false">☆</span><div class="tool-card-icon"></div><strong>Organizar PDF</strong><p>Veja as páginas, arraste para reordenar, gire ou exclua.</p><div class="tool-card-meta"><span>1 arquivo</span><span>Visual</span></div><span class="open-tool">Abrir ferramenta →</span></article>
<article class="tool-card editor-featured"><span class="recommended">Novo</span><span class="cp15-star" aria-pressed="true">★</span><div class="tool-card-icon"></div><strong>Editar PDF</strong><p>Adicione e formate textos, imagens, pincel, marcador, coberturas e recortes.</p><div class="tool-card-meta"><span>1 arquivo</span><span>Canvas</span></div><span class="open-tool">Abrir editor →</span></article>
<article class="tool-card"><span class="cp15-star" aria-pressed="false">☆</span><div class="tool-card-icon"></div><strong>Juntar PDFs</strong><p>Una vários documentos na ordem desejada.</p><div class="tool-card-meta"><span>Vários PDFs</span></div><span class="open-tool">Abrir ferramenta →</span></article>
</div></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width': 1308, 'height': 430})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate("""() => {
      const first = document.querySelector('.tool-card');
      const badge = first.querySelector('.recommended').getBoundingClientRect();
      const star = first.querySelector('.cp15-star').getBoundingClientRect();
      const starStyle = getComputedStyle(first.querySelector('.cp15-star'));
      const secondStarStyle = getComputedStyle(document.querySelectorAll('.cp15-star')[1]);
      return {
        gap: star.left - badge.right,
        badgeRight: badge.right,
        starRightGap: first.getBoundingClientRect().right - star.right,
        starBg: starStyle.backgroundImage,
        starBorder: starStyle.borderColor,
        activeStarColor: secondStarStyle.color,
        activePressed: document.querySelectorAll('.cp15-star')[1].getAttribute('aria-pressed'),
      };
    }""")
    assert values['gap'] >= 8
    assert values['starRightGap'] >= 10
    assert 'gradient' in values['starBg']
    assert values['starBorder'] != 'rgb(226, 229, 237)'
    assert values['activeStarColor'] == 'rgb(255, 211, 111)'
    assert values['activePressed'] == 'true'
    print('micro-polish-1.1.0: passed')
    browser.close()
