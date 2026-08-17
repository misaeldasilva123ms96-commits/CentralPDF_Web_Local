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
        chipBg: css('.tool-card-meta span').backgroundColor,
        searchBg: css('.search-box').backgroundImage,
        homeVersion: one('.brand-copy small').textContent.trim(),
      };
    }""")
    assert 'gradient' in values['heroBg']
    assert values['heroRadius'] == '26px'
    assert 'gradient' in values['recentBg']
    assert values['recentStrongColor'] == 'rgb(235, 240, 251)'
    assert 'gradient' in values['cardBg']
    assert values['chipBg'] == 'rgb(26, 36, 64)'
    assert 'gradient' in values['searchBg']
    assert values['homeVersion'] == 'Web local 2.0.1'
    print('home-dark-1.0.5: passed')
    browser.close()
