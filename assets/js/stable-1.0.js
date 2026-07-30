(() => {
  'use strict';
  const VERSION='1.0.3';
  const K={seen:'centralpdf-1.0-onboarding-seen',prefs:'centralpdf-1.0-accessibility',errors:'centralpdf-1.0-errors'};
  const state={errors:[],prefs:{largeText:false,highContrast:false,reducedMotion:false,strongFocus:true},lastCheck:null};
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v)}catch{return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const now=()=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium'}).format(new Date());

  function announce(message){const live=$('#cp10Live');if(!live)return;live.textContent='';setTimeout(()=>{live.textContent=String(message||'')},20)}
  function addError(kind,message,source='aplicação'){
    const item={time:new Date().toISOString(),kind,message:String(message||'Erro desconhecido').slice(0,1200),source:String(source||'aplicação').slice(0,300)};
    state.errors.unshift(item);state.errors=state.errors.slice(0,25);write(K.errors,state.errors);renderErrors();
  }
  function applyPrefs(){
    const b=document.body;b.classList.toggle('cp10-large-text',state.prefs.largeText);b.classList.toggle('cp10-high-contrast',state.prefs.highContrast);b.classList.toggle('cp10-reduced-motion',state.prefs.reducedMotion);b.classList.toggle('cp10-strong-focus',state.prefs.strongFocus);
    ['largeText','highContrast','reducedMotion','strongFocus'].forEach(k=>{const el=$(`#cp10-${k}`);if(el)el.checked=!!state.prefs[k]});
    write(K.prefs,state.prefs);
  }
  function createChrome(){
    if(!$('.cp10-skip-link'))document.body.insertAdjacentHTML('afterbegin','<a class="cp10-skip-link" href="#homeView">Pular para o conteúdo principal</a><div id="cp10Live" class="cp10-live-region" aria-live="polite" aria-atomic="true"></div>');
    const copy=$('.brand-copy strong');if(copy&&!$('.cp10-stable-badge'))copy.insertAdjacentHTML('afterend','<span class="cp10-stable-badge">1.0 estável</span>');
    const actions=$('.top-actions');const help=$('#helpButton');if(actions&&!$('#cp10QualityButton')){
      const wrap=document.createElement('div');wrap.className='cp10-release-actions';wrap.innerHTML='<button id="cp10QualityButton" class="cp10-top-button" type="button" title="Central 1.0: qualidade e acessibilidade"><svg><use href="#i-check"/></svg><span class="cp10-label">1.0</span></button>';actions.insertBefore(wrap,help||null);
    }
  }
  function createDialogs(){
    if($('#cp10Onboarding'))return;
    const host=document.createElement('div');host.innerHTML=`
    <dialog id="cp10Onboarding" class="cp10-dialog"><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Central PDF & Imagem 1.0</small><h2>Uma central local pronta para uso profissional</h2><p>Trinta e quatro ferramentas, projetos recuperáveis e processamento no seu computador.</p></div><button class="cp10-close" data-close="cp10Onboarding" type="button" aria-label="Fechar">×</button></div><div class="cp10-dialog-body"><div class="cp10-onboarding-grid"><article class="cp10-onboarding-card"><span>1</span><strong>Escolha a tarefa</strong><p>Use a busca ou as categorias. Favoritos e recentes aceleram os trabalhos repetidos.</p></article><article class="cp10-onboarding-card"><span>2</span><strong>Trabalhe com segurança</strong><p>Os arquivos permanecem no navegador. Projetos .cpdf ajudam a continuar depois.</p></article><article class="cp10-onboarding-card"><span>3</span><strong>Revise e exporte</strong><p>Confira páginas, configurações e avisos antes de gerar uma nova cópia.</p></article></div><div class="cp10-release-line"><div><strong>Versão estável 1.0</strong><small>34 ferramentas · modo local · recuperação · acessibilidade</small></div><b>Pronta</b></div></div><div class="cp10-dialog-actions"><button id="cp10OpenAccessibilityFromWelcome" class="cp10-button" type="button">Ajustar acessibilidade</button><button id="cp10FinishOnboarding" class="cp10-button primary" type="button">Começar</button></div></div></dialog>
    <dialog id="cp10Accessibility" class="cp10-dialog"><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Acessibilidade</small><h2>Leitura, foco e movimento</h2><p>Preferências salvas somente neste navegador.</p></div><button class="cp10-close" data-close="cp10Accessibility" type="button" aria-label="Fechar">×</button></div><div class="cp10-dialog-body"><div class="cp10-pref-list"><label class="cp10-pref"><span><strong>Texto ampliado</strong><small>Aumenta textos e controles da interface.</small></span><input id="cp10-largeText" class="cp10-switch" type="checkbox"></label><label class="cp10-pref"><span><strong>Contraste reforçado</strong><small>Escurece textos e bordas para facilitar a leitura.</small></span><input id="cp10-highContrast" class="cp10-switch" type="checkbox"></label><label class="cp10-pref"><span><strong>Reduzir movimentos</strong><small>Desativa animações e rolagens suaves.</small></span><input id="cp10-reducedMotion" class="cp10-switch" type="checkbox"></label><label class="cp10-pref"><span><strong>Foco destacado</strong><small>Mostra um contorno forte ao navegar pelo teclado.</small></span><input id="cp10-strongFocus" class="cp10-switch" type="checkbox"></label></div><div class="cp10-shortcuts"><div class="cp10-shortcut"><span>Buscar ferramentas</span><kbd>Ctrl K</kbd></div><div class="cp10-shortcut"><span>Voltar ao início</span><kbd>Alt H</kbd></div><div class="cp10-shortcut"><span>Abrir resultados</span><kbd>Alt R</kbd></div><div class="cp10-shortcut"><span>Abrir projetos</span><kbd>Alt P</kbd></div><div class="cp10-shortcut"><span>Diagnóstico da versão</span><kbd>Alt Q</kbd></div><div class="cp10-shortcut"><span>Acessibilidade</span><kbd>Alt A</kbd></div><div class="cp10-shortcut"><span>Ajuda</span><kbd>?</kbd></div><div class="cp10-shortcut"><span>Barra lateral</span><kbd>F9</kbd></div><div class="cp10-shortcut"><span>Modo foco</span><kbd>Ctrl Shift F</kbd></div></div></div><div class="cp10-dialog-actions"><button id="cp10ResetPrefs" class="cp10-button" type="button">Restaurar padrão</button><button class="cp10-button primary" data-close="cp10Accessibility" type="button">Concluir</button></div></div></dialog>
    <dialog id="cp10Quality" class="cp10-dialog"><div class="cp10-dialog-shell"><div class="cp10-dialog-head"><div><small>Qualidade da versão 1.0</small><h2>Autodiagnóstico da instalação</h2><p>Verificação local dos módulos, motores e condições do navegador.</p></div><button class="cp10-close" data-close="cp10Quality" type="button" aria-label="Fechar">×</button></div><div class="cp10-dialog-body"><div id="cp10QualityContent"><div class="cp10-empty">Clique em verificar para analisar esta instalação.</div></div><div class="cp10-error-log"><div class="cp10-error-log-head"><div><strong>Registro local de erros</strong><small>Máximo de 25 ocorrências nesta instalação.</small></div><button id="cp10ClearErrors" class="cp10-button danger" type="button">Limpar</button></div><div id="cp10ErrorList" class="cp10-error-log-list"></div></div></div><div class="cp10-dialog-actions"><button id="cp10OpenAccessibilityFromQuality" class="cp10-button" type="button">Acessibilidade</button><button id="cp10DownloadReport" class="cp10-button" type="button">Baixar diagnóstico</button><button id="cp10RunCheck" class="cp10-button primary" type="button">Verificar agora</button></div></div></dialog>`;
    document.body.appendChild(host);
  }
  function bind(){
    document.addEventListener('click',e=>{const b=e.target.closest('[data-close]');if(b)document.getElementById(b.dataset.close)?.close()});
    $('#cp10QualityButton')?.addEventListener('click',()=>{renderErrors();runCheck();$('#cp10Quality').showModal()});
    $('#cp10OpenAccessibilityFromQuality')?.addEventListener('click',()=>{$('#cp10Quality').close();$('#cp10Accessibility').showModal()});
    $('#cp10FinishOnboarding')?.addEventListener('click',()=>{write(K.seen,true);$('#cp10Onboarding').close();announce('Bem-vindo à Central PDF versão 1.0')});
    $('#cp10OpenAccessibilityFromWelcome')?.addEventListener('click',()=>{$('#cp10Onboarding').close();$('#cp10Accessibility').showModal()});
    $('#cp10ResetPrefs')?.addEventListener('click',()=>{state.prefs={largeText:false,highContrast:false,reducedMotion:false,strongFocus:true};applyPrefs()});
    ['largeText','highContrast','reducedMotion','strongFocus'].forEach(k=>$('#cp10-'+k)?.addEventListener('change',e=>{state.prefs[k]=e.target.checked;applyPrefs();announce('Preferência atualizada')}));
    $('#cp10RunCheck')?.addEventListener('click',runCheck);$('#cp10DownloadReport')?.addEventListener('click',downloadReport);$('#cp10ClearErrors')?.addEventListener('click',()=>{state.errors=[];write(K.errors,[]);renderErrors()});
    window.addEventListener('error',e=>addError('javascript',e.message,e.filename||'script'));
    window.addEventListener('unhandledrejection',e=>addError('promessa',e.reason?.message||e.reason||'Rejeição não tratada','promise'));
    window.addEventListener('beforeunload',e=>{try{if(window.CentralPDFApp?.hasProject?.()){e.preventDefault();e.returnValue=''}}catch{}});
    window.addEventListener('centralpdf-tool-selected',e=>announce(`Ferramenta aberta: ${e.detail?.title||e.detail?.tool||''}`));
    window.addEventListener('centralpdf-status',e=>announce(e.detail?.message||''));
    document.addEventListener('keydown',keyboard);
    setupGridKeyboard();
  }
  function keyboard(e){
    const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)&&e.key!=='Escape')return;
    if(e.altKey&&e.key.toLowerCase()==='h'){e.preventDefault();$('#homeBrand')?.click()}
    if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();$('#cp15ResultsBtn')?.click()}
    if(e.altKey&&e.key.toLowerCase()==='p'){e.preventDefault();$('#foundationProjectsButton')?.click()}
    if(e.altKey&&e.key.toLowerCase()==='q'){e.preventDefault();runCheck();$('#cp10Quality')?.showModal()}
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
  function runCheck(){
    const catalog=window.CentralPDFApp?.getToolCatalog?.()||{};const toolCount=Object.keys(catalog).length;
    const checks=[
      {name:'Catálogo de ferramentas',detail:`${toolCount} ferramentas registradas`,ok:toolCount===34},
      {name:'Motor ZIP',detail:window.JSZip?'JSZip carregado':'JSZip indisponível',ok:!!window.JSZip},
      {name:'Motor PDF',detail:window.PDFLib?'pdf-lib carregado':'Será carregado ao usar uma ferramenta',ok:!!window.PDFLib,warn:!window.PDFLib},
      {name:'Pré-visualização PDF',detail:window.pdfjsLib?'PDF.js carregado':'Será carregado ao abrir um PDF',ok:!!window.pdfjsLib,warn:!window.pdfjsLib},
      {name:'OCR',detail:window.CentralPDFOCR?'Módulo registrado':'Módulo ausente',ok:!!window.CentralPDFOCR},
      {name:'Inteligência documental',detail:window.CentralPDFIntelligence?'Módulo registrado':'Módulo ausente',ok:!!window.CentralPDFIntelligence},
      {name:'Projetos e recuperação',detail:window.CentralPDFFoundation?'Disponível':'Indisponível',ok:!!window.CentralPDFFoundation},
      {name:'Resultados e fluxos',detail:window.CentralPDFExperience?'Disponível':'Indisponível',ok:!!window.CentralPDFExperience},
      {name:'Contexto seguro',detail:window.isSecureContext?'Ativo':'Abertura direta ou contexto limitado',ok:window.isSecureContext,warn:!window.isSecureContext},
      {name:'Servidor local',detail:location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname)?'Ativo':'Abertura direta pelo arquivo',ok:location.protocol==='http:',warn:location.protocol!=='http:'},
      {name:'Armazenamento local',detail:storageAvailable()?'Disponível':'Bloqueado pelo navegador',ok:storageAvailable()},
      {name:'Acessibilidade 1.0',detail:'Preferências e navegação por teclado ativas',ok:true}
    ];
    const ok=checks.filter(x=>x.ok).length,warn=checks.filter(x=>x.warn&&!x.ok).length,error=checks.length-ok-warn;state.lastCheck={version:VERSION,time:new Date().toISOString(),url:location.href,userAgent:navigator.userAgent,toolCount,checks,errors:state.errors,prefs:state.prefs};
    const content=$('#cp10QualityContent');if(content)content.innerHTML=`<div class="cp10-check-summary"><div class="cp10-metric"><small>Versão</small><strong>1.0</strong></div><div class="cp10-metric"><small>Ferramentas</small><strong>${toolCount}</strong></div><div class="cp10-metric"><small>Aprovados</small><strong>${ok}</strong></div><div class="cp10-metric"><small>Avisos</small><strong>${warn+error}</strong></div></div><div class="cp10-check-list">${checks.map(x=>{const type=x.ok?'ok':x.warn?'warn':'error';return`<div class="cp10-check ${type}"><span>${x.ok?'✓':x.warn?'!':'×'}</span><div><strong>${esc(x.name)}</strong><small>${esc(x.detail)}</small></div><em>${x.ok?'OK':x.warn?'Aviso':'Falha'}</em></div>`}).join('')}</div>`;
    announce(`Diagnóstico concluído: ${ok} verificações aprovadas e ${warn+error} avisos`);renderErrors();return state.lastCheck;
  }
  function storageAvailable(){try{const k='__cp10';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch{return false}}
  function renderErrors(){const m=$('#cp10ErrorList');if(!m)return;m.innerHTML=state.errors.length?state.errors.map(x=>`<div class="cp10-error-item"><strong>${esc(x.kind)}</strong> · ${esc(new Date(x.time).toLocaleString('pt-BR'))}<br>${esc(x.message)}<br><small>${esc(x.source)}</small></div>`).join(''):'<div class="cp10-empty">Nenhum erro registrado nesta instalação.</div>'}
  function downloadReport(){const report=state.lastCheck||runCheck();const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`CentralPDF_1.0_Diagnostico_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
  function updateVersion(){
    $$('.brand-copy small').forEach(x=>x.textContent='Web local 1.0');const foot=$('footer span');if(foot)foot.textContent='Central PDF & Imagem — Web Local 1.0';const side=$('.sidebar-footer-status small');if(side)side.textContent='v1.0';
    const stats=$('.hero-stats span strong');if(stats)stats.textContent='34';const count=$('#toolResultCount');if(count&&!count.textContent.includes('34'))count.textContent='34 opções disponíveis';
  }
  function enhanceHelp(){const d=$('#helpDialog .help-steps');if(d&&!$('#cp10HelpStable'))d.insertAdjacentHTML('afterend','<div id="cp10HelpStable" class="cp10-release-line"><div><strong>Atalhos da versão 1.0</strong><small>Ctrl K busca · Alt H início · Alt A acessibilidade · Alt Q qualidade · ? ajuda</small></div><b>Teclado</b></div>')}
  function init(){
    state.prefs={...state.prefs,...read(K.prefs,{})};state.errors=read(K.errors,[]);createChrome();createDialogs();updateVersion();applyPrefs();bind();enhanceHelp();auditDom();new MutationObserver(()=>auditDom()).observe(document.body,{subtree:true,childList:true});
    if(!navigator.webdriver&&!read(K.seen,false))setTimeout(()=>$('#cp10Onboarding')?.showModal(),650);
    window.CentralPDFStable={version:VERSION,runCheck,announce,getErrors:()=>[...state.errors],getPreferences:()=>({...state.prefs})};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
