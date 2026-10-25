"""All 34 published tools with real prepared engines and synthetic exported files.
Run after scripts/prepare-offline.ps1; never contacts the real Sentry.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json,time,argparse
parser=argparse.ArgumentParser();parser.add_argument("--site",type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument("--report",type=Path,required=True);args=parser.parse_args()
SITE=args.site.resolve();OUT=args.report.parent;OUT.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(H,directory=str(SITE)));Thread(target=server.serve_forever,daemon=True).start()
setup=r'''async()=>{
 const make=async(n,name)=>{const d=await PDFLib.PDFDocument.create();d.setAuthor('Audit Author');for(let i=0;i<n;i++){const p=d.addPage(i%2?[595,420]:[420,595]);p.drawText('CONTRATO TESTE PAGINA '+(i+1),{x:30,y:500>p.getHeight()?350:500,size:16});p.drawText('CNPJ 12.345.678/0001-90 VALOR R$ 1250,00',{x:30,y:300,size:11});}return new File([await d.save()],name,{type:'application/pdf'});};
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=600;const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,1200,600);c.fillStyle='black';c.font='bold 48px sans-serif';c.fillText('CONTRATO DE PRESTACAO DE SERVICOS',30,100);c.fillText('VALOR R$ 1250,00',30,200);c.fillText('DOCUMENTO TESTE CENTRAL PDF',30,300);
 const png=await new Promise(r=>canvas.toBlob(r,'image/png'));const image=new File([png],'Imagem São Paulo.png',{type:'image/png'});
 const d=await PDFLib.PDFDocument.create();const im=await d.embedPng(await png.arrayBuffer());d.addPage([600,300]).drawImage(im,{x:0,y:0,width:600,height:300});
 const form=await PDFLib.PDFDocument.create();const p=form.addPage([420,595]);const f=form.getForm().createTextField('nome');f.setText('Pessoa Teste');f.addToPage(p,{x:30,y:300,width:180,height:30});
 window.auditFixtures={pdf:await make(3,'Contrato João.pdf'),second:await make(2,'Anexo São Paulo.pdf'),image,scan:new File([await d.save()],'Digitalização.pdf',{type:'application/pdf'}),form:new File([await form.save()],'Formulário.pdf',{type:'application/pdf'}),docx:new File([await CentralPDFConversions.buildDocx({title:'Teste',pages:[{text:'CONTRATO TESTE DOCUMENTO'}]})],'Documento.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})};
 window.auditOutputs=[];addEventListener('centralpdf-result',e=>auditOutputs.push(e.detail));
 HTMLAnchorElement.prototype.click=function(){};
 window.auditDataUrl=canvas.toDataURL();
}'''
run=r'''async(tool)=>{
 const f=auditFixtures;const inputs=tool==='unlock'?[f.encrypted]:['merge','compare'].includes(tool)?[f.pdf,f.second]:['imagesToPdf','imageConvert','ocr'].includes(tool)?[f.image]:tool==='documentsToPdf'?[f.docx]:tool==='flattenForms'?[f.form]:['extractImages','compress'].includes(tool)?[f.scan]:[f.pdf];
 await CentralPDFApp.openFilesInTool(inputs,tool);
 const set=(id,value)=>{const e=document.getElementById(id);if(!e)return;if(e.type==='checkbox')e.checked=!!value;else e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));};
 if(tool==='editPdf')await PDFVisualEditor.addImages([f.image]);
 if(tool==='watermark')set('watermarkText','AUDITORIA');
 if(tool==='split')set('splitMode','pages');
 if(tool==='extract')set('extractPages','1,3');
 if(tool==='redact'){set('redactionRasterAll',true);set('redactionReport',false);}
 if(tool==='formBuilder')await CentralPDFForms.restoreProjectState({page:1,seq:1,fields:[{id:'f1',page:1,x:.1,y:.5,w:.5,h:.06,type:'text',name:'audit_name',label:'Nome',defaultValue:'Auditoria',options:[],fontSize:11,textColor:'#111827',borderColor:'#111827',background:'#ffffff'}]});
 if(tool==='signPdf')await CentralPDFSignatures.restoreProjectState({page:1,seq:1,items:[{id:'s1',page:1,x:.1,y:.7,w:.25,h:.06,dataUrl:auditDataUrl,rotation:0,signerName:'Pessoa Teste',date:''}]});
 if(tool==='protect'){set('protectPassword','Audit-Test-2026');set('protectPasswordConfirm','Audit-Test-2026');set('protectOwnerPassword','Audit-Owner-2026');}
 if(tool==='unlock')set('unlockPassword','Audit-Owner-2026');
 if(tool==='ocr'){set('ocrOutputMode','searchable');set('ocrLanguage','por');}
 auditOutputs.length=0;const start=performance.now();const result=await CentralPDFApp.processCurrentTool();const ms=performance.now()-start;
 if(!result.ok)return{tool,ok:false,ms,error:result.error?.message,status:document.querySelector('#statusBox')?.textContent};
 const outputs=[];
 for(const o of auditOutputs){
  const bytes=new Uint8Array(await o.blob.arrayBuffer());let validation={};
  if(/\.pdf$/i.test(o.filename)){
   if(tool==='protect'){const m=await import('/vendor/libpdf-core.mjs');const pd=await m.PDF.load(bytes,{credentials:'Audit-Test-2026'});validation={encrypted:pd.isEncrypted,authenticated:pd.isAuthenticated};f.encrypted=new File([bytes],'Protegido.pdf',{type:'application/pdf'});}
   else{const pd=await PDFLib.PDFDocument.load(bytes);validation={pages:pd.getPageCount(),fields:pd.getForm().getFields().map(x=>x.getName()),rotations:pd.getPages().map(p=>p.getRotation().angle)};const task=pdfjsLib.getDocument({data:bytes.slice()});const r=await task.promise;validation.text=(await r.getPage(1).then(p=>p.getTextContent())).items.map(i=>i.str).join(' ');await task.destroy();}
  }else if(/\.(zip|docx|xlsx|pptx)$/i.test(o.filename)){const z=await JSZip.loadAsync(bytes);validation={entries:Object.keys(z.files)};for(const name of Object.keys(z.files).filter(n=>n.endsWith('.pdf'))){const b=await z.file(name).async('uint8array');const p=await PDFLib.PDFDocument.load(b);validation[name]={pages:p.getPageCount()};}}
  else if(/\.(png|jpg|jpeg|webp)$/i.test(o.filename)){const bitmap=await createImageBitmap(o.blob);validation={width:bitmap.width,height:bitmap.height};bitmap.close();}
  else {const text=await o.blob.text();validation={text:text.slice(0,500)};if(/\.json$/i.test(o.filename))JSON.parse(text);}
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  outputs.push({name:o.filename,size:bytes.length,sha256:digest,validation});
 }
 const problem=[];if(!outputs.length)problem.push('No exported outputs');
 for(const o of outputs){if(o.size<=0)problem.push('Empty output');}
 if(tool==='merge'&&outputs[0]?.validation.pages!==5)problem.push('Merged output lost pages');
 if(tool==='extract'&&outputs[0]?.validation.pages!==2)problem.push('Wrong extracted page count');
 if(tool==='ocr'&&!outputs.some(o=>/CONTRATO/.test(o.validation.text||'')&&/1250/.test(o.validation.text||'')))problem.push('Real OCR did not recognize expected text');
 if(tool==='redact'&&outputs.some(o=>/CONTRATO/.test(o.validation.text||'')))problem.push('Rasterized redaction retained source text');
 if(tool==='flattenForms'&&outputs.some(o=>o.validation.fields?.length))problem.push('Form fields were not flattened');
 return{tool,ok:problem.length===0,ms,outputs,error:problem.join('; ')};
}'''
rows=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);page=b.new_page();page.set_default_timeout(90000);page.on('dialog',lambda d:d.dismiss());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.PDFLib && window.pdfjsLib && window.CentralPDFApp');page.evaluate(setup)
  tools=page.evaluate('Object.keys(CentralPDFApp.getToolCatalog())');tools.remove('unlock');tools.insert(tools.index('protect')+1,'unlock')
  for tool in tools:
   try:row=page.evaluate(run,tool)
   except Exception as e:row={'tool':tool,'ok':False,'error':str(e)[:1000]}
   rows.append(row);args.report.write_text(json.dumps({'results':rows,'pageErrors':errors},ensure_ascii=False,indent=2));print(tool,row.get('ok'),row.get('error',''),round(row.get('ms',0)),flush=True)
  b.close()
finally:server.shutdown()
assert len(rows)==34, len(rows)
assert not errors,errors
assert all(r.get('ok') for r in rows),[r for r in rows if not r.get('ok')]
