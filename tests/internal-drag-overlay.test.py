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
    numPages: 2,
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
  'assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/pdf-ingest.js','assets/js/app.js','assets/js/layout-controls.js'
])
html = html.replace('</body>', mock + f'<script>{scripts}</script></body>')

DROP_JS = r'''(args) => {
  const target = document.querySelector(args.selector);
  const dt = new DataTransfer();
  for (const name of args.names) dt.items.add(new File([new Uint8Array([37,80,68,70,45,49,46,55])], name, {type:'application/pdf', lastModified:Date.now()+Math.random()}));
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
    page.evaluate(DROP_JS, {'selector':'#dropzone','names':['A.pdf','B.pdf']})
    page.wait_for_timeout(500)
    assert page.locator('#pageGrid .page-card').count() == 4

    result = page.evaluate(r'''() => {
      const cards = [...document.querySelectorAll('#pageGrid .page-card')];
      const overlay = document.querySelector('#workspaceDropOverlay');
      const dt = new DataTransfer();
      const sourceImage = cards[0].querySelector('img');
      const draggableValue = sourceImage?.getAttribute('draggable');
      cards[0].dispatchEvent(new DragEvent('dragstart',{dataTransfer:dt,bubbles:true,cancelable:true}));
      document.querySelector('#toolWorkspace').dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true,cancelable:true}));
      document.querySelector('#toolWorkspace').dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
      const hiddenDuringInternalDrag = overlay.classList.contains('hidden');
      const externalClassAbsent = !document.querySelector('#toolWorkspace').classList.contains('external-file-dragging');
      cards[2].dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
      cards[2].dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
      cards[0].dispatchEvent(new DragEvent('dragend',{dataTransfer:dt,bubbles:true,cancelable:true}));
      return { hiddenDuringInternalDrag, externalClassAbsent, draggableValue };
    }''')

    assert result['hiddenDuringInternalDrag'], result
    assert result['externalClassAbsent'], result
    assert result['draggableValue'] == 'false', result
    assert 'A.pdf · pág. 1' in page.locator('#pageGrid .page-card').nth(2).inner_text()

    # External file drag still shows the overlay.
    external = page.evaluate(r'''() => {
      const workspace = document.querySelector('#toolWorkspace');
      const overlay = document.querySelector('#workspaceDropOverlay');
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array([37,80,68,70,45,49,46,55])], 'C.pdf', {type:'application/pdf'}));
      workspace.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true,cancelable:true}));
      workspace.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));
      const shown = !overlay.classList.contains('hidden');
      workspace.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));
      return shown;
    }''')
    assert external
    page.wait_for_timeout(250)
    assert page.locator('#pageGrid .page-card').count() == 6

    assert not errors, errors
    print('internal-drag-overlay: passed')
    browser.close()
