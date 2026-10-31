/* Optional usage counters and public announcements. Never receives document objects. */
(() => {
 'use strict';
 const BASE='https://centralpdf-admin-homologacao.misaeldasilva123-ms96.workers.dev';
 const KEY='centralpdf-usage-consent-v1',RELEASE='2.0.1-admin-pilot2';
 const tools=new Set('organize editPdf merge split extract rotate watermark pageNumbers imagesToPdf imageConvert compress pdfToImage crop metadata normalize pdfToText ocr compare redact formBuilder signPdf pdfToOffice documentsToPdf extractImages archivePdf documentAssistant structuredExtraction documentAudit classifyRename protect unlock diagnose repairAdvanced flattenForms'.split(' '));
 let allowed=false,queue=[],busy=false,timer=null,tab=null,generation=0,paused=0,lastResult='idle',requests=0,controller=null,day=new Date().toISOString().slice(0,10);
 // A saved opt-out always wins; an unreadable preference stays disabled.
 try {allowed=localStorage.getItem(KEY)!=='false';}catch(_){}
 function active(){return document.visibilityState==='visible';}
 function setConsent(value,persist=true){allowed=value===true;generation++;queue=[];tab=null;controller?.abort();clearTimeout(timer);timer=null;
  if(persist)try{localStorage.setItem(KEY,String(allowed));}catch(_){}
  if(allowed)void flush(true);update();return allowed;
 }
 function update(){const input=document.getElementById('cpUsageConsent');if(input)input.checked=allowed;
  const label=document.getElementById('cpUsageStatus');if(label)label.textContent=!allowed?'Estatísticas desativadas. Operações anteriores não são enviadas.':paused>Date.now()?'Coleta pausada por limite do serviço. As ferramentas continuam disponíveis.':lastResult==='error'?'Envio indisponível. As ferramentas continuam funcionando localmente.':'Estatísticas ativadas: ferramenta e resultado, sem arquivos, nomes ou conteúdo. Cobertura parcial.';
 }
 function schedule(){if(!timer&&allowed)timer=setTimeout(()=>{timer=null;void flush();},1000);}
 async function flush(heartbeat=false){
  const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;requests=0;}
  if(!allowed||busy||paused>Date.now()||requests>=720||navigator.onLine===false||(!queue.length&&!heartbeat))return;
  const epoch=generation,batch=queue.splice(0,10);busy=true;requests++;
  controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),8000);
  try {tab ||= crypto.randomUUID();const response=await fetch(BASE+'/api/public/usage',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal,body:JSON.stringify({schema:1,tab,active:active(),events:batch})});
   if(response.status===429){paused=Date.now()+3600000;lastResult='limited';}
   else if(!response.ok)throw new Error('usage_unavailable');else lastResult='sent';
  }catch(_){lastResult='error';if(epoch===generation)queue=[...batch,...queue].slice(0,20);paused=Date.now()+60000;}
  finally{clearTimeout(timeout);controller=null;busy=false;update();if(epoch===generation&&queue.length&&paused<=Date.now())schedule();}
 }
 function record(tool,result){if(!allowed||!tools.has(tool)||!['completed','failed'].includes(result)||queue.length>=20)return false;
  queue.push({id:crypto.randomUUID(),tool,result});schedule();return true;
 }
 function mount(parent){if(!parent)return;parent.replaceChildren();
  const title=document.createElement('h3');title.textContent='Área do administrador';
  const info=document.createElement('p');info.textContent='Acesso exclusivo do responsável. As ferramentas continuam públicas e os documentos ficam neste dispositivo.';
  const link=document.createElement('a');link.href=BASE+'/';link.target='_blank';link.rel='noopener noreferrer';link.className='ghost-button';link.textContent='Entrar no administrador';
  const label=document.createElement('label');label.className='toggle-row';const box=document.createElement('input');box.type='checkbox';box.id='cpUsageConsent';box.addEventListener('change',()=>setConsent(box.checked));
  const text=document.createElement('span');text.textContent='Permitir estatísticas de uso (opcional)';label.append(box,text);
  const help=document.createElement('p');help.textContent='Ativadas por padrão; você pode desativar neste navegador. Envia ferramenta, conclusão/falha e atividade temporária desta aba. Não envia PDF, imagem, nome, texto ou identidade. O provedor recebe metadados de conexão, como IP. Limites: 720 envios por aba/dia e 5.000 no serviço/dia. Identificadores de eventos: 7 dias; agregados: 90 dias. Desativar descarta pendentes desta aba; não apaga agregados anteriores.';
  const status=document.createElement('p');status.id='cpUsageStatus';status.setAttribute('role','status');parent.append(title,info,link,label,help,status);update();
 }
 async function notices(){
  try{const response=await fetch(BASE+'/api/public/notices',{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(4000)});if(!response.ok)return;
   const values=await response.json();if(!Array.isArray(values))return;
   const host=document.createElement('section');host.id='cpPublishedNotices';host.setAttribute('aria-label','Avisos do CentralPDF');
   for(const value of values.slice(0,3)){if(typeof value.title!=='string'||value.title.length>80||typeof value.message!=='string'||value.message.length>240)continue;const article=document.createElement('article');article.className='notice-card';const heading=document.createElement('strong'),body=document.createElement('p');heading.textContent=value.title;body.textContent=value.message;article.append(heading,body);host.append(article);}
   const prior=document.getElementById('cpPublishedNotices');if(prior)prior.replaceWith(host);else document.querySelector('main')?.prepend(host);
  }catch(_){} // Announcements never block local processing or offline use.
 }
 setInterval(()=>{if(active())void flush(true);},60000);
 setInterval(()=>{if(active())void notices();},120000);
 document.addEventListener('visibilitychange',()=>{if(allowed)void flush(true);});
 window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)setConsent(event.newValue!=='false',false);});
 window.addEventListener('online',()=>{if(allowed)void flush(true);});
 window.CentralPDFAdminBridge=Object.freeze({record,setConsent,mount,flush,getStatus:()=>({allowed,pending:queue.length,lastResult,release:RELEASE})});
 if(allowed)void flush(true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void notices();});else void notices();
})();
