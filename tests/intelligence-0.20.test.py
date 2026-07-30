from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
jszip=(root/'vendor/jszip.min.js').read_text(encoding='utf-8')
module=(root/'assets/js/intelligence-0.20.js').read_text(encoding='utf-8')
html=f'''<!doctype html><html><body>
<textarea id="intelligenceQuestion">Qual é o valor do contrato e a validade da certidão?</textarea>
<select id="intelligenceSummarySize"><option value="8" selected>8</option></select><select id="intelligenceFocus"><option value="contract" selected>contract</option></select>
<input id="intelligenceEvidenceCount" value="6"><input id="intelligenceIncludeSections" type="checkbox" checked><input id="intelligenceIncludePatterns" type="checkbox" checked>
<div id="intelligenceLastSummary" class="hidden"></div>
<select id="extractionProfile"><option value="general">general</option></select><input id="extractionIncludePages" type="checkbox" checked><input id="extractionGroupByFile" type="checkbox" checked><input id="extractionExportXlsx" type="checkbox"><input id="extractionCustomRegex" value="PED-[0-9]{{6}}"><div id="extractionLastSummary" class="hidden"></div>
<select id="auditProfile"><option value="procurement" selected>procurement</option></select><input id="auditPaymentDate" type="date" value="2026-08-20"><input id="auditLaunchDate" type="date" value="2026-08-01"><input id="auditDueFallback" type="checkbox" checked><input id="auditCompareAmounts" type="checkbox" checked><input id="auditCompareCodes" type="checkbox" checked><input id="auditCompareCnpj" type="checkbox" checked><input id="auditCheckCnd" type="checkbox" checked><div id="auditLastSummary" class="hidden"></div>
<input id="renameTemplate" value="{{tipo}}_{{data}}_{{numero}}"><input id="renameIncludeCopies" type="checkbox" checked><input id="renameDetectDuplicates" type="checkbox" checked><input id="renameDetectBlank" type="checkbox"><input id="renameUseDate" type="checkbox" checked><input id="renameMaxLength" value="100"><div id="renameLastSummary" class="hidden"></div>
<script>{jszip}</script><script>
window.pdfjsLib={{getDocument:({{data}})=>({{promise:(async()=>{{
 const raw=new TextDecoder().decode(data); const pages=raw.split('\\f');
 return {{numPages:pages.length,getPage:async(n)=>({{getTextContent:async()=>({{items:pages[n-1].split('\\n').filter(Boolean).map((str,i)=>({{str,transform:[1,0,0,1,10,800-i*20],width:100,height:12}}))}})}}),destroy:async()=>{{}}}};
}})()}})}};
</script><script>{module}</script></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page()
    errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(html, wait_until='domcontentloaded')
    result=page.evaluate('''async()=>{
      const contract=`CONTRATO Nº 29.00152/2026\nCLÁUSULA PRIMEIRA - DO OBJETO\nContratação de serviços hospitalares.\nCLÁUSULA SEGUNDA - DO VALOR\nO valor total do contrato é R$ 15.000,00.\nCNPJ 35.820.448/0018-84\nPED-123456\fPágina repetida do contrato.`;
      const cnd=`CERTIDÃO POSITIVA\nCNPJ 35.820.448/0018-84\nValidade até 10/08/2026.\nSituação irregular.\fPágina repetida do contrato.`;
      const files=[new File([contract],'Contrato.pdf',{type:'application/pdf',lastModified:1}),new File([cnd],'CND.pdf',{type:'application/pdf',lastModified:2})];
      const run=async tool=>{
        const out=await CentralPDFIntelligence.process(tool,{files,progress:()=>{},cancelled:()=>false});
        const zip=await JSZip.loadAsync(out.outputs[0].blob); const names=Object.keys(zip.files);
        const jsonName=names.find(n=>n.endsWith('.json')); const json=jsonName?JSON.parse(await zip.file(jsonName).async('text')):null;
        return {names,json,message:out.message};
      };
      return {assistant:await run('documentAssistant'),extraction:await run('structuredExtraction'),audit:await run('documentAudit'),rename:await run('classifyRename')};
    }''')
    assert 'relatorio_assistente.html' in result['assistant']['names'], result
    assert result['assistant']['json']['documents'][0]['classification']['type']=='contrato', result
    assert result['assistant']['json']['documents'][0]['answers'], result
    assert any(row['tipo']=='CNPJ' for row in result['extraction']['json']['rows']), result
    assert any(row['tipo']=='Expressão personalizada' and row['valor']=='PED-123456' for row in result['extraction']['json']['rows']), result
    findings=result['audit']['json']['audit']['findings']
    assert any(item['severity']=='high' and 'Certidão' in item['title'] for item in findings), findings
    assert any('vence antes do pagamento' in item['title'] for item in findings), findings
    docs=result['rename']['json']['documents']
    assert docs[0]['suggestedName'].endswith('.pdf'), docs
    assert docs[0]['duplicatePages']==[], docs[0]  # duplicates are evaluated inside each file, not across files
    assert any(name.startswith('arquivos_renomeados/') for name in result['rename']['names']), result
    assert not errors, errors
    print('intelligence-0.20: passed')
    browser.close()
