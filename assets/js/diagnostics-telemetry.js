/* Minimal, explicit Sentry Envelope transport. No document data, SDK auto-capture,
   replay, breadcrumbs, attachments, user identifier or historical-log replay. */
(() => {
  'use strict';
  const RELEASE='centralpdf@2.0.1-tracing1';
  const TRACING_KEY='centralpdf-tracing-consent-v1';
  const CONSENT_KEY='centralpdf-diagnostics-consent-v1';
  const MAX_QUEUE=20, MAX_AGE=15*60*1000, MAX_SENT=30, PER_MINUTE=10;
  const tools=new Set('organize editPdf merge split extract rotate watermark pageNumbers imagesToPdf imageConvert compress pdfToImage crop metadata normalize pdfToText ocr compare redact formBuilder signPdf pdfToOffice documentsToPdf extractImages archivePdf documentAssistant structuredExtraction documentAudit classifyRename protect unlock diagnose repairAdvanced flattenForms'.split(' '));
  const components=new Set('app.js pdf-editor.js pdf-native-text.js pdf-ingest.js foundation.js stable-1.0.js engine-loader.js compression-engine.js ocr-0.16.js compare-0.17.js redaction-0.17.js forms-signatures-0.18.js conversions-0.19.js intelligence-0.20.js workspace-modernization.js'.split(' '));
  const messages={
    input_empty:'Arquivo recebido sem bytes.', input_read_failure:'Falha ao ler arquivo local.',
    input_unsupported:'Formato de entrada incompatível.', input_encrypted:'PDF protegido por senha.',
    input_unsupported_encryption:'Criptografia PDF incompatível.', input_corrupted:'Estrutura PDF inválida.',
    worker_failure:'Falha no motor de processamento.', recovery_limit:'Limite de recuperação automática.',
    recovery_read_failure:'Falha de leitura na recuperação automática.', font_fallback:'Fonte de sistema indisponível.',
    pdf_repaired_object:'Objeto PDF inválido descartado pelo leitor.', resource_failure:'Falha ao carregar recurso do aplicativo.',
    javascript_failure:'Erro JavaScript do aplicativo.', promise_failure:'Rejeição não tratada.',
    console_failure:'Erro técnico capturado no console.', interface_failure:'Falha reportada pela interface.',
    diagnostic_test:'Teste de diagnóstico compartilhado.'
  };
  function destination(config){
    try {
      if(config?.enabled!==true)return null;
      const url=new URL(config.dsn);
      if(url.protocol!=='https:'||url.password||url.port||url.search||url.hash||
        !/^[a-f0-9]{32}$/.test(url.username)||!/^o\d+\.ingest(?:\.(?:us|de))?\.sentry\.io$/.test(url.hostname)||!/^\/\d{1,20}$/.test(url.pathname))return null;
      return {dsn:url.href,endpoint:`${url.origin}/api${url.pathname}/envelope/`,identity:url.origin+url.pathname};
    }catch(_){return null;}
  }
  const config=window.CentralPDFDiagnosticsConfig;
  const target=destination(config);
  const sampleRate=typeof config?.tracesSampleRate==='number'&&Number.isFinite(config.tracesSampleRate)&&config.tracesSampleRate>=0&&config.tracesSampleRate<=1?config.tracesSampleRate:0;
  const environment=config?.environment==='staging'?'staging':'production';
  function storedConsent(value){
    try {const item=JSON.parse(value);return Boolean(target&&item?.version===1&&item.destination===target.identity&&item.allowed===true);}catch(_){return false;}
  }
  let consent=false;
  try {const saved=localStorage.getItem(CONSENT_KEY);consent=Boolean(target&&(saved===null?config?.automaticErrors===true:storedConsent(saved)));}catch(_){}
  let tracingConsent=false,traceGeneration=0,tracesSent=0,inflightType=null,traceBlockedUntil=0;
  try {tracingConsent=consent&&sampleRate>0&&storedConsent(localStorage.getItem(TRACING_KEY));}catch(_){}
  let queue=[],timer=null,controller=null,busy=false,generation=0,blockedUntil=0;
  let sent=0,discarded=0,lastResult='idle',recent=[];
  const $=id=>document.getElementById(id);
  function status(){return {configured:Boolean(target),consent,pending:queue.length,sent,discarded,lastResult,pausedUntil:blockedUntil,tracingConfigured:Boolean(target&&sampleRate>0),tracingConsent,tracesSampleRate:sampleRate,tracesSent,tracingPausedUntil:traceBlockedUntil};}
  function update(){
    const checkbox=$('cpTelemetryConsent');if(checkbox){checkbox.disabled=!target;checkbox.checked=consent;}
    const tracing=$('cpTracingConsent');if(tracing){tracing.disabled=!target||!consent||sampleRate===0;tracing.checked=tracingConsent;}
    const traceStatus=$('cpTracingStatus');if(traceStatus)traceStatus.textContent=tracingConsent?`Desempenho autorizado: amostragem de ${Math.round(sampleRate*100)}% das operações; ${tracesSent} trace(s) enviado(s) nesta aba.`:'Compartilhamento de desempenho desativado.';
    const test=$('cpTelemetryTest');if(test)test.disabled=!target||!consent;
    const node=$('cpTelemetryStatus');if(!node)return;
    let text=!target?'Coleta central não configurada. Os logs continuam somente neste navegador.':!consent?'Compartilhamento desativado neste navegador.':`Compartilhamento de erros ativado. ${sent} relatório(s) enviado(s); ${queue.length} pendente(s) nesta aba.`;
    if(target&&consent&&lastResult==='retry')text+=' Envio indisponível; nova tentativa limitada será feita.';
    if(target&&consent&&blockedUntil>Date.now())text+=' O serviço limitou os envios temporariamente.';
    if(target&&consent&&discarded)text+=` ${discarded} relatório(s) descartado(s) por limite, expiração ou falha.`;
    if(node.textContent!==text)node.textContent=text;
  }
  function setConsent(allowed,persist=true){
    const next=Boolean(target&&allowed===true);if(next!==consent)generation++;consent=next;
    if(!consent){setTracingConsent(false,persist);queue=[];clearTimeout(timer);timer=null;controller?.abort();lastResult='idle';}
    if(persist)try{localStorage.setItem(CONSENT_KEY,JSON.stringify({version:1,destination:target?.identity||'',allowed:consent}));}catch(_){}
    update();return consent;
  }
  function setTracingConsent(allowed,persist=true){
    const next=Boolean(target&&consent&&sampleRate>0&&allowed===true);
    if(next!==tracingConsent)traceGeneration++;
    tracingConsent=next;
    if(!next){queue=queue.filter(entry=>entry.type!=='transaction');if(inflightType==='transaction')controller?.abort();}
    if(persist)try{localStorage.setItem(TRACING_KEY,JSON.stringify({version:1,destination:target?.identity||'',allowed:next}));}catch(_){}
    update();return next;
  }
  function startToolTrace(tool){
    // No document objects, settings, paths or arbitrary names enter this API.
    if(!target||!consent||!tracingConsent||!tools.has(tool)||sampleRate===0||traceBlockedUntil>Date.now()||tracesSent>=10)return null;
    try {
      if(Math.random()>=sampleRate)return null;
      const started=Date.now()/1000,monotonic=performance.now(),epoch=traceGeneration;
      const traceId=crypto.randomUUID().replace(/-/g,''),spanId=crypto.randomUUID().replace(/-/g,'').slice(0,16);
      let finished=false;
      return success=>{
        if(finished)return false;finished=true;
        if(epoch!==traceGeneration||!consent||!tracingConsent)return false;
        try {
          const elapsed=performance.now()-monotonic;
          if(!Number.isFinite(elapsed)||elapsed<0||elapsed>MAX_AGE)return false;
          return enqueue({event_id:crypto.randomUUID().replace(/-/g,''),type:'transaction',platform:'javascript',release:RELEASE,environment,
            transaction:`tool.${tool}`,transaction_info:{source:'component'},start_timestamp:started,timestamp:started+elapsed/1000,
            contexts:{trace:{trace_id:traceId,span_id:spanId,op:'ui.action',status:success===true?'ok':'internal_error'}},
            tags:{tool,tracing_schema:'1'},spans:[]},'transaction');
        }catch(_){return false;}
      };
    }catch(_){return null;}
  }
  function classify(kind,message,source){
    const text=String(message||'').slice(0,4000),origin=String(source||'').slice(0,1000);
    if(/(?:chrome|moz|safari-web)-extension:\/\//i.test(text+' '+origin))return null;
    const code=origin.match(/(?:^|;\s*)código:\s*(empty|readFailure|unsupported|encrypted|unsupportedEncryption|corrupted|worker)(?:\s*;|$)/)?.[1];
    const ingest={empty:'input_empty',readFailure:'input_read_failure',unsupported:'input_unsupported',encrypted:'input_encrypted',unsupportedEncryption:'input_unsupported_encryption',corrupted:'input_corrupted',worker:'worker_failure'};
    if(code)return ingest[code];
    if(/recuperação automática foi ignorada porque os arquivos somam/i.test(text))return 'recovery_limit';
    if(/Recuperação automática não salva/i.test(text))return 'recovery_read_failure';
    if(/Cannot load system font:/i.test(text))return 'font_fallback';
    if(/Removing parsed object:/i.test(text))return 'pdf_repaired_object';
    if(/requested file or directory could not be found|Não foi possível ler|NotFoundError|NotReadableError/i.test(text))return 'input_read_failure';
    return ({javascript:'javascript_failure',promessa:'promise_failure',console:'console_failure',interface:'interface_failure',recurso:'resource_failure'})[kind]||null;
  }
  function makeEvent(kind,message,source){
    const code=classify(kind,message,source);if(!code)return null;
    let tool='unknown';try{const active=window.CentralPDFApp?.getActiveTool?.();if(tools.has(active))tool=active;}catch(_){}
    const candidates=(String(source||'').slice(0,1000)+' '+String(message||'').slice(0,4000)).match(/assets\/js\/([a-z0-9.-]+\.js)/gi)||[];
    const component=candidates.map(path=>path.split('/').pop()).find(name=>components.has(name))||'runtime';
    const warning=kind==='aviso'||code.startsWith('input_')||['recovery_limit','font_fallback','pdf_repaired_object'].includes(code);
    return event(code,tool,component,warning?'warning':'error');
  }
  function event(code,tool,component,level){
    // All fields below are generated or selected from closed dictionaries.
    const id=crypto.randomUUID().replace(/-/g,'');
    return {event_id:id,timestamp:Date.now()/1000,platform:'javascript',logger:'centralpdf.diagnostics',release:RELEASE,environment,level,
      exception:{values:[{type:code,value:messages[code],mechanism:{type:'centralpdf',handled:true}}]},
      fingerprint:['centralpdf-diagnostics-v1',code,tool,component],tags:{code,tool,component,diagnostics_schema:'1'},extra:{occurrences:1}};
  }
  function schedule(delay=1500){
    if(timer!==null||!consent||!target||!queue.length)return;
    timer=setTimeout(()=>{timer=null;void flush();},Math.max(0,delay));
  }
  function enqueue(item,type='event'){
    if(!target||!consent||(type==='transaction'?traceBlockedUntil:blockedUntil)>Date.now())return false;
    if(type==='transaction'&&(!tracingConsent||tracesSent+queue.filter(entry=>entry.type==='transaction').length+(inflightType==='transaction'?1:0)>=10))return false;
    const key=type==='transaction'?item.event_id:item.fingerprint.join('|'),existing=queue.find(entry=>entry.key===key);
    if(existing){existing.event.extra.occurrences=Math.min(1000000,existing.event.extra.occurrences+1);update();return true;}
    if(queue.length>=MAX_QUEUE||sent>=MAX_SENT){discarded++;update();return false;}
    queue.push({key,type,traceGeneration,event:item,created:Date.now(),attempts:0});update();schedule();return true;
  }
  function capture(kind,message,source){
    if(!target||!consent)return false;
    try {const item=makeEvent(kind,message,source);return item?enqueue(item):false;}catch(_){return false;}
  }
  function rateDelay(response,type){
    const header=response.headers.get('X-Sentry-Rate-Limits');
    if(header!==null){
      const delay=Math.max(0,...header.split(',').map(part=>{
        const [seconds,categories]=part.trim().split(':');const value=Number(seconds);
        return Number.isFinite(value)&&value>=0&&categories!==undefined&&(!categories||categories.split(';').some(c=>c===(type==='transaction'?'transaction':'error')||c==='default'))?value*1000:0;
      }));
      if(delay>0||response.status!==429)return delay;
    }
    if(response.status!==429)return 0;
    const retry=response.headers.get('Retry-After');
    if(retry!==null){const seconds=Number(retry);if(Number.isFinite(seconds)&&seconds>=0)return seconds*1000;const date=Date.parse(retry);if(Number.isFinite(date))return Math.max(0,date-Date.now());}
    return 60000;
  }
  async function flush(){
    clearTimeout(timer);timer=null;
    if(busy||!target||!consent||navigator.onLine===false)return;
    const now=Date.now();
    queue=queue.filter(entry=>{if(now-entry.created<=MAX_AGE)return true;discarded++;return false;});
    if(sent>=MAX_SENT){discarded+=queue.length;queue=[];update();return;}
    recent=recent.filter(time=>now-time<60000);
    if(recent.length>=PER_MINUTE){schedule(recent[0]+60000-now);return;}
    // Error diagnostics retain priority over performance samples.
    let index=queue.findIndex(entry=>entry.type==='event'&&blockedUntil<=now);
    if(index<0)index=queue.findIndex(entry=>entry.type==='transaction'&&traceBlockedUntil<=now);
    const entry=index<0?null:queue.splice(index,1)[0];if(!entry){update();return;}
    busy=true;inflightType=entry.type;const activeGeneration=generation;
    controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),8000);
    const payload=JSON.stringify(entry.event);
    const envelope=JSON.stringify({event_id:entry.event.event_id,dsn:target.dsn,sent_at:new Date().toISOString()})+'\n'+
      JSON.stringify({type:entry.type,length:new TextEncoder().encode(payload).length})+'\n'+payload+'\n';
    let retryDelay=0;
    recent.push(now);
    try {
      const response=await fetch(target.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:envelope,
        credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',keepalive:true,signal:controller.signal});
      if(activeGeneration!==generation||!consent||(entry.type==='transaction'&&(!tracingConsent||entry.traceGeneration!==traceGeneration)))return;
      const delay=rateDelay(response,entry.type);
      const errorDelay=rateDelay(response,'event'),traceDelay=rateDelay(response,'transaction');
      if(errorDelay>0)blockedUntil=Math.max(blockedUntil,Date.now()+errorDelay);
      if(traceDelay>0)traceBlockedUntil=Math.max(traceBlockedUntil,Date.now()+traceDelay);
      queue=queue.filter(item=>{const limited=item.type==='transaction'?traceDelay>0:errorDelay>0;if(limited)discarded++;return !limited;});
      if(response.ok){sent++;if(entry.type==='transaction')tracesSent++;lastResult='sent';}
      else if(response.status===429){if(entry.type==='transaction')traceBlockedUntil=Math.max(traceBlockedUntil,Date.now()+1000);else blockedUntil=Math.max(blockedUntil,Date.now()+1000);discarded++;lastResult='limited';}
      else if(response.status>=500){if(delay>0){discarded++;lastResult='limited';}else throw new Error('transient');}
      else {discarded++;lastResult='rejected';}
    }catch(_){
      if(activeGeneration===generation&&consent&&(entry.type!=='transaction'||(tracingConsent&&entry.traceGeneration===traceGeneration))){
        entry.attempts++;lastResult='retry';
        if(entry.attempts<3&&queue.length<MAX_QUEUE){queue.unshift(entry);retryDelay=5000*entry.attempts;}else discarded++;
      }
    }finally{
      clearTimeout(timeout);controller=null;inflightType=null;busy=false;update();schedule(retryDelay||250);
    }
  }
  function sendTest(){
    if(!target||!consent)return false;
    try{return enqueue(event('diagnostic_test','diagnostics','runtime','info'));}catch(_){return false;}
  }
  function mount(parent){
    if(!parent||$('cpTelemetryPanel'))return;
    const panel=document.createElement('section');panel.id='cpTelemetryPanel';panel.className='notice-card';
    panel.setAttribute('aria-label','Compartilhamento de diagnóstico');
    panel.innerHTML='<strong>Diagnóstico compartilhado (opcional)</strong><p>A lista abaixo pertence somente a este navegador. O envio automático de categorias técnicas de erros ao Sentry está ativado por padrão. Você pode desativá-lo abaixo. PDFs, textos e nomes de documentos não são enviados. O serviço recebe os dados de conexão necessários ao envio, como IP.</p><label class="toggle-row"><input id="cpTelemetryConsent" type="checkbox"><span>Compartilhar erros técnicos automaticamente</span></label><label class="toggle-row"><input id="cpTracingConsent" type="checkbox"><span>Permitir também o envio de tempos de processamento</span></label><p>Esta opção mede a duração e o resultado das ferramentas, sem enviar documentos. Exige que o compartilhamento de erros acima esteja ativado.</p><p id="cpTracingStatus" role="status" aria-live="polite"></p><p id="cpTelemetryStatus" role="status" aria-live="polite"></p><button id="cpTelemetryTest" class="cp10-button" type="button">Enviar diagnóstico de teste</button><p>Desativar descarta os pendentes desta aba. Limpar os logs locais não apaga relatórios já recebidos no Sentry.</p>';
    parent.prepend(panel);
    $('cpTelemetryConsent').addEventListener('change',e=>setConsent(e.target.checked));
    $('cpTracingConsent').addEventListener('change',e=>setTracingConsent(e.target.checked));
    $('cpTelemetryTest').addEventListener('click',()=>{sendTest();void flush();});update();
  }
  window.addEventListener('online',()=>schedule(0));
  window.addEventListener('pagehide',()=>{void flush();});
  window.addEventListener('storage',e=>{
    if(e.key===CONSENT_KEY||e.key===null)setConsent(e.key===null?false:storedConsent(e.newValue),false);
    if(e.key===TRACING_KEY||e.key===null)setTracingConsent(e.key===null?false:storedConsent(e.newValue),false);
  });
  window.CentralPDFTelemetry=Object.freeze({capture,setConsent,setTracingConsent,startToolTrace,sendTest,flush,getStatus:status,mount});
})();
