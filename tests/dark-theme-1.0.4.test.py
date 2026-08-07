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
html = html.replace('<body>', '<body data-theme="dark" class="sidebar-collapsed hide-tool-guide">')
html = html.replace('id="homeView" class="home-view"', 'id="homeView" class="home-view hidden"')
html = html.replace('id="toolWorkspace" class="workspace hidden"', 'id="toolWorkspace" class="workspace"')
html = html.replace('</head>', f'<style>{css}</style></head>')

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    )
    page = browser.new_page(viewport={'width': 1365, 'height': 599})
    page.set_content(html, wait_until='domcontentloaded')

    values = page.evaluate("""() => {
      const one = selector => document.querySelector(selector);
      const css = selector => getComputedStyle(one(selector));
      const sidebar = one('.sidebar');
      const nav = one('.workspace-tool-nav');
      return {
        sidebarClientWidth: sidebar.clientWidth,
        sidebarScrollWidth: sidebar.scrollWidth,
        navClientWidth: nav.clientWidth,
        navScrollWidth: nav.scrollWidth,
        sidebarOverflowX: css('.sidebar').overflowX,
        navOverflowX: css('.workspace-tool-nav').overflowX,
        tooltipDisplay: css('.tool').getPropertyValue('--unused'),
        titleColor: css('.panel-heading h1').color,
        titleBg: css('.main-panel').backgroundColor,
        cardBg: css('.tool-experience-strip article').backgroundImage,
        emptyBg: css('.settings-empty-state').backgroundColor,
        dockBg: css('.action-dock').backgroundImage,
      };
    }""")

    assert values['sidebarClientWidth'] <= 70
    assert values['sidebarScrollWidth'] == values['sidebarClientWidth']
    assert values['navScrollWidth'] == values['navClientWidth']
    assert values['sidebarOverflowX'] == 'hidden'
    assert values['navOverflowX'] == 'hidden'
    assert values['titleColor'] == 'rgb(243, 246, 255)'
    assert values['titleBg'] == 'rgb(16, 24, 39)'
    assert 'linear-gradient' in values['cardBg']
    assert values['emptyBg'] == 'rgb(18, 28, 44)'
    assert 'linear-gradient' in values['dockBg']

    print('dark-theme-1.0.4: passed')
    browser.close()
