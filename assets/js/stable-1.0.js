(() => {
  'use strict';
  const VERSION='2.0.1';
  const DISPLAY_VERSION='2.0.1';
  const DISPLAY_VERSION_SHORT='2.0';
  const DIAGNOSTIC_MODULE_VERSION='3.0.0';
  const REPORT_SCHEMA_VERSION='3.0';
  const MAX_ERRORS=250;
  const QUALITY_LABEL=`Qualidade ${DISPLAY_VERSION}`;
  const K={seen:'centralpdf-1.0-onboarding-seen',prefs:'centralpdf-1.0-accessibility',errors:'centralpdf-1.0-errors'};
  const state={errors:[],prefs:{largeText:false,highContrast:false,reducedMotion:false,strongFocus:true},lastCheck:null,logQuery:'',logType:'all',resolvedLegacyLogs:0,checkInProgress:false};
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v)}catch{return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const now=()=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date());

  function announce(message){const live=$('#cp10Live');if(!live)return;live.textContent='';setTimeout(()=>{live.textContent=String(message||'')},20)}
  function normalizeError(item){
    const time=item?.time||new Date().toISOString();
    return {time,firstTime:item?.firstTime||time,kind:String(item?.kind||'erro').slice(0,80),message:String(item?.message||'Erro desconhecido').slice(0,4000),source:String(item?.source||'aplicação').slice(0,1000),count:Math.max(1,Number(item?.count)||1)};
  }
  function errorKey(item){return `${item.kind}|${item.message}|${item.source}`}
  function isResolvedLegacyPdfLog(item){
    const message=String(item?.message||'');const source=String(item?.source||'');
    const missingLocal=/vendor\/pdf(?:-lib)?(?:\.worker)?\.min\.js/i.test(source)&&/Falha ao carregar|não foi possível carregar/i.test(message);
    const oldBlobWorker=/Failed to execute 'importScripts'/i.test(message)&&/blob:null\//i.test(`${message} ${source}`);
    const detachedCompression=/detached ArrayBuffer/i.test(message)&&/rasterCompressPdfAdvanced|console\.error|status/i.test(`${message} ${source}`);
    const destroyedSharedWorker=/worker is being destroyed/i.test(message)&&/buildPdfCoverData|console\.warn|Miniatura indisponível/i.test(`${message} ${source}`);
    return missingLocal||oldBlobWorker||detachedCompression||destroyedSharedWorker;
  }
  function migrateResolvedLegacyLogs(items){
    const kept=[];let resolved=0;
    for(const item of items){if(isResolvedLegacyPdfLog(item))resolved+=Math.max(1,Number(item?.count)||1);else kept.push(item)}
    state.resolvedLegacyLogs=resolved;return kept;
  }
  function addError(kind,message,source='aplicação'){
    const item=normalizeError({time:new Date().toISOString(),kind,message,source});
    const key=errorKey(item);const existing=state.errors.find(x=>errorKey(x)===key);
    if(existing){existing.time=item.time;existing.count=Math.max(1,Number(existing.count)||1)+1;state.errors=[existing,...state.errors.filter(x=>x!==existing)];}
    else state.errors.unshift(item);
    state.errors=state.errors.slice(0,MAX_ERRORS);write(K.errors,state.errors);renderErrors();
  }
  function filteredErrors(){
    const q=state.logQuery.trim().toLowerCase();
    return state.errors.filter(item=>(state.logType==='all'||item.kind===state.logType)&&(!q||`${item.kind} ${item.message} ${item.source}`.toLowerCase().includes(q)));
  }
  function logStats(){
    const total=state.errors.reduce((sum,x)=>sum+(Number(x.count)||1),0);const unique=state.errors.length;const byType={};
    state.errors.forEach(x=>{byType[x.kind]=(byType[x.kind]||0)+(Number(x.count)||1)});
    return {unique,total,capacity:MAX_ERRORS,byType};
  }
  function downloadJson(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
  function downloadLogs(){downloadJson({appVersion:DISPLAY_VERSION,moduleVersion:DIAGNOSTIC_MODULE_VERSION,reportSchema:REPORT_SCHEMA_VERSION,exportedAt:new Date().toISOString(),stats:logStats(),logs:state.errors},`CentralPDF_${DISPLAY_VERSION}_Logs_${new Date().toISOString().slice(0,10)}.json`)}
  async function copyLogs(){
    const text=filteredErrors().map(x=>`[${x.time}] ${x.kind.toUpperCase()}${x.count>1?` x${x.count}`:''}\n${x.message}\n${x.source}`).join('\n\n');
    try{await navigator.clipboard.writeText(text||'Nenhum log registrado.');announce('Logs copiados para a área de transferência')}catch{addError('interface','Não foi possível copiar os logs.','clipboard')}
  }
  function captureRuntimeLogs(){
    const originalError=console.error.bind(console),originalWarn=console.warn.bind(console);const format=x=>{if(x instanceof Error)return x.stack||x.message;if(typeof x==='string')return x;try{return JSON.stringify(x)}catch{return String(x)}};
    console.error=(...args)=>{originalError(...args);addError('console',args.map(format).join(' '),'console.error')};
    console.warn=(...args)=>{originalWarn(...args);addError('aviso',args.map(format).join(' '),'console.warn')};
    window.addEventListener('error',e=>{
      const target=e.target;
      if(target&&target!==window){const src=target.src||target.href||target.currentSrc||target.tagName||'recurso';addError('recurso',`Falha ao carregar ${String(target.tagName||'recurso').toLowerCase()}`,src);return}
      addError('javascript',e.message||e.error?.message||'Erro JavaScript',e.filename||e.error?.stack||'script');
    },true);
    window.addEventListener('unhandledrejection',e=>addError('promessa',e.reason?.stack||e.reason?.message||e.reason||'Rejeição não tratada','promise'));
  }
  function applyPrefs(){
    const b=document.body;b.classList.toggle('cp10-large-text',state.prefs.largeText);b.classList.toggle('cp10-high-contrast',state.prefs.highContrast);b.classList.toggle('cp10-reduced-motion',state.prefs.reducedMotion);b.classList.toggle('cp10-strong-focus',state.prefs.strongFocus);
    ['largeText','highContrast','reducedMotion','strongFocus'].forEach(k=>{const el=$(`#cp10-${k}`);if(el)el.checked=!!state.prefs[k]});
    write(K.prefs,state.prefs);
  }
  function createChrome(){
    if(!$('.cp10-skip-link'))document.body.insertAdjacentHTML('afterbegin','<a class="cp10-skip-link" href="#homeView">Pular para o conteúdo principal</a><div id="cp10Live" class="cp10-live-region" aria-live="polite" aria-atomic="true"></div>');
    const copy=$('.brand-copy strong');if(copy&&!$('.cp10-stable-badge'))copy.insertAdjacentHTML('afterend','<span class="cp10-stable-badge">2.0.1 estável</span>');
    const actions=$('.top-actions');const help=$('#helpButton');if(actions&&!$('#cp10QualityButton')){
      const wrap=document.createElement('div');wrap.className='cp10-release-actions';wrap.innerHTML='<button id="cp10QualityButton" class="cp10-top-button" type="button" title="Central 2.0.1: qualidade e acessibilidade"><svg><use href="#i-check"/></svg><span class="cp10-label">2.0.1</span></button>';actions.insertBefore(wrap,help||null);
    }
  }
  function createDialogs(){
    if($('#cp10Onboarding'))return;
    const host=document.createElement('div');host.innerHTML=`
    <dialog id="cp10Onboarding" class="cp10-dialog"><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Central PDF & Imagem 2.0.1</small><h2>Uma central local pronta para uso profissional</h2><p>Trinta e quatro ferramentas, projetos recuperáveis e processamento no seu computador.</p></div><button class="cp10-close" data-close="cp10Onboarding" type="button" aria-label="Fechar">×</button></div><div class="cp10-dialog-body"><div class="cp10-onboarding-grid"><article class="cp10-onboarding-card"><span>1</span><strong>Escolha a tarefa</strong><p>Use a busca ou as categorias. Favoritos e recentes aceleram os trabalhos repetidos.</p></article><article class="cp10-onboarding-card"><span>2</span><strong>Trabalhe com segurança</strong><p>Os arquivos permanecem no navegador. Projetos .cpdf ajudam a continuar depois.</p></article><article class="cp10-onboarding-card"><span>3</span><strong>Revise e exporte</strong><p>Confira páginas, configurações e avisos antes de gerar uma nova cópia.</p></article></div><div class="cp10-release-line"><div><strong>Versão estável 2.0.1</strong><small>34 ferramentas · modo local · recuperação · acessibilidade</small></div><b>Pronta</b></div></div><div class="cp10-dialog-actions"><button id="cp10OpenAccessibilityFromWelcome" class="cp10-button" type="button">Ajustar acessibilidade</button><button id="cp10FinishOnboarding" class="cp10-button primary" type="button">Começar</button></div></div></dialog>
    <dialog id="cp10Accessibility" class="cp10-dialog"><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Acessibilidade</small><h2>Leitura, foco e movimento</h2><p>Preferências salvas somente neste navegador.</p></div><button class="cp10-close" data-close="cp10Accessibility" type="button" aria-label="Fechar">×</button></div><div class="cp10-dialog-body"><div class="cp10-pref-list"><label class="cp10-pref"><span><strong>Texto ampliado</strong><small>Aumenta textos e controles da interface.</small></span><input id="cp10-largeText" class="cp10-switch" type="checkbox"></label><label class="cp10-pref"><span><strong>Contraste reforçado</strong><small>Escurece textos e bordas para facilitar a leitura.</small></span><input id="cp10-highContrast" class="cp10-switch" type="checkbox"></label><label class="cp10-pref"><span><strong>Reduzir movimentos</strong><small>Desativa animações e rolagens suaves.</small></span><input id="cp10-reducedMotion" class="cp10-switch" type="checkbox"></label><label class="cp10-pref"><span><strong>Foco destacado</strong><small>Mostra um contorno forte ao navegar pelo teclado.</small></span><input id="cp10-strongFocus" class="cp10-switch" type="checkbox"></label></div><div class="cp10-shortcuts"><div class="cp10-shortcut"><span>Buscar ferramentas</span><kbd>Ctrl K</kbd></div><div class="cp10-shortcut"><span>Voltar ao início</span><kbd>Alt H</kbd></div><div class="cp10-shortcut"><span>Abrir resultados</span><kbd>Alt R</kbd></div><div class="cp10-shortcut"><span>Abrir projetos</span><kbd>Alt P</kbd></div><div class="cp10-shortcut"><span>Diagnóstico da versão</span><kbd>Alt Q</kbd></div><div class="cp10-shortcut"><span>Acessibilidade</span><kbd>Alt A</kbd></div><div class="cp10-shortcut"><span>Ajuda</span><kbd>?</kbd></div><div class="cp10-shortcut"><span>Barra lateral</span><kbd>F9</kbd></div><div class="cp10-shortcut"><span>Modo foco</span><kbd>Ctrl Shift F</kbd></div></div></div><div class="cp10-dialog-actions"><button id="cp10ResetPrefs" class="cp10-button" type="button">Restaurar padrão</button><button class="cp10-button primary" data-close="cp10Accessibility" type="button">Concluir</button></div></div></dialog>
    <dialog id="cp10Quality" class="cp10-dialog"><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Qualidade da versão 2.0.1</small><h2>Autodiagnóstico da instalação</h2><p>Verificação local dos módulos, motores, execução e registros do navegador.</p><span id="cp10LastCheck" class="cp10-last-check">Aguardando verificação nesta sessão.</span></div><button class="cp10-close" data-close="cp10Quality" type="button" aria-label="Fechar">×</button></div><div class="cp10-dialog-body"><div id="cp10QualityContent"><div class="cp10-empty">Clique em verificar para analisar esta instalação.</div></div><div class="cp10-error-log"><div class="cp10-error-log-head"><div><strong>Registro local de eventos e erros</strong><small id="cp10LogCapacity">Até 250 registros únicos, com repetidos agrupados.</small></div><div class="cp10-log-head-actions"><button id="cp10CopyLogs" class="cp10-button" type="button">Copiar</button><button id="cp10DownloadLogs" class="cp10-button" type="button">Baixar logs</button><button id="cp10ClearErrors" class="cp10-button danger" type="button">Limpar</button></div></div><div class="cp10-log-controls"><label><span>Buscar nos logs</span><input id="cp10LogSearch" type="search" placeholder="Mensagem, origem ou tipo"></label><label><span>Tipo</span><select id="cp10LogFilter"><option value="all">Todos</option><option value="javascript">JavaScript</option><option value="promessa">Promessas</option><option value="recurso">Recursos</option><option value="console">Console</option><option value="aviso">Avisos</option><option value="interface">Interface</option></select></label><div id="cp10LogSummary" class="cp10-log-summary"></div></div><div id="cp10ErrorList" class="cp10-error-log-list"></div></div></div><div class="cp10-dialog-actions"><button id="cp10OpenAccessibilityFromQuality" class="cp10-button" type="button">Acessibilidade</button><button id="cp10DownloadReport" class="cp10-button" type="button">Baixar diagnóstico</button><button id="cp10RunCheck" class="cp10-button primary" type="button">Verificar agora</button></div></div></dialog>`;
    document.body.appendChild(host);
  }
  function bind(){
    document.addEventListener('click',e=>{const verify=e.target.closest('#cp10RunCheck');if(verify){e.preventDefault();runCheckWithFeedback();return}const b=e.target.closest('[data-close]');if(b)document.getElementById(b.dataset.close)?.close()});
    $('#cp10QualityButton')?.addEventListener('click',()=>{renderErrors();$('#cp10Quality').showModal();runCheckWithFeedback({initial:true})});
    $('#cp10OpenAccessibilityFromQuality')?.addEventListener('click',()=>{$('#cp10Quality').close();$('#cp10Accessibility').showModal()});
    $('#cp10FinishOnboarding')?.addEventListener('click',()=>{write(K.seen,true);$('#cp10Onboarding').close();announce('Bem-vindo à Central PDF versão 2.0.1')});
    $('#cp10OpenAccessibilityFromWelcome')?.addEventListener('click',()=>{$('#cp10Onboarding').close();$('#cp10Accessibility').showModal()});
    $('#cp10ResetPrefs')?.addEventListener('click',()=>{state.prefs={largeText:false,highContrast:false,reducedMotion:false,strongFocus:true};applyPrefs()});
    ['largeText','highContrast','reducedMotion','strongFocus'].forEach(k=>$('#cp10-'+k)?.addEventListener('change',e=>{state.prefs[k]=e.target.checked;applyPrefs();announce('Preferência atualizada')}));
    $('#cp10DownloadReport')?.addEventListener('click',downloadReport);$('#cp10DownloadLogs')?.addEventListener('click',downloadLogs);$('#cp10CopyLogs')?.addEventListener('click',copyLogs);
    $('#cp10ClearErrors')?.addEventListener('click',()=>{state.errors=[];write(K.errors,[]);renderErrors()});
    $('#cp10LogSearch')?.addEventListener('input',e=>{state.logQuery=e.target.value;renderErrors()});
    $('#cp10LogFilter')?.addEventListener('change',e=>{state.logType=e.target.value;renderErrors()});
    window.addEventListener('beforeunload',e=>{try{if(window.CentralPDFApp?.hasProject?.()){e.preventDefault();e.returnValue=''}}catch{}});
    window.addEventListener('centralpdf-tool-selected',e=>announce(`Ferramenta aberta: ${e.detail?.title||e.detail?.tool||''}`));
    window.addEventListener('centralpdf-status',e=>{announce(e.detail?.message||'');if(e.detail?.type==='error'){const message=e.detail?.message||'Erro da interface';const cutoff=Date.now()-2500;const duplicate=state.errors.some(item=>Date.parse(item.time)>=cutoff&&(item.message===message||item.message.includes(message)||message.includes(String(item.message).split('\n')[0])));if(!duplicate)addError('interface',message,e.detail?.tool||'status')}});
    document.addEventListener('keydown',keyboard);setupGridKeyboard();
  }
  function keyboard(e){
    const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)&&e.key!=='Escape')return;
    if(e.altKey&&e.key.toLowerCase()==='h'){e.preventDefault();$('#homeBrand')?.click()}
    if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();$('#cp15ResultsBtn')?.click()}
    if(e.altKey&&e.key.toLowerCase()==='p'){e.preventDefault();$('#foundationProjectsButton')?.click()}
    if(e.altKey&&e.key.toLowerCase()==='q'){e.preventDefault();$('#cp10Quality')?.showModal();runCheckWithFeedback({initial:true})}
    if(e.altKey&&e.key.toLowerCase()==='a'){e.preventDefault();$('#cp10Accessibility')?.showModal()}
    if(e.key==='?'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();$('#helpButton')?.click()}
  }
  function setupGridKeyboard(){
    const grid=$('#toolGrid');if(!grid)return;grid.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const cards=$$('.tool-card:not(.hidden)').filter(x=>!x.disabled);if(!cards.length)return;let i=Math.max(0,cards.indexOf(document.activeElement));const cols=Math.max(1,Math.round(grid.clientWidth/(cards[0]?.getBoundingClientRect().width||260)));if(e.key==='ArrowRight')i=Math.min(cards.length-1,i+1);if(e.key==='ArrowLeft')i=Math.max(0,i-1);if(e.key==='ArrowDown')i=Math.min(cards.length-1,i+cols);if(e.key==='ArrowUp')i=Math.max(0,i-cols);if(e.key==='Home')i=0;if(e.key==='End')i=cards.length-1;e.preventDefault();cards[i].focus()});
  }
  function auditDom(){
    $$('button').forEach((b,i)=>{if(!b.getAttribute('aria-label')&&!b.textContent.trim()){b.setAttribute('aria-label',b.title||`Ação ${i+1}`)}});
    $$('.tool-card[data-tool]').forEach(c=>{c.setAttribute('aria-label',`Abrir ${c.querySelector('strong')?.textContent||'ferramenta'}`)});
    const status=$('#statusBox');if(status){status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true')}
    $$('dialog').forEach((d,i)=>{if(!d.getAttribute('aria-label')&&!d.getAttribute('aria-labelledby')){const h=d.querySelector('h2');if(h){if(!h.id)h.id=`cp-dialog-title-${i}`;d.setAttribute('aria-labelledby',h.id)}}});
  }
  function waitForPaint(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,45)))}
  function updateLastCheck(message,stateName='idle'){
    const node=$('#cp10LastCheck');if(!node)return;node.textContent=message;node.dataset.state=stateName;
  }
  async function runCheckWithFeedback(options={}){
    if(state.checkInProgress)return state.lastCheck;
    state.checkInProgress=true;
    const button=$('#cp10RunCheck');const originalLabel=button?.textContent||'Verificar agora';
    if(button){button.disabled=true;button.classList.add('checking');button.textContent='Verificando…';button.setAttribute('aria-busy','true')}
    updateLastCheck('Executando verificações…','running');announce('Verificação iniciada');
    try{
      await waitForPaint();
      const report=runCheck();
      const checkedAt=new Date(report.time);const label=`Última verificação: ${checkedAt.toLocaleTimeString('pt-BR')}`;
      updateLastCheck(label,'success');
      if(button){button.textContent='Verificado ✓';button.classList.remove('checking');button.classList.add('checked')}
      const body=$('#cp10Quality .cp10-dialog-body');if(body&&!options.initial){try{body.scrollTo({top:0,behavior:state.prefs.reducedMotion?'auto':'smooth'})}catch{body.scrollTop=0}}
      return report;
    }catch(error){
      const message=error?.message||String(error||'Falha desconhecida');addError('interface',`Falha durante a verificação: ${message}`,error?.stack||'runCheck');
      updateLastCheck(`Falha na verificação: ${message}`,'error');
      if(button){button.textContent='Tentar novamente';button.classList.remove('checking');button.classList.add('check-failed')}
      announce('A verificação encontrou um erro interno');return null;
    }finally{
      state.checkInProgress=false;
      if(button){button.removeAttribute('aria-busy');setTimeout(()=>{button.disabled=false;button.classList.remove('checked','check-failed');button.textContent=originalLabel},1200)}
    }
  }
  function runCheck(){
    const catalog=window.CentralPDFApp?.getToolCatalog?.()||{};const toolCount=Object.keys(catalog).length;const localServer=location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname);const directFile=location.protocol==='file:';const workerOptions=window.pdfjsLib?.GlobalWorkerOptions||{};const workerSrc=workerOptions.workerSrc||'';const workerStatus=window.CentralPDFGetPdfWorkerStatus?.()||window.CentralPDFEngineStatus?.pdfWorker||{};const engineStatus=window.CentralPDFEngineStatus||{};const runtimeFixes=window.CentralPDFRuntimeFixes||{};const stats=logStats();const toolAudit=window.CentralPDFToolQuality?.auditTools?.()||null;
    const checks=[
      {name:'Catálogo de ferramentas',detail:`${toolCount} ferramentas registradas`,ok:toolCount===34},
      {name:'Auditoria das ferramentas',detail:toolAudit?`${toolAudit.summary.ok} prontas, ${toolAudit.summary.warn} com aviso, ${toolAudit.summary.error} com falha; média ${toolAudit.summary.average}%`:'Módulo de auditoria indisponível',ok:!!toolAudit&&toolAudit.summary.error===0,warn:!!toolAudit&&toolAudit.summary.error===0&&toolAudit.summary.warn>0},
      {name:'Motor ZIP',detail:window.JSZip?'JSZip carregado':'JSZip indisponível',ok:!!window.JSZip},
      {name:'Motor PDF',detail:window.PDFLib?'pdf-lib carregado':'Será carregado ao usar uma ferramenta',ok:!!window.PDFLib,warn:!window.PDFLib},
      {name:'Pré-visualização PDF',detail:window.pdfjsLib?'PDF.js carregado':'Será carregado ao abrir um PDF',ok:!!window.pdfjsLib,warn:!window.pdfjsLib},
      {name:'Worker PDF',detail:workerStatus.ready?`Ativo em ${workerStatus.mode||'modo configurado'} (${workerStatus.source||'origem desconhecida'})`:workerStatus.error?`Compatibilidade limitada: ${workerStatus.error}`:workerSrc?`Configurado por URL: ${workerSrc}`:'Ainda não configurado',ok:!!workerStatus.ready||!!workerOptions.workerPort,warn:!workerStatus.ready&&!workerOptions.workerPort},
      {name:'Ciclo de vida do Worker',detail:runtimeFixes.pdfWorkerLifecycle==='per-document-worker-src'?'Worker independente por documento':'Configuração antiga ou não identificada',ok:runtimeFixes.pdfWorkerLifecycle==='per-document-worker-src',warn:runtimeFixes.pdfWorkerLifecycle!=='per-document-worker-src'},
      {name:'Isolamento de buffers PDF',detail:runtimeFixes.pdfBufferIsolation?'PDF.js e pdf-lib recebem cópias independentes':'Proteção de buffer não identificada',ok:!!runtimeFixes.pdfBufferIsolation,warn:!runtimeFixes.pdfBufferIsolation},
      {name:'OCR',detail:window.CentralPDFOCR?'Módulo registrado':'Módulo ausente',ok:!!window.CentralPDFOCR},
      {name:'Inteligência documental',detail:window.CentralPDFIntelligence?'Módulo registrado':'Módulo ausente',ok:!!window.CentralPDFIntelligence},
      {name:'Projetos e recuperação',detail:window.CentralPDFFoundation?'Disponível':'Indisponível',ok:!!window.CentralPDFFoundation},
      {name:'Resultados e fluxos',detail:window.CentralPDFExperience?'Disponível':'Indisponível',ok:!!window.CentralPDFExperience},
      {name:'Contexto seguro',detail:window.isSecureContext?'Ativo':'Contexto limitado; use o servidor local',ok:window.isSecureContext,warn:!window.isSecureContext},
      {name:'Servidor local',detail:localServer?'Ativo':directFile?'Abertura direta. Use ABRIR_CENTRAL_PDF.bat':'Servidor não identificado',ok:localServer,warn:!localServer},
      {name:'Motores PDF',detail:engineStatus.offlineReady?'Disponíveis localmente e em cache':engineStatus.ready?'Carregados pela internet; use PREPARAR_OFFLINE.bat para cache':'Carregamento incompleto',ok:!!engineStatus.ready,warn:!engineStatus.ready},
      {name:'Logs históricos corrigidos',detail:state.resolvedLegacyLogs?`${state.resolvedLegacyLogs} ocorrência(s) antiga(s) de PDF.js foram removidas da lista ativa`:'Nenhum log legado pendente',ok:true},
      {name:'Armazenamento local',detail:storageAvailable()?'Disponível':'Bloqueado pelo navegador',ok:storageAvailable()},
      {name:'Logs de qualidade',detail:`${stats.unique} registro(s) único(s), ${stats.total} ocorrência(s), capacidade ${MAX_ERRORS}`,ok:stats.unique<MAX_ERRORS,warn:stats.unique>=MAX_ERRORS},
      {name:'Acessibilidade 2.0.1',detail:'Preferências e navegação por teclado ativas',ok:true}
    ];
    const ok=checks.filter(x=>x.ok).length,warn=checks.filter(x=>x.warn&&!x.ok).length,error=checks.length-ok-warn;
    state.lastCheck={version:DISPLAY_VERSION,appVersion:DISPLAY_VERSION,diagnosticModuleVersion:DIAGNOSTIC_MODULE_VERSION,reportSchema:REPORT_SCHEMA_VERSION,time:new Date().toISOString(),url:location.href,protocol:location.protocol,userAgent:navigator.userAgent,online:navigator.onLine,secureContext:window.isSecureContext,toolCount,engineStatus,workerStatus,workerSrc,runtimeFixes,resolvedLegacyLogs:state.resolvedLegacyLogs,toolAudit,checks,logStats:stats,errors:state.errors.map(x=>({...x})),prefs:state.prefs};
    const content=$('#cp10QualityContent');if(content)content.innerHTML=`<div class="cp10-check-summary"><div class="cp10-metric"><small>Versão</small><strong>${DISPLAY_VERSION}</strong></div><div class="cp10-metric"><small>Ferramentas</small><strong>${toolCount}</strong></div><div class="cp10-metric"><small>Aprovados</small><strong>${ok}</strong></div><div class="cp10-metric"><small>Avisos</small><strong>${warn+error}</strong></div></div><div class="cp10-check-list">${checks.map(x=>{const type=x.ok?'ok':x.warn?'warn':'error';return`<div class="cp10-check ${type}"><span>${x.ok?'✓':x.warn?'!':'×'}</span><div><strong>${esc(x.name)}</strong><small>${esc(x.detail)}</small></div><em>${x.ok?'OK':x.warn?'Aviso':'Falha'}</em></div>`}).join('')}</div>`;
    announce(`Diagnóstico concluído: ${ok} verificações aprovadas e ${warn+error} avisos`);renderErrors();return state.lastCheck;
  }
  function storageAvailable(){try{const k='__cp10';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch{return false}}
  function renderErrors(){
    const m=$('#cp10ErrorList');if(!m)return;const logs=filteredErrors();const stats=logStats();const summary=$('#cp10LogSummary');if(summary)summary.innerHTML=`<strong>${logs.length}</strong> exibidos · <strong>${stats.unique}</strong> únicos · <strong>${stats.total}</strong> ocorrências`;
    const cap=$('#cp10LogCapacity');if(cap)cap.textContent=`${stats.unique} de ${MAX_ERRORS} registros únicos; eventos repetidos são agrupados.`;
    m.innerHTML=logs.length?logs.map(x=>`<div class="cp10-error-item"><div class="cp10-error-item-head"><strong>${esc(x.kind)}</strong>${x.count>1?`<b>${x.count}×</b>`:''}<time>${esc(new Date(x.time).toLocaleString('pt-BR'))}</time></div><div>${esc(x.message)}</div><small>${esc(x.source)}</small>${x.firstTime&&x.firstTime!==x.time?`<small>Primeira ocorrência: ${esc(new Date(x.firstTime).toLocaleString('pt-BR'))}</small>`:''}</div>`).join(''):'<div class="cp10-empty">Nenhum log corresponde aos filtros atuais.</div>';
  }
  function downloadReport(){const report=runCheck();downloadJson(report,`CentralPDF_${DISPLAY_VERSION}_Diagnostico_${new Date().toISOString().slice(0,10)}.json`)}
  function updateVersion(){
    $$('.brand-copy small').forEach(x=>x.textContent=`Web local ${DISPLAY_VERSION}`);const foot=$('footer span');if(foot)foot.textContent=`Central PDF & Imagem — Web Local ${DISPLAY_VERSION}`;const side=$('.sidebar-footer-status small');if(side)side.textContent=`v${DISPLAY_VERSION}`;
    const badge=$('.cp10-stable-badge');if(badge)badge.textContent=`${DISPLAY_VERSION} estável`;const quality=$('#cp10QualityButton .cp10-label');if(quality)quality.textContent=DISPLAY_VERSION;
    const stats=$('.hero-stats span strong');if(stats)stats.textContent='34';const count=$('#toolResultCount');if(count&&!count.textContent.includes('34'))count.textContent='34 opções disponíveis';
  }
  function enhanceHelp(){const d=$('#helpDialog .help-steps');if(d&&!$('#cp10HelpStable'))d.insertAdjacentHTML('afterend','<div id="cp10HelpStable" class="cp10-release-line"><div><strong>Atalhos da versão 2.0.1</strong><small>Ctrl K busca · Alt H início · Alt A acessibilidade · Alt Q qualidade · ? ajuda</small></div><b>Teclado</b></div>')}
  function init(){
    state.prefs={...state.prefs,...read(K.prefs,{})};state.errors=migrateResolvedLegacyLogs(read(K.errors,[]).map(normalizeError)).slice(0,MAX_ERRORS);write(K.errors,state.errors);captureRuntimeLogs();createChrome();createDialogs();updateVersion();applyPrefs();bind();enhanceHelp();auditDom();renderErrors();new MutationObserver(()=>auditDom()).observe(document.body,{subtree:true,childList:true});
    if(!navigator.webdriver&&!read(K.seen,false))setTimeout(()=>$('#cp10Onboarding')?.showModal(),650);
    window.CentralPDFStable={version:VERSION,diagnosticModuleVersion:DIAGNOSTIC_MODULE_VERSION,reportSchema:REPORT_SCHEMA_VERSION,maxLogs:MAX_ERRORS,runCheck,runCheckWithFeedback,announce,addLog:addError,getErrors:()=>state.errors.map(x=>({...x})),getLogStats:logStats,getPreferences:()=>({...state.prefs})};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
