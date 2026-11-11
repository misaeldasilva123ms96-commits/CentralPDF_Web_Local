"""Original page ordering, selection, history, project round-trip and real exports."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer
from threading import Thread
from tempfile import gettempdir
import os
from playwright.sync_api import sync_playwright
from ux_browser_support import LocalEngineHandler

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path(os.environ.get('CENTRALPDF_QA_SCREENSHOTS', gettempdir()))
EVIDENCE.mkdir(parents=True, exist_ok=True)
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(LocalEngineHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()

def descriptors(page):
    return page.evaluate('async()=> (await CentralPDFApp.exportProjectState()).snapshot.organizer.pages')

def ids(page):
    return [item['id'] for item in descriptors(page)]

def selected(page):
    return page.locator('.page-card.selected').evaluate_all('cards=>cards.map(card=>card.dataset.pageId)')

def export_order(page):
    with page.expect_download() as result:
        page.locator('#processButton').click()
    download = result.value
    assert download.suggested_filename.endswith('.pdf')
    data = list(Path(download.path()).read_bytes())
    output = page.evaluate(r'''async data=>{
      const bytes=new Uint8Array(data),pdf=await PDFLib.PDFDocument.load(bytes);
      const task=pdfjsLib.getDocument({data:bytes.slice()}),doc=await task.promise,text=[];
      try {for(let n=1;n<=doc.numPages;n++) text.push((await (await doc.getPage(n)).getTextContent()).items.map(item=>item.str).join(' ').replace(/\s+/g,' ').trim());}
      finally {await task.destroy();}
      return {text,rotations:pdf.getPages().map(p=>p.getRotation().angle),images:pdf.getPages().map(p=>{
        const objects=p.node.Resources()?.lookup(PDFLib.PDFName.of('XObject'));
        return objects instanceof PDFLib.PDFDict?objects.keys().length:0;
      })};
    }''', data)
    page.locator('#continueEditingButton').click()
    return output

try:
    with sync_playwright() as p:
        for engine in ['chromium', 'firefox']:
            browser = getattr(p, engine).launch()
            context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True, reduced_motion='reduce')
            context.add_init_script("localStorage.setItem('centralpdf-usage-consent-v1','false')")
            context.route('https://**/*', lambda route: route.abort())
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            assert page.title() == 'Central PDF'
            page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp')
            page.evaluate("CentralPDFApp.selectTool('organize')")
            assert page.locator('#organizerOrderDesc').is_disabled()
            page.evaluate('''async()=>{
              const doc=await PDFLib.PDFDocument.create();
              for(let n=1;n<=7;n++){const page=doc.addPage([420,595]);page.drawText(`PAGINA_${n}`,{x:35,y:520,size:28});page.drawText(`Documento sintético - página ${n}`,{x:35,y:460,size:13});}
              window.orderFile=new File([await doc.save()],'Ordem.pdf',{type:'application/pdf'});
              await CentralPDFApp.openFilesInTool([orderFile],'organize');
            }''')
            page.wait_for_selector('.page-card')
            original = ids(page)
            page.locator('.page-card').nth(1).locator('.page-select input').check()
            page.locator('.page-card').nth(4).locator('.page-select input').check()
            page.locator('#rotateSelectedRight').click()
            before = descriptors(page)
            page.locator('#organizerOrderDesc').click()
            assert ids(page) == original[::-1]
            assert page.locator('.page-caption small').first.inner_text().startswith('Original 7 ·')
            assert set(selected(page)) == {original[1],original[4]}
            assert sorted(descriptors(page),key=lambda item:item['id']) == sorted(before,key=lambda item:item['id'])
            output = export_order(page)
            assert output['text'] == [f'PAGINA_{n} Documento sintético - página {n}' for n in range(7,0,-1)], output
            assert output['rotations'] == [0,0,90,0,0,90,0], output
            page.locator('#organizerUndo').click()
            assert descriptors(page) == before
            page.locator('#organizerRedo').click()
            assert ids(page) == original[::-1]
            page.locator('#organizerOrderAsc').click()
            assert ids(page) == original
            page.locator('#organizerOrderAsc').click()  # A no-op must not pollute undo.
            page.locator('#organizerUndo').click()
            assert ids(page) == original[::-1]
            page.locator('#organizerOrderAsc').click()
            output = export_order(page)
            assert [text.split()[0] for text in output['text']] == [f'PAGINA_{n}' for n in range(1,8)]
            page.locator('.page-card').first.locator('.move-right').click()
            custom = ids(page)
            assert custom == [original[1],original[0],*original[2:]]
            page.locator('#organizerReverseOrder').click()
            assert ids(page) == custom[::-1]
            page.locator('#organizerUndo').click()
            assert ids(page) == custom
            page.locator('#organizerRedo').click()
            assert ids(page) == custom[::-1]

            page.locator('.organizer-selection-options summary').click()
            field = page.locator('#organizerPageRange')
            page.evaluate("window.selectionPreview=document.querySelector('.page-preview img')")
            field.focus();field.press('Control+z')
            assert ids(page) == custom[::-1], 'Undo in a text field must not undo document edits'
            field.fill('1-3, 5, 5');field.press('Enter')
            expected = [ids(page)[n] for n in [0,1,2,4]]
            assert selected(page) == expected
            field.fill('1-999999999');field.press('Enter')
            assert field.get_attribute('aria-invalid') == 'true'
            assert page.locator('#organizerSelectionError').is_visible()
            assert selected(page) == expected
            field.fill('3-1');field.press('Enter')
            assert field.get_attribute('aria-invalid') == 'true'
            field.fill('2, 4');field.press('Enter')
            assert field.get_attribute('aria-invalid') is None
            page.locator('#organizerInvertSelection').click()
            assert selected(page) == [value for n,value in enumerate(ids(page)) if n not in [1,3]]
            assert page.evaluate("document.querySelector('.page-preview img')===selectionPreview"), 'Selection must reuse loaded previews'
            # Selection-only actions never add document history entries.
            page.locator('#organizerUndo').click()
            assert ids(page) == custom
            page.locator('#restorePages').click()
            assert ids(page) == original

            # Import another real PDF, an image and a blank page, then duplicate.
            other = page.evaluate('''async()=>{const d=await PDFLib.PDFDocument.create();for(let n=1;n<=2;n++)d.addPage().drawText(`OUTRO_${n}`);return Array.from(await d.save())}''')
            page.locator('#organizerAddPages').click()
            page.locator('#organizerImportPdfInput').set_input_files({'name':'Outro.pdf','mimeType':'application/pdf','buffer':bytes(other)})
            page.locator('#organizerInsertMode').select_option('end')
            page.locator('#confirmOrganizerAdd').click()
            page.wait_for_function('document.querySelectorAll(".page-card").length===9')
            image = page.evaluate('''async()=>{const c=document.createElement('canvas');c.width=80;c.height=50;c.getContext('2d').fillRect(0,0,80,50);return Array.from(new Uint8Array(await (await new Promise(r=>c.toBlob(r))).arrayBuffer()))}''')
            page.locator('#organizerAddPages').click();page.locator('#organizerAddType').select_option('images')
            page.locator('#organizerImportImageInput').set_input_files({'name':'Imagem.png','mimeType':'image/png','buffer':bytes(image)})
            page.locator('#organizerInsertMode').select_option('end');page.locator('#confirmOrganizerAdd').click()
            page.wait_for_function('document.querySelectorAll(".page-card").length===10')
            page.locator('#organizerAddBlank').click();page.locator('#organizerInsertMode').select_option('start');page.locator('#confirmOrganizerAdd').click()
            page.wait_for_function('document.querySelectorAll(".page-card").length===11')
            page.locator('.page-card').nth(3).locator('.duplicate').click()
            mixed = descriptors(page)
            page.locator('#organizerOrderDesc').click()
            assert descriptors(page)[0]['kind'] == 'blank'
            assert descriptors(page)[1]['kind'] == 'image'
            assert [item['sourceIndex'] for item in descriptors(page) if item['kind']=='pdf'] == [1,0,6,5,4,3,2,2,1,0]
            assert sorted(descriptors(page),key=lambda item:item['id']) == sorted(mixed,key=lambda item:item['id'])
            page.evaluate('''async()=>{const project=await CentralPDFApp.exportProjectState();await CentralPDFApp.importProjectState(project.snapshot,new Map(project.files.map(record=>[record.id,record.file])))}''')
            page.locator('#organizerOrderAsc').click()
            assert descriptors(page)[-1]['kind'] == 'blank'
            assert [item['sourceIndex'] for item in descriptors(page) if item['kind']=='pdf'] == [0,1,2,2,3,4,5,6,0,1]
            output = export_order(page)
            assert len(output['text']) == 12
            assert [text.split()[0] for text in output['text'][:-2]] == ['PAGINA_1','PAGINA_2','PAGINA_3','PAGINA_3','PAGINA_4','PAGINA_5','PAGINA_6','PAGINA_7','OUTRO_1','OUTRO_2']
            assert output['text'][-2:] == ['', '']
            assert output['images'][-2] > 0, 'Imported image must remain embedded in the exported PDF'
            if not page.locator('#organizerSelectionForm').is_visible():
                page.locator('.organizer-selection-options summary').click()
            if page.locator('#cp15Toast [data-close]').is_visible():
                page.locator('#cp15Toast [data-close]').click()
            page.set_viewport_size({'width':390,'height':420})
            field.focus()
            page.wait_for_function('document.querySelector("#organizerPageRange").getBoundingClientRect().bottom<document.querySelector(".action-dock").getBoundingClientRect().top')
            assert page.locator('#rotateSelectedRight').is_hidden()
            page.locator('.page-card').first.locator('.page-select input').check()
            assert page.locator('#rotateSelectedRight').is_visible()
            page.locator('.page-card').first.locator('.page-select input').uncheck()
            for width in [320,360,390,768,1024,1440]:
                for theme in ['dark','light']:
                    page.set_viewport_size({'width':width,'height':900 if width>800 else 844})
                    page.evaluate('(theme)=>{document.body.dataset.theme=theme}',theme)
                    page.wait_for_function('document.documentElement.scrollWidth<=innerWidth+1')
                    assert page.locator('#organizerQuickTools .small-button').evaluate_all('buttons=>buttons.every(e=>e.scrollWidth<=e.clientWidth+1)')
                    assert page.locator('#organizerOrderDesc').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}')
                    if width in [390,1440]:
                        page.evaluate("()=>{const r=document.querySelector('#organizerQuickTools').getBoundingClientRect(),h=document.querySelector('.topbar').getBoundingClientRect();window.scrollBy(0,r.top-Math.max(0,h.bottom)-16)}")
                        page.screenshot(path=str(EVIDENCE/f'organizer-order-expanded-{engine}-{width}-{theme}.png'))
                        page.locator('.organizer-selection-options summary').click()
                        page.screenshot(path=str(EVIDENCE/f'organizer-order-{engine}-{width}-{theme}.png'))
                        page.locator('.organizer-selection-options summary').click()
            # Sorting also exercises the lazy-thumbnail path for large documents.
            page.evaluate('''async()=>{
              const d=await PDFLib.PDFDocument.create();for(let n=1;n<=200;n++)d.addPage([300,400]).drawText(`LOTE_${n}`,{x:30,y:330});
              await CentralPDFApp.openFilesInTool([new File([await d.save()],'Lote.pdf',{type:'application/pdf'})],'organize');
            }''')
            page.locator('#organizerOrderDesc').click()
            assert [item['sourceIndex'] for item in descriptors(page)] == list(range(199,-1,-1))
            output = export_order(page)
            assert output['text'] == [f'LOTE_{n}' for n in range(200,0,-1)]
            page.evaluate("CentralPDFApp.selectTool('merge')")
            assert page.locator('#organizerQuickTools').is_hidden()
            assert not errors, errors
            print(engine, 'ordering, selection, undo/redo, original rotations, project, mixed PDFs/images/blank/duplicate, responsive UI, lazy 200-page document and four real PDF downloads passed', flush=True)
            context.close();browser.close()
finally:
    server.shutdown()
