from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css='\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css'])
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
scripts='\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('[data-tool="editPdf"].tool-card').click()
    page.wait_for_function("document.body.dataset.workspaceOpen === 'true'")

    assert not page.locator('body').evaluate("el=>el.classList.contains('sidebar-collapsed')")
    assert page.locator('#backToTools').count() == 0
    assert page.locator('.sidebar-search-row #workspaceToolSearch').count() == 1
    assert page.locator('.sidebar-search-row #sidebarCollapseButton').count() == 1
    assert page.locator('#sidebarToggleTop').evaluate("el=>getComputedStyle(el).display === 'none'")
    page.locator('#sidebarCollapseButton').click()
    assert page.locator('body').evaluate("el=>el.classList.contains('sidebar-collapsed')")
    assert page.locator('#workspaceToolNav .tool').first.get_attribute('data-tooltip')
    page.keyboard.press('F9')
    assert not page.locator('body').evaluate("el=>el.classList.contains('sidebar-collapsed')")

    page.locator('#settingsPanelToggleTop').click()
    assert page.locator('body').evaluate("el=>el.classList.contains('settings-collapsed')")
    page.locator('#settingsPanelToggleTop').click()
    assert not page.locator('body').evaluate("el=>el.classList.contains('settings-collapsed')")

    page.keyboard.press('Control+Shift+F')
    assert page.locator('body').evaluate("el=>el.classList.contains('focus-mode')")
    page.keyboard.press('Control+Shift+F')
    assert not page.locator('body').evaluate("el=>el.classList.contains('focus-mode')")

    page.locator('#layoutSettingsButton').click()
    assert page.locator('#layoutSettingsDialog').evaluate('el=>el.open')
    page.locator('label:has(input[name="layoutDensity"][value="compact"])').click()
    page.locator('#showToolGuidePreference').uncheck()
    page.locator('#confirmLayoutSettings').click()
    assert page.locator('body').evaluate("el=>el.classList.contains('density-compact')")
    assert page.locator('body').evaluate("el=>el.classList.contains('hide-tool-guide')")

    mobile=browser.new_page(viewport={'width':390,'height':844})
    mobile_errors=[]
    mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
    mobile.set_content(html,wait_until='domcontentloaded')
    mobile.locator('[data-tool="editPdf"].tool-card').click()
    mobile.locator('#sidebarToggleTop').click()
    assert mobile.locator('body').evaluate("el=>el.classList.contains('mobile-sidebar-open')")
    mobile.locator('#sidebarBackdrop').click(position={'x':360,'y':40})
    assert not mobile.locator('body').evaluate("el=>el.classList.contains('mobile-sidebar-open')")

    assert not errors, errors
    assert not mobile_errors, mobile_errors
    print('layout-controls: passed')
    browser.close()
