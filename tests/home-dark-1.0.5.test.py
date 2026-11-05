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
html = re.sub(r'<body\b([^>]*)>', r'<body\1 data-theme="dark">', html, count=1)
html = html.replace('</head>', f'<style>{css}</style></head>')
# inject a sample recent panel so dark css can be validated without app scripts
html = html.replace('<div class="tool-section-heading">', '<section class="cp15-personal"><div><header><div><small>Continuidade</small><h2>Usadas recentemente</h2></div><button>Limpar</button></header><div class="cp15-rail"><button><svg></svg><span><strong>Organizar PDF</strong><small>Reordenar, girar e inserir</small></span><i></i></button></div></div></section><div class="tool-section-heading">', 1)
# inject a sample meta footer into first tool card for chip validation
html = html.replace('<span class="open-tool">Abrir ferramenta →</span>', '<div class="tool-card-meta"><span>1 arquivo</span><span>Visual</span><span>Páginas</span></div><span class="open-tool">Abrir ferramenta →</span>', 1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width': 1365, 'height': 768})
    page.set_content(html, wait_until='domcontentloaded')
    values = page.evaluate("""() => {
      const one = s => document.querySelector(s);
      const css = s => getComputedStyle(one(s));
      return {
        heroBg: css('.home-hero').backgroundImage,
        heroRadius: css('.home-hero').borderRadius,
        recentBg: css('.cp15-personal > div').backgroundImage,
        recentStrongColor: css('.cp15-rail strong').color,
        cardBg: css('.tool-card').backgroundImage,
        cardColor: css('.tool-card').backgroundColor,
        recentBorder: css('.cp15-personal > div').borderRightWidth,
        chipBg: css('.tool-card-meta span').backgroundColor,
        searchBg: css('.search-box').backgroundImage,
        homeVersion: one('.brand-copy small').textContent.trim(),
      };
    }""")
    assert values['heroBg'] == 'none'
    assert values['heroRadius'] == '0px'
    assert values['recentBg'] == 'none'
    assert values['recentBorder'] == '0px'
    assert values['recentStrongColor'] == 'rgb(238, 241, 255)'
    assert values['cardBg'] == 'none'
    assert values['cardColor'] == 'rgb(20, 26, 46)'
    assert values['chipBg'] == 'rgb(32, 38, 65)'
    assert values['searchBg'] == 'none'
    assert values['homeVersion'] == 'Web local 2.0.1'
    print('home-dark-1.0.5: passed')
    browser.close()
