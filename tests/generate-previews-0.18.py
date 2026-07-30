from pathlib import Path
from playwright.sync_api import sync_playwright
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css_files=['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css','assets/css/foundation.css','assets/css/experience-0.15.css','assets/css/ocr-0.16.css','assets/css/professional-0.17.css','assets/css/forms-signatures-0.18.css']
css='\n'.join((root/f).read_text(encoding='utf-8') for f in css_files)
html=re.sub(r'\s*<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\s*<script src="[^"]+"></script>','',html)
mock='''<script>
window.CentralPDFEnginesReady=Promise.resolve();
window.pdfjsLib={Util:{transform:(a,b)=>b},getDocument:()=>({promise:Promise.resolve({numPages:3,getPage:async n=>({getViewport:({scale})=>({width:595*scale,height:842*scale,transform:[1,0,0,1,0,0]}),render:()=>({promise:Promise.resolve()}),getTextContent:async()=>({items:[]})}),destroy(){}})})};
const field=()=>({addToPage(){},setText(){},setFontSize(){},setMaxLength(){},enableMultiline(){},setAlternateName(){},enableRequired(){},addOptions(){},select(){},check(){},addOptionToPage(){}});
window.PDFLib={StandardFonts:{Helvetica:'Helvetica'},rgb:(r,g,b)=>({r,g,b}),degrees:x=>x,PDFDocument:{load:async()=>({getPageCount:()=>3,getPages:()=>[{getSize:()=>({width:595,height:842})},{getSize:()=>({width:595,height:842})},{getSize:()=>({width:595,height:842})}],getForm:()=>({createTextField:field,createCheckBox:field,createDropdown:field,createOptionList:field,createRadioGroup:field,updateFieldAppearances(){}}),embedFont:async()=>({}),getPage:i=>({getSize:()=>({width:595,height:842}),drawImage(){},drawText(){}}),embedPng:async()=>({}),copyPages:async()=>[],setProducer(){},save:async()=>new Uint8Array([37,80,68,70])}),create:async()=>({addPage(){},save:async()=>new Uint8Array([37,80,68,70])})}};
window.JSZip=function(){};
</script>'''
scripts=['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/forms-signatures-0.18.js','assets/js/app.js','assets/js/layout-controls.js']
script_text='\n'.join((root/f).read_text(encoding='utf-8') for f in scripts)
html=html.replace('</body>',mock+f'<script>{script_text}</script></body>')

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    page.evaluate("window.CentralPDFApp.openFilesInTool([new File([new Uint8Array([1,2,3])],'Formulario_Contratual.pdf',{type:'application/pdf',lastModified:1})],'formBuilder')")
    page.wait_for_selector('#formBuilderSection:not(.hidden)')
    page.fill('#formFieldName','nome_completo');page.fill('#formFieldLabel','Nome completo');page.check('#formFieldRequired')
    page.evaluate("document.querySelector('#formStartPlacement').click()")
    ov=page.locator('#formBuilderOverlay');ov.scroll_into_view_if_needed();box=ov.bounding_box()
    page.mouse.move(box['x']+100,box['y']+130);page.mouse.down();page.mouse.move(box['x']+430,box['y']+185);page.mouse.up()
    page.wait_for_timeout(100)
    page.screenshot(path=str(root/'docs/previews/PREVIA_FORMULARIO_0.18.png'),full_page=False)

    page.evaluate("window.CentralPDFApp.openFilesInTool([new File([new Uint8Array([1,2])],'Contrato_Assinatura.pdf',{type:'application/pdf',lastModified:2})],'signPdf')")
    page.wait_for_selector('#signatureSection:not(.hidden)')
    page.select_option('#signatureSource','typed');page.fill('#signatureTypedText','Misael Silva');page.fill('#signatureSignerName','Misael Silva');page.select_option('#signatureDateMode','today');page.evaluate("document.querySelector('#signaturePrepare').click()")
    ov=page.locator('#signatureOverlay');ov.scroll_into_view_if_needed();box=ov.bounding_box()
    page.mouse.move(box['x']+250,box['y']+420);page.mouse.down();page.mouse.move(box['x']+520,box['y']+490);page.mouse.up();page.wait_for_timeout(100)
    page.screenshot(path=str(root/'docs/previews/PREVIA_ASSINATURA_0.18.png'),full_page=False)
    if errors: print('page errors',errors)
    b.close()
print('previews-0.18: generated')
