"""Office navigation/search on real app; optional pinned WASM integration.

The default CI pass exercises Chromium and Firefox without downloading Office.
Pages additionally runs --engine against its actual packaged runtime. All files
are synthetic; no user documents, credentials or external telemetry are used.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import argparse
import base64
import io
import json
import os
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--site', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--engine', action='store_true')
parser.add_argument('--report', type=Path)
args = parser.parse_args()

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(args.site)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/index.html'

def synthetic_docx():
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '''<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>''')
        z.writestr('_rels/.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="doc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>''')
        z.writestr('word/_rels/document.xml.rels', '''<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="head" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>''')
        z.writestr('word/header1.xml', '''<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>CABECALHO PRESERVADO QA</w:t></w:r></w:p></w:hdr>''')
        z.writestr('word/document.xml', '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>DOCUMENTO SINTETICO</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="7000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="3500"/><w:gridCol w:w="3500"/></w:tblGrid><w:tr><w:tc><w:p><w:r><w:t>ITEM QA</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>VALOR QA</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr><w:headerReference w:type="default" r:id="head"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/></w:sectPr></w:body></w:document>''')
    return stream.getvalue()

evidence = []
with sync_playwright() as p:
    for name in ['chromium', 'firefox']:
        browser = getattr(p, name).launch(headless=True)
        for width, height in [(1440, 1000), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height})
            writes = []
            context.on('request', lambda request: writes.append(request.method) if request.method != 'GET' else None)
            # Firefox routing bypasses Service Worker navigation offline.
            # Prepared engine runs rely on the runner's fetch telemetry guard.
            if not args.engine:
                context.route('https://**/*', lambda route: route.abort())
            page = context.new_page()
            page.goto(url)
            page.wait_for_function('window.CentralPDFApp && window.CentralPDFToolSearch')
            page.locator('#homeBrand').click()
            for query in ['Office para PDF', 'Word para PDF', 'Excel para PDF', 'PDF para Word', 'ofice', 'POWERPOINT']:
                page.locator('#toolSearch').fill(query)
                assert page.locator('.tool-card:not(.hidden)').count() > 0, (name, query)
            page.locator('#toolSearch').fill('')
            assert page.locator('.tool-card').count() == 39
            assert page.locator('#allToolsMenuButton small').inner_text() == '39'
            assert not page.locator('.tool-card > strong').filter(has_text='Office').count()
            for label, family, field, value in [
                ('PDF para Word','pdfToOffice','officeExportFormat','docx'),
                ('PDF para Excel','pdfToOffice','officeExportFormat','xlsx'),
                ('PDF para PowerPoint','pdfToOffice','officeExportFormat','pptx'),
                ('Word para PDF','documentsToPdf','fileInput','.docx,.doc,.odt'),
                ('Excel para PDF','documentsToPdf','fileInput','.xlsx,.xls,.ods,.csv'),
                ('PowerPoint para PDF','documentsToPdf','fileInput','.pptx,.ppt,.odp'),
                ('Texto e HTML para PDF','documentsToPdf','fileInput','.html,.htm,.txt,.md,.markdown,.rtf'),
            ]:
                page.locator(f'.tool-card[data-shortcut="{label}"]').click()
                assert page.locator('#operationTitle').inner_text() == label
                assert page.evaluate('CentralPDFApp.getActiveTool()') == family
                actual = page.locator('#'+field).get_attribute('accept') if field == 'fileInput' else page.locator('#'+field).input_value()
                assert actual == value, (label, actual)
                assert page.locator('#workspaceToolNav .tool.active').count() == 1
                assert page.locator('#workspaceToolNav .tool.active').get_attribute('data-shortcut') == label
                if family == 'pdfToOffice':
                    assert not page.locator('#officeExportFormat').is_visible()
                page.locator('#homeBrand').click()
            if not page.locator('#allToolsMenuButton').is_visible():
                page.locator('#mobileProductMenuButton').click()
            page.locator('#allToolsMenuButton').click()
            page.locator('#allToolsMegaMenu button').filter(has=page.get_by_text('PDF para Excel',exact=True)).click()
            assert page.locator('#operationTitle').inner_text() == 'PDF para Excel'
            assert page.locator('#officeExportFormat').input_value() == 'xlsx'
            page.locator('#homeBrand').click()
            excel=page.locator('.tool-card[data-shortcut="PDF para Excel"]')
            excel.locator('.cp15-star').click()
            assert excel.locator('.cp15-star').get_attribute('aria-pressed') == 'true'
            assert page.locator('.tool-card[data-shortcut="PDF para Word"] .cp15-star').get_attribute('aria-pressed') == 'false'
            page.locator('#cp15FavRail button').filter(has_text='PDF para Excel').click()
            assert page.locator('#operationTitle').inner_text() == 'PDF para Excel'
            assert page.locator('#officeExportFormat').input_value() == 'xlsx'
            # Existing saved presets may choose a different Office output.
            page.evaluate("CentralPDFApp.applySettings({officeExportFormat:'pptx'})")
            assert page.locator('#operationTitle').inner_text() == 'PDF para PowerPoint'
            assert page.locator('#officeExportFormat').input_value() == 'pptx'
            page.locator('#homeBrand').click()
            if directory := os.environ.get('CENTRALPDF_QA_SCREENSHOTS'):
                Path(directory).mkdir(parents=True, exist_ok=True)
                page.locator('#toolSearch').fill('office')
                assert page.locator('.tool-card:not(.hidden)').count() == 6
                page.locator('#toolGrid').screenshot(path=str(Path(directory) / f'office-cards-{name}-{width}.png'))
                page.locator('#toolSearch').fill('')
            if not page.locator('#converterMenuButton').is_visible():
                page.locator('#mobileProductMenuButton').click()
            page.locator('#converterMenuButton').click()
            assert page.locator('#converterMenu').is_visible()
            assert page.locator('#converterMenu h2').inner_text() == 'Converter PDF e arquivos'
            assert page.locator('#converterMenu button').count() == 16
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            if width == 1440:
                assert page.locator('#converterMenuButton').bounding_box()['x'] < page.locator('#allToolsMenuButton').bounding_box()['x']
            directory = os.environ.get('CENTRALPDF_QA_SCREENSHOTS')
            if directory:
                Path(directory).mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(Path(directory) / f'office-menu-{name}-{width}.png'))
            page.locator('#cp101SettingsButton').click()
            if page.locator('body').get_attribute('data-theme') != 'dark':
                page.locator('#cp101ThemeToggle').click()
            page.keyboard.press('Escape')
            if directory:
                page.locator('#toolSearch').fill('office')
                page.locator('#toolGrid').screenshot(path=str(Path(directory) / f'office-cards-{name}-{width}-dark.png'))
                page.locator('#toolSearch').fill('')
            if not page.locator('#converterMenuButton').is_visible():
                page.locator('#mobileProductMenuButton').click()
            page.locator('#converterMenuButton').click()
            if directory:
                page.screenshot(path=str(Path(directory) / f'office-menu-{name}-{width}-dark.png'))
            if width == 390:
                assert page.locator('.cp2-primary-nav').evaluate('(el)=>getComputedStyle(el).backgroundColor') != 'rgb(255, 255, 255)'
            page.locator('[data-conversion="PDF para Excel"]').click()
            assert page.locator('#officeExportFormat').input_value() == 'xlsx'
            assert page.locator('#operationTitle').inner_text() == 'PDF para Excel'
            if not page.locator('#converterMenuButton').is_visible():
                page.locator('#mobileProductMenuButton').click()
            page.locator('#converterMenuButton').focus()
            page.keyboard.press('ArrowDown')
            page.keyboard.press('Escape')
            assert page.locator('#converterMenu').is_hidden()
            assert page.locator('#converterMenuButton').evaluate('(el) => el === document.activeElement')
            if not page.locator('#converterMenuButton').is_visible():
                page.locator('#mobileProductMenuButton').click()
            page.locator('#converterMenuButton').click()
            page.locator('[data-conversion="Word para PDF"]').click()
            assert page.locator('#docToPdfEngine').input_value() == 'layout'
            assert '.docx' in page.locator('#fileInput').get_attribute('accept')
            page.evaluate("CentralPDFApp.addFiles([new File(['synthetic'], 'formato-incorreto.ods')])")
            assert page.evaluate('CentralPDFApp.getFiles().length') == 0
            blocked = page.evaluate('''async()=>{const open=window.open;window.open=()=>null;try{await CentralPDFOfficeEngine.activate();return '';}catch(e){return e.message;}finally{window.open=open;}}''')
            assert 'Permita' in blocked and not page.evaluate('CentralPDFOfficeEngine.isReady()')
            cancelled = page.evaluate('''async()=>{
              const BC=window.BroadcastChannel,open=window.open,sent=[];
              window.BroadcastChannel=class{postMessage(message){sent.push(message.type);}close(){}};
              window.open=()=>({});
              try{
                const preparation=CentralPDFOfficeEngine.activate().catch(e=>e.message);
                let error='';try{await CentralPDFOfficeEngine.convert(new File(['synthetic'],'cancelar.docx'),()=>true);}catch(e){error=e.message;}
                await preparation;return {error,ready:CentralPDFOfficeEngine.isReady(),sent};
              }finally{window.BroadcastChannel=BC;window.open=open;}
            }''')
            assert 'cancelada' in cancelled['error'] and not cancelled['ready'] and 'convert' not in cancelled['sent'], cancelled
            # Explicit fallback cannot silently consume ZIP/binary ODS as text.
            rejection = page.evaluate('''async()=>{document.querySelector('#docToPdfEngine').value='text';try{await CentralPDFConversions.processDocumentsToPdf({files:[new File(['PK\\x03\\x04'],'teste.ods')]});return '';}catch(e){return e.message;}}''')
            assert 'requer' in rejection
            evidence.append({'browser': name, 'width': width, 'navigation': 'passed', 'search': 'passed'})
            if args.engine and width == 1440:
                data = synthetic_docx()
                page.locator('#fileInput').set_input_files({'name': 'Teste com acentuação.docx', 'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'buffer': data})
                page.wait_for_function('CentralPDFApp.getFiles().length===1')
                page.locator('#docToPdfEngine').select_option('layout')
                with page.expect_popup() as popup:
                    page.evaluate('void CentralPDFOfficeEngine.activate()')
                page.wait_for_function('CentralPDFOfficeEngine.isReady()', timeout=180000)
                result = page.evaluate('''async()=>{const result=await CentralPDFConversions.processDocumentsToPdf({files:CentralPDFApp.getFiles()});const file=result.outputs[0];const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.blob.arrayBuffer())}).promise;try{const text=(await (await pdf.getPage(1)).getTextContent()).items.map(i=>i.str).join(' ');return {filename:file.filename,pages:pdf.numPages,text};}finally{await pdf.destroy();}}''')
                assert result['filename'] == 'Teste com acentuação.pdf'
                assert result['pages'] == 1
                assert 'CABECALHO PRESERVADO QA' in result['text'], result
                assert 'ITEM QA' in result['text'] and 'VALOR QA' in result['text'], result
                evidence.append({'browser': name, 'engine': 'LibreOffice WASM 2.7.2', 'header': 'preserved', 'table_text': 'preserved', 'filename': 'Unicode preserved'})
                visual = page.evaluate('''async()=>{
                  const pages=[];
                  for (const [width,height] of [[300,420],[500,300]]) {
                    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
                    const ctx=canvas.getContext('2d');ctx.fillStyle='#6432c8';ctx.fillRect(0,0,width,height);
                    const imageBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
                    pages.push({pageNumber:pages.length+1,pageWidth:width,pageHeight:height,imageWidth:width,imageHeight:height,imageBlob});
                  }
                  window.officeQAPages=pages;
                  const word=await CentralPDFConversions.buildDocx({title:'Visual QA',pages,mode:'image'});
                  const roundtrip=await CentralPDFOfficeEngine.convert(new File([word],'visual.docx'));
                  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await roundtrip.arrayBuffer())}).promise;
                  try {
                    const results=[];
                    for(let i=1;i<=pdf.numPages;i++){
                      const p=await pdf.getPage(i);const v=p.getViewport({scale:1});
                      const c=document.createElement('canvas');c.width=v.width;c.height=v.height;
                      await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;
                      results.push({width:v.width,height:v.height,pixel:[...c.getContext('2d').getImageData(5,5,1,1).data]});
                    }
                    return results;
                  }finally{await pdf.destroy();}
                }''')
                assert len(visual) == 2, visual
                for actual, expected in zip(visual, [(300, 420), (500, 300)]):
                    # LibreOffice's print device rounds custom paper sizes;
                    # allow less than 1 mm (2 pt), without accepting margins or
                    # the previous A4-only layout/page count.
                    assert abs(actual['width'] - expected[0]) < 2 and abs(actual['height'] - expected[1]) < 2, visual
                    assert all(abs(v - e) < 5 for v, e in zip(actual['pixel'][:3], [100, 50, 200])), visual
                evidence.append({'visual_word_roundtrip': 'two mixed-size pages, full-page color and dimensions preserved'})
                additional = page.evaluate('''async()=>{
                  const sheet=await CentralPDFConversions.buildXlsx({title:'Excel QA',sheets:[{name:'Planilha',rows:[['EXCEL QA','VALOR'],['Item','123,45']]}]});
                  const slides=await CentralPDFConversions.buildPptx({title:'PPTX QA',pages:officeQAPages});
                  const result=[];
                  for(const [name,blob] of [['planilha.xlsx',sheet],['slides.pptx',slides]]){
                    const output=await CentralPDFOfficeEngine.convert(new File([blob],name));
                    const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await output.arrayBuffer())}).promise;
                    try {const p=await pdf.getPage(1);const text=(await p.getTextContent()).items.map(i=>i.str).join(' ');const v=p.getViewport({scale:1});result.push({name,pages:pdf.numPages,text,width:v.width,height:v.height});}
                    finally{await pdf.destroy();}
                  }
                  return result;
                }''')
                assert 'EXCEL QA' in additional[0]['text'] and '123,45' in additional[0]['text'], additional
                assert additional[1]['pages'] == 2 and abs(additional[1]['width'] / additional[1]['height'] - 300 / 420) < .01, additional
                evidence.append({'xlsx_to_pdf': 'cell text preserved', 'pptx_to_pdf': 'two slides, original proportions'})
                with page.expect_download(timeout=120000) as download:
                    page.locator('#processButton').click()
                assert download.value.suggested_filename == 'Teste com acentuação.pdf'
                page.locator('#continueEditingButton').click()
                evidence.append({'full_app_export': 'real process button and Unicode download name'})
                assert not writes, writes
                page.wait_for_function('!CentralPDFOfficeEngine.isReady()')
                if not popup.value.is_closed():
                    popup.value.wait_for_event('close')
                context.set_offline(True)
                try:
                    with page.expect_popup() as offline_popup, page.expect_download(timeout=180000) as offline_download:
                        page.locator('#processButton').click()
                except Exception:
                    for current in context.pages:
                        try:
                            print('DIAGNOSTIC', current.url, current.locator('body').inner_text()[-5000:], flush=True)
                            print('CACHE', current.evaluate('async()=>Object.fromEntries(await Promise.all((await caches.keys()).map(async key=>[key,(await (await caches.open(key)).keys()).length])))'), flush=True)
                        except Exception as diagnostic_error:
                            print('DIAGNOSTIC unavailable:', type(diagnostic_error).__name__, flush=True)
                    raise
                assert offline_download.value.suggested_filename == 'Teste com acentuação.pdf'
                evidence.append({'offline_reactivation': 'process button automatically prepares conversion and downloads PDF without network'})
                page.wait_for_function('!CentralPDFOfficeEngine.isReady()')
                if not offline_popup.value.is_closed():
                    offline_popup.value.wait_for_event('close')
            context.close()
        browser.close()
server.shutdown()
if args.report:
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(evidence, indent=2, ensure_ascii=False))
print('office-conversions: passed', json.dumps(evidence, ensure_ascii=False))
