from pathlib import Path
import re

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>', '', html)
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)

mock = r'''
<script>
window.PDFLib = {
  PDFDocument: {
    load: async () => ({
      getPageCount: () => 1,
      getPageIndices: () => [0],
      getPage: () => ({ getSize: () => ({ width: 595, height: 842 }), getRotation: () => ({angle: 0}) }),
      getTitle: () => '', getAuthor: () => '', getSubject: () => '', getKeywords: () => [],
      getCreator: () => '', getProducer: () => ''
    })
  },
  degrees: value => value,
  StandardFonts: { HelveticaBold: 'HelveticaBold' },
  rgb: () => ({})
};
window.fetch = async () => ({ok: true, text: async () => ''});
</script>
'''

scripts = '\n'.join((root / name).read_text(encoding='utf-8') for name in [
    'assets/js/split-planner.js', 'assets/js/advanced-planner.js',
    'assets/js/organizer-planner.js', 'assets/js/pdf-editor.js',
    'assets/js/ux-enhancements.js', 'assets/js/pdf-ingest.js',
    'assets/js/app.js', 'assets/js/layout-controls.js'
])
html = html.replace('</body>', mock + f'<script>{scripts}</script></body>')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    )
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(html, wait_until='domcontentloaded')
    page.locator('.tool-card[data-tool="merge"]').click()

    page.evaluate(r'''() => {
      const valid = new Uint8Array([37,80,68,70,45,49,46,55]);
      const transfer = new DataTransfer();
      transfer.items.add(new File([valid], 'mime-vazio.pdf', {type: ''}));
      transfer.items.add(new File([valid], 'octet.pdf', {type: 'application/octet-stream'}));
      for (let index = 3; index <= 19; index += 1) {
        transfer.items.add(new File([valid], `lote-${index}.pdf`, {type: 'application/pdf'}));
      }
      transfer.items.add(new File([new TextEncoder().encode('não é PDF')], 'falso.pdf', {type: 'application/pdf'}));
      const target = document.querySelector('#dropzone');
      target.dispatchEvent(new DragEvent('drop', {dataTransfer: transfer, bubbles: true, cancelable: true}));
    }''')

    page.wait_for_function("CentralPDFApp.getFiles().length === 19")
    page.wait_for_function(r'''() => {
      const text = document.querySelector('#statusBox')?.innerText || '';
      return text.includes('falso.pdf') && text.includes('não corresponde a um PDF');
    }''')
    status = page.locator('#statusBox').inner_text()
    loaded_names = page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")
    assert 'mime-vazio.pdf' in loaded_names
    assert 'octet.pdf' in loaded_names
    assert 'falso.pdf' not in loaded_names
    assert 'falso.pdf' in status
    assert 'não corresponde a um PDF' in status

    page.evaluate(r'''() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'seletor.pdf', {type: ''}));
      const input = document.querySelector('#fileInput');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }''')
    page.wait_for_function("CentralPDFApp.getFiles().length === 20")
    assert page.evaluate("CentralPDFApp.getFiles().map(file => file.name)")[-1] == 'seletor.pdf'
    assert not errors, errors
    browser.close()

print('pdf-ingest-browser: passed')
