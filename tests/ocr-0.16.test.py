from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
ocr_js = (root / 'assets/js/ocr-0.16.js').read_text(encoding='utf-8')
ocr_css = (root / 'assets/css/ocr-0.16.css').read_text(encoding='utf-8')

html = f'''<!doctype html><html><head><style>{ocr_css}</style></head><body>
<select id="ocrOutputMode"><option value="text" selected>TXT</option></select>
<select id="ocrLanguage"><option value="por" selected>Português</option></select>
<select id="ocrRecognitionMode"><option value="force" selected>Forçar</option></select>
<select id="ocrDpi"><option value="200" selected>200</option></select>
<select id="ocrPageScope"><option value="all" selected>Todas</option></select>
<input id="ocrPages" value="" /><div id="ocrPagesPanel"></div>
<select id="ocrPageSegMode"><option value="auto" selected>Auto</option></select>
<select id="ocrManualRotation"><option value="0" selected>0</option></select>
<input id="ocrAutoRotate" type="checkbox" checked />
<input id="ocrGrayscale" type="checkbox" checked />
<input id="ocrContrast" type="range" value="20" />
<input id="ocrThresholdEnabled" type="checkbox" />
<input id="ocrThreshold" type="range" value="170" /><div id="ocrThresholdPanel"></div>
<input id="ocrPreserveNative" type="checkbox" checked />
<input id="ocrPageHeaders" type="checkbox" checked />
<input id="ocrIncludeReport" type="checkbox" />
<input id="ocrDetectPatterns" type="checkbox" checked />
<input id="ocrNativeThreshold" type="number" value="25" />
<input id="ocrConfidenceThreshold" type="number" value="60" />
<div id="ocrPlan"></div><div id="ocrLastSummary" class="hidden"></div>
<button id="ocrReviewButton" class="hidden"></button>
<script>
window.PDFLib={{PDFDocument:{{}}}};
window.pdfjsLib={{getDocument(){{throw new Error('PDF.js não deve ser usado para imagem');}},GlobalWorkerOptions:{{}}}};
window.Tesseract={{
 OEM:{{LSTM_ONLY:1}},
 createWorker: async function(langs,oem,options){{
   options.logger?.({{status:'recognizing text',progress:0.5}});
   return {{
     setParameters: async()=>{{}},
     recognize: async()=>({{data:{{text:'CNPJ 12.345.678/0001-90 Valor R$ 1.250,00',confidence:87,blocks:[],pdf:null}}}}),
     terminate: async()=>{{}}
   }};
 }}
}};
{ocr_js}
</script></body></html>'''

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page = browser.new_page()
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(html, wait_until='domcontentloaded')
    result = page.evaluate('''async () => {
      const canvas=document.createElement('canvas'); canvas.width=160; canvas.height=80;
      const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,160,80); ctx.fillStyle='#000'; ctx.font='18px sans-serif'; ctx.fillText('Documento teste',10,40);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const file=new File([blob],'nota_teste.png',{type:'image/png',lastModified:123});
      const progress=[]; const status=[];
      const output=await window.CentralPDFOCR.process({files:[file],progress:v=>progress.push(v),status:m=>status.push(m),cancelled:()=>false});
      const text=await output.outputs[0].blob.text();
      return {filename:output.outputs[0].filename,text,message:output.message,progress,status,engine:window.CentralPDFOCR.getStatus()};
    }''')
    assert result['filename']=='nota_teste_OCR.txt', result
    assert '12.345.678/0001-90' in result['text'], result
    assert 'OCR concluído em 1 página' in result['message'], result
    assert result['engine']['workerSource']=='internet', result
    assert max(result['progress']) >= 90, result
    assert not errors, errors
    print('ocr-0.16: passed')
    browser.close()
