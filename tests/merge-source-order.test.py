from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
css = '\n'.join((root / name).read_text(encoding='utf-8') for name in ['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css'])
html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>', '', html)
html = html.replace('</head>', f'<style>{css}</style></head>')
html = re.sub(r'\s*<script src="[^"]+"></script>', '', html)

mock = r'''
<script>
window.PDFLib = {
  PDFDocument: {
    load: async () => ({
      getPageCount: () => 2,
      getPageIndices: () => [0, 1],
      getPage: () => ({ getSize: () => ({ width: 595, height: 842 }), getRotation:()=>({angle:0}) }),
      getTitle:()=>'', getAuthor:()=>'', getSubject:()=>'', getKeywords:()=>[], getCreator:()=>'', getProducer:()=>''
    })
  },
  degrees: value => value,
  StandardFonts: { HelveticaBold:'HelveticaBold' },
  rgb:()=>({})
};
window.fetch = async () => ({ok:true, text:async()=>''});
window.pdfjsLib = {
  GlobalWorkerOptions: {},
  getDocument: () => ({ promise: Promise.resolve({
    getPage: async () => ({
      getViewport: ({scale}) => ({ width: 595*scale, height:842*scale }),
      render: () => ({ promise: Promise.resolve() })
    }),
    destroy: async () => {}
  }) })
};
</script>
'''

scripts = '\n'.join((root / name).read_text(encoding='utf-8') for name in [
  'assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'
])
html = html.replace('</body>', mock + f'<script>{scripts}</script></body>')

DROP_JS = r'''(names) => {
  const target = document.querySelector('#dropzone');
  const dt = new DataTransfer();
  names.forEach((name,index) => dt.items.add(new File([new Uint8Array(100 + index * 20)], name, {type:'application/pdf', lastModified:1000 + index})));
  target.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true,cancelable:true}));
  target.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
  target.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
}'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(html, wait_until='domcontentloaded')
    page.locator('.tool-card[data-tool="merge"]').click()
    page.evaluate(DROP_JS, ['30 Relatorio.pdf','2 Contrato.pdf','11 Certidao.pdf'])
    page.wait_for_timeout(700)

    def names():
        return page.locator('#mergePlanPreview .merge-source-item strong').all_text_contents()

    assert names() == ['30 Relatorio.pdf','2 Contrato.pdf','11 Certidao.pdf'], names()
    assert page.locator('#mergeSourceSort').count() == 1
    assert page.locator('#mergeReverseSources').count() == 1

    page.locator('#mergeSourceSort').select_option('nameAsc')
    page.wait_for_timeout(100)
    assert names() == ['2 Contrato.pdf','11 Certidao.pdf','30 Relatorio.pdf'], names()
    assert '2 Contrato.pdf' in page.locator('#pageGrid .page-card').first.inner_text()

    page.locator('#mergeSourceSort').select_option('numberDesc')
    page.wait_for_timeout(100)
    assert names() == ['30 Relatorio.pdf','11 Certidao.pdf','2 Contrato.pdf'], names()

    page.locator('#mergeReverseSources').click()
    page.wait_for_timeout(100)
    assert names() == ['2 Contrato.pdf','11 Certidao.pdf','30 Relatorio.pdf'], names()

    # Drag last source to first.
    page.evaluate(r'''() => {
      const items = [...document.querySelectorAll('#mergePlanPreview .merge-source-item')];
      const dt = new DataTransfer();
      items[2].dispatchEvent(new DragEvent('dragstart',{dataTransfer:dt,bubbles:true,cancelable:true}));
      items[0].dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
      items[0].dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
      items[2].dispatchEvent(new DragEvent('dragend',{dataTransfer:dt,bubbles:true,cancelable:true}));
    }''')
    page.wait_for_timeout(100)
    assert names() == ['30 Relatorio.pdf','2 Contrato.pdf','11 Certidao.pdf'], names()
    assert page.locator('#workspaceDropOverlay').is_hidden()
    assert not errors, errors
    print('merge-source-order: passed')
    browser.close()
