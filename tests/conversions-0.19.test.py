from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
jszip=(root/'vendor/jszip.min.js').read_text(encoding='utf-8')
pptx=(root/'vendor/pptxgen.min.js').read_text(encoding='utf-8')
module=(root/'assets/js/conversions-0.19.js').read_text(encoding='utf-8')
html=f'''<!doctype html><html><body><script>{jszip}</script><script>{pptx}</script><script>{module}</script></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page()
    errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    result=page.evaluate('''async()=>{
      const c=document.createElement('canvas'); c.width=320; c.height=180;
      const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#111'; x.font='24px sans-serif'; x.fillText('Página teste',35,90);
      const png=await new Promise(r=>c.toBlob(r,'image/png'));
      const pages=[{pageNumber:1,text:'Contrato de teste\\nValor R$ 1.250,00',rows:[['Contrato','de','teste'],['Valor','R$ 1.250,00']],imageBlob:png,imageWidth:320,imageHeight:180}];
      const docx=await CentralPDFConversions.buildDocx({title:'Teste',pages,mode:'hybrid'});
      const dz=await JSZip.loadAsync(docx); const dx=await dz.file('word/document.xml').async('text');
      const parsedDocx=await CentralPDFConversions.parseDocx(new File([docx],'teste.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
      const xlsx=await CentralPDFConversions.buildXlsx({title:'Teste',sheets:[{name:'Página 1',rows:pages[0].rows}]});
      const xz=await JSZip.loadAsync(xlsx); const xx=await xz.file('xl/worksheets/sheet1.xml').async('text');
      const parsedXlsx=await CentralPDFConversions.parseXlsx(new File([xlsx],'teste.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const pptx=await CentralPDFConversions.buildPptx({title:'Teste',pages});
      const pz=await JSZip.loadAsync(pptx); const px=await pz.file('ppt/slides/slide1.xml').async('text');
      const parsedPptx=await CentralPDFConversions.parsePptx(new File([pptx],'teste.pptx',{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}));
      const signals=CentralPDFConversions.detectPdfArchiveSignals(new TextEncoder().encode('%PDF-1.7 /OutputIntent /AcroForm pdfaid:part 2'));
      return {docxSize:docx.size,xlsxSize:xlsx.size,pptxSize:pptx.size,dx,xx,px,parsedDocx,parsedXlsx,parsedPptx,signals};
    }''')
    assert result['docxSize']>1500, result
    assert 'Contrato de teste' in result['dx'], result
    assert 'Contrato de teste' in result['parsedDocx'], result
    assert 'R$ 1.250,00' in result['xx'], result
    assert 'R$ 1.250,00' in result['parsedXlsx'], result
    assert result['pptxSize']>5000, result
    assert '<p:sld' in result['px'], result
    assert 'Página teste' not in result['parsedPptx']  # slide is image; text lives in notes
    assert result['signals']['outputIntent'] and result['signals']['pdfaXmp'] and result['signals']['formularios'], result
    assert not errors, errors
    print('conversions-0.19: passed')
    browser.close()
