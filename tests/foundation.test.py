from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import re
import tempfile

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = '\n'.join((root / name).read_text(encoding='utf-8') for name in [
    'assets/css/styles.css', 'assets/css/ux-redesign.css', 'assets/css/layout-controls.css', 'assets/css/foundation.css'
])
html = re.sub(r'\s*<link[^>]+(?:stylesheet|manifest)[^>]*>', '', html)
html = html.replace('</head>', f'<style>{css}</style></head>')
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)
jszip = (root / 'vendor/jszip.min.js').read_text(encoding='utf-8')
scripts = '\n'.join((root / name).read_text(encoding='utf-8') for name in [
    'assets/js/split-planner.js', 'assets/js/advanced-planner.js', 'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
    'assets/js/ux-enhancements.js', 'assets/js/app.js', 'assets/js/layout-controls.js', 'assets/js/foundation.js'
])
stubs = "window.PDFLib={PDFDocument:{}};window.pdfjsLib={};window.CentralPDFEngineStatus={ready:true,engines:{pdfLib:{ready:true,source:'test'},pdfJs:{ready:true,source:'test'}}};"
html = html.replace('</body>', f'<script>{jszip}</script><script>{stubs}</script><script>{scripts}</script></body>')

with tempfile.TemporaryDirectory() as temp_dir:
    temp = Path(temp_dir)
    image_path = temp / 'teste.png'
    Image.new('RGB', (24, 18), 'white').save(image_path)
    project_path = temp / 'teste.cpdf'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html, wait_until='domcontentloaded')
        page.wait_for_selector('#foundationProjectsButton')

        # Diagnóstico e botões da fundação.
        page.locator('#foundationDiagnosticsButton').click()
        page.wait_for_function("document.querySelector('#foundationDiagnosticsDialog').open === true")
        assert page.locator('#foundationDiagnosticsDialog').evaluate('el => el.open')
        page.locator('[data-close-dialog="foundationDiagnosticsDialog"]').click()

        # Abre ferramenta, adiciona arquivo e salva projeto.
        page.locator('[data-tool="imageConvert"].tool-card').click()
        page.locator('#fileInput').set_input_files(str(image_path))
        page.wait_for_function("document.querySelector('#fileCount').textContent.includes('1 arquivo')")
        page.locator('#foundationProjectsButton').click()
        with page.expect_download() as download_info:
            page.locator('#foundationSaveProject').click()
        download_info.value.save_as(project_path)
        assert project_path.exists() and project_path.stat().st_size > 100

        # Limpa e restaura o projeto salvo.
        page.locator('[data-close-dialog="foundationProjectsDialog"]').click()
        page.locator('#clearButton').click()
        assert page.locator('#fileCount').inner_text().startswith('0 ')
        page.locator('#foundationProjectsButton').click()
        page.locator('#foundationProjectInput').set_input_files(str(project_path))
        page.wait_for_function("document.querySelector('#foundationProjectStatus').textContent.includes('Projeto aberto')")
        assert page.locator('#fileCount').inner_text().startswith('1 ')

        # Executa uma tarefa e confirma o histórico da central.
        with page.expect_download():
            page.locator('#processButton').click()
        page.wait_for_function("window.CentralPDFFoundation.getTasks().some(t => t.status === 'completed')")
        page.locator('#foundationQueueButton').click()
        assert page.locator('.foundation-task.completed').count() >= 1

        assert not errors, errors
        print('foundation-0.15: passed')
        browser.close()
