from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
module=(root/'assets/js/forms-signatures-0.18.js').read_text(encoding='utf-8')
css=(root/'assets/css/forms-signatures-0.18.css').read_text(encoding='utf-8')
html=f'''<!doctype html><html><head><style>{css}</style></head><body data-active-tool="formBuilder">
<div id="organizerSection"></div><button id="processButton"></button>
<div id="formFieldOptionsPanel" class="hidden"></div><select id="formFieldType"><option value="text">Texto</option></select><input id="formFieldName" value="nome"><input id="formFieldLabel" value="Nome completo"><input id="formFieldDefault" value=""><textarea id="formFieldOptions"></textarea><input id="formFieldFontSize" value="11"><input id="formFieldMaxLength" value="0"><input id="formFieldTextColor" value="#111827"><input id="formFieldBorderColor" value="#7c6cff"><input id="formFieldBackground" value="#ffffff"><input id="formFieldRequired" type="checkbox"><button id="formStartPlacement"></button><button id="formUpdateSelected"></button><button id="formDuplicateSelected"></button><button id="formDeleteSelected"></button><input id="formCopyPages"><button id="formCopySelected"></button><div id="formBuilderSummary"></div>
<select id="signatureSource"><option value="draw">draw</option><option value="typed">typed</option><option value="image">image</option></select><div id="signatureDrawPanel"></div><canvas id="signaturePad" width="520" height="180"></canvas><button id="signaturePadClear"></button><input id="signatureInkColor" value="#111827"><input id="signatureInkWidth" value="3"><div id="signatureTypedPanel"><input id="signatureTypedText"><select id="signatureTypedFont"><option value="serif">serif</option></select><input id="signatureTypedColor" value="#111827"></div><div id="signatureImagePanel"></div><input id="signatureImageInput" type="file"><input id="signatureRemoveWhite" type="checkbox"><button id="signaturePrepare"></button><input id="signatureSignerName"><select id="signatureDateMode"><option value="none">none</option><option value="today">today</option><option value="custom">custom</option></select><div id="signatureCustomDatePanel"><input id="signatureCustomDate"></div><select id="signaturePageScope"><option value="manual">manual</option><option value="all">all</option><option value="selected">selected</option></select><input id="signatureRotation" value="0"><div id="signatureSelectedPagesPanel"><input id="signatureSelectedPages"></div><button id="signatureDuplicate"></button><button id="signatureRubricAll"></button><button id="signatureDelete"></button><div id="signatureSummary"></div>
<script>
window.pdfjsLib={{getDocument:()=>({{promise:Promise.resolve({{numPages:2,getPage:async n=>({{getViewport:({{scale}})=>({{width:600*scale,height:800*scale}}),render:()=>({{promise:Promise.resolve()}})}}),destroy(){{}}}})}})}};
const field=()=>({{addToPage(){{}},setText(){{}},setFontSize(){{}},setMaxLength(){{}},enableMultiline(){{}},setAlternateName(){{}},enableRequired(){{}},addOptions(){{}},select(){{}},check(){{}},addOptionToPage(){{}}}});
window.PDFLib={{StandardFonts:{{Helvetica:'Helvetica'}},rgb:(r,g,b)=>({{r,g,b}}),degrees:x=>x,PDFDocument:{{load:async()=>({{getForm:()=>({{createTextField:field,createCheckBox:field,createDropdown:field,createOptionList:field,createRadioGroup:field,updateFieldAppearances(){{}}}}),embedFont:async()=>({{}}),getPage:i=>({{getSize:()=>({{width:600,height:800}}),drawImage(){{}},drawText(){{}}}}),embedPng:async()=>({{}}),setProducer(){{}},save:async()=>new Uint8Array([37,80,68,70])}})}}}};
{module}
</script></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate("window.CentralPDFForms.mount()")
    page.evaluate("window.CentralPDFForms.updatePlan([new File([new Uint8Array([1,2,3])],'teste.pdf',{type:'application/pdf',lastModified:1})])")
    page.wait_for_selector('#formBuilderOverlay')
    page.evaluate("document.querySelector('#formStartPlacement').click()")
    page.locator('#formBuilderOverlay').scroll_into_view_if_needed()
    box=page.locator('#formBuilderOverlay').bounding_box()
    page.mouse.move(box['x']+80,box['y']+100); page.mouse.down(); page.mouse.move(box['x']+320,box['y']+160); page.mouse.up()
    assert page.evaluate("window.CentralPDFForms.getFields().length") == 1
    result=page.evaluate("window.CentralPDFForms.process({files:[new File([new Uint8Array([1])],'teste.pdf',{type:'application/pdf'})],progress:()=>{},cancelled:()=>false}).then(r=>({count:r.outputs.length,message:r.message}))")
    assert result['count']==1
    page.screenshot(path=str(root/'docs/previews/PREVIA_FORMULARIO_0.18.png'), full_page=True)

    page.evaluate("document.body.dataset.activeTool='signPdf'; window.CentralPDFForms.visible(false); window.CentralPDFSignatures.mount()")
    page.evaluate("window.CentralPDFSignatures.updatePlan([new File([new Uint8Array([1,2])],'contrato.pdf',{type:'application/pdf',lastModified:2})])")
    page.wait_for_selector('#signatureOverlay')
    page.select_option('#signatureSource','typed'); page.fill('#signatureTypedText','Misael Silva'); page.evaluate("document.querySelector('#signaturePrepare').click()"); page.locator('#signatureOverlay').scroll_into_view_if_needed()
    sbox=page.locator('#signatureOverlay').bounding_box()
    page.mouse.move(sbox['x']+160,sbox['y']+180); page.mouse.down(); page.mouse.move(sbox['x']+410,sbox['y']+250); page.mouse.up()
    assert page.evaluate("window.CentralPDFSignatures.getItems().length") == 1
    result=page.evaluate("window.CentralPDFSignatures.process({files:[new File([new Uint8Array([1])],'contrato.pdf',{type:'application/pdf'})],progress:()=>{},cancelled:()=>false}).then(r=>({count:r.outputs.length,message:r.message}))")
    assert result['count']==1
    page.screenshot(path=str(root/'docs/previews/PREVIA_ASSINATURA_0.18.png'), full_page=True)
    assert not errors, errors
    print('forms-signatures-ui-0.18: passed')
    browser.close()
