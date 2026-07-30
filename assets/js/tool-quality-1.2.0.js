(() => {
  'use strict';

  const VERSION = '1.2.0';
  const STORAGE_KEY = 'centralpdf-tool-runtime-quality-v1';
  const MAX_RUNS_PER_TOOL = 40;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
  const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const bytes = value => { const n = Number(value || 0); if (!n) return '0 B'; const units=['B','KB','MB','GB']; const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3); return `${(n/1024**i).toFixed(i ? 1 : 0)} ${units[i]}`; };

  const registry = {
    organize:{category:'Páginas',engine:'pdf-lib',input:'PDF',output:'PDF',min:1,max:null,batch:false,level:'Avançada',review:'Conferir ordem, rotação e páginas inseridas.',depth:['reordenar','girar','duplicar','inserir páginas']},
    editPdf:{category:'Edição',engine:'pdf-lib + PDF.js',input:'PDF',output:'PDF',min:1,max:null,batch:false,level:'Avançada',review:'Conferir textos, imagens, camadas e recortes.',depth:['texto','imagem','desenho','recorte','camadas']},
    merge:{category:'Páginas',engine:'pdf-lib',input:'2+ PDFs',output:'PDF',min:2,max:null,batch:true,level:'Avançada',review:'Conferir a sequência visual completa.',depth:['ordenação por página','fontes múltiplas','reparo tolerante']},
    split:{category:'Páginas',engine:'pdf-lib',input:'PDF',output:'ZIP/PDF',min:1,max:1,batch:false,level:'Avançada',review:'Conferir intervalos e quantidade de saídas.',depth:['intervalos','partes iguais','tamanho alvo']},
    extract:{category:'Páginas',engine:'pdf-lib',input:'PDF',output:'PDF',min:1,max:1,batch:false,level:'Intermediária',review:'Conferir a lista e a ordem das páginas.',depth:['intervalos','ordem personalizada','páginas únicas']},
    rotate:{category:'Páginas',engine:'pdf-lib',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Intermediária',review:'Conferir orientação e escopo selecionado.',depth:['todas','pares/ímpares','intervalos']},
    watermark:{category:'Edição',engine:'pdf-lib',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Conferir legibilidade, posição e opacidade.',depth:['texto/imagem','mosaico','alternância','intervalos']},
    pageNumbers:{category:'Edição',engine:'pdf-lib',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Conferir início, total, margem e posição.',depth:['formatos','escopo','total global','alternância']},
    imagesToPdf:{category:'Conversão',engine:'pdf-lib',input:'Imagens',output:'PDF',min:1,max:null,batch:true,level:'Avançada',review:'Conferir proporção, orientação e ordem.',depth:['ajuste de página','margens','qualidade','ordenação']},
    imageConvert:{category:'Imagem',engine:'Canvas + ZIP',input:'Imagens',output:'Imagem/ZIP',min:1,max:null,batch:true,level:'Intermediária',review:'Conferir formato, transparência e dimensões.',depth:['JPG/PNG/WebP','redimensionamento','qualidade']},
    compress:{category:'Otimização',engine:'pdf-lib + PDF.js',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Comparar tamanho, legibilidade e fidelidade.',depth:['estrutural','adaptativa','DPI/qualidade','proteção contra aumento']},
    pdfToImage:{category:'Conversão',engine:'PDF.js + ZIP',input:'PDFs',output:'Imagem/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Conferir resolução, páginas e formato.',depth:['JPG/PNG','DPI','grade','intervalos']},
    crop:{category:'Páginas',engine:'pdf-lib',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Intermediária',review:'Conferir caixas e conteúdo preservado.',depth:['margens','caixa personalizada','intervalos']},
    metadata:{category:'Segurança',engine:'pdf-lib',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Intermediária',review:'Conferir quais campos foram removidos.',depth:['título','autor','palavras-chave','software']},
    normalize:{category:'Otimização',engine:'pdf-lib',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Intermediária',review:'Conferir compatibilidade e aparência.',depth:['reescrita estrutural','formulários','metadados']},
    pdfToText:{category:'Conversão',engine:'PDF.js',input:'PDFs',output:'TXT/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Conferir ordem de leitura e páginas sem texto.',depth:['por página','normalização','detecção de OCR']},
    ocr:{category:'OCR',engine:'PDF.js + Tesseract',input:'PDF/Imagem',output:'PDF/TXT/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Conferir texto reconhecido e páginas críticas.',depth:['idiomas','PDF pesquisável','revisão','confiança']},
    pdfToOffice:{category:'Conversão',engine:'PDF.js + geradores Office',input:'PDFs',output:'DOCX/XLSX/PPTX/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Conferir estrutura, tabelas e fidelidade visual.',depth:['Word','Excel','PowerPoint','layout']},
    documentsToPdf:{category:'Conversão',engine:'Parsers locais + pdf-lib',input:'Office/Imagem/TXT',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Conferir paginação, imagens e fontes.',depth:['DOCX/XLSX/PPTX','imagens','texto','combinação']},
    extractImages:{category:'Imagem',engine:'PDF.js + ZIP',input:'PDFs',output:'Imagem/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Conferir duplicadas, resolução e formato.',depth:['objetos incorporados','renderização','filtros']},
    archivePdf:{category:'Arquivamento',engine:'pdf-lib + PDF.js',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Validar exigências institucionais e assinaturas.',depth:['normalização','metadados','formulários','relatório']},
    documentAssistant:{category:'Inteligência',engine:'PDF.js + regras locais',input:'PDFs',output:'HTML/JSON/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Validar respostas nas páginas originais.',depth:['perguntas','evidências','seções','OCR necessário']},
    structuredExtraction:{category:'Inteligência',engine:'PDF.js + regras locais',input:'PDFs',output:'CSV/JSON/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Validar campos, formatos e páginas de origem.',depth:['campos','regex','CSV','JSON']},
    documentAudit:{category:'Inteligência',engine:'PDF.js + regras locais',input:'PDFs',output:'HTML/CSV/JSON/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Revisar achados e severidades nas fontes.',depth:['regras','severidade','evidências','relatório']},
    classifyRename:{category:'Inteligência',engine:'PDF.js + regras locais',input:'PDFs',output:'ZIP/CSV/JSON',min:1,max:null,batch:true,level:'Profunda',review:'Conferir classificação e nomes antes de arquivar.',depth:['tipos','datas','duplicadas','páginas em branco']},
    compare:{category:'Auditoria',engine:'PDF.js + Canvas',input:'2 PDFs',output:'HTML/JSON/ZIP',min:2,max:2,batch:false,level:'Profunda',review:'Inspecionar diferenças visuais e textuais.',depth:['pixel','texto','páginas ausentes','evidências']},
    redact:{category:'Segurança',engine:'PDF.js + pdf-lib',input:'PDF',output:'PDF/JSON',min:1,max:1,batch:false,level:'Profunda',review:'Confirmar remoção definitiva e relatório.',depth:['áreas','rasterização','hash','relatório']},
    formBuilder:{category:'Formulários',engine:'pdf-lib',input:'PDF',output:'PDF',min:1,max:1,batch:false,level:'Profunda',review:'Testar campos, tabulação e leitores diferentes.',depth:['texto','checkbox','lista','assinatura']},
    signPdf:{category:'Assinatura visual',engine:'pdf-lib + Canvas',input:'PDF',output:'PDF',min:1,max:1,batch:false,level:'Avançada',review:'Assinatura visual não equivale a certificado digital.',depth:['assinatura','rubrica','imagem','posicionamento']},
    protect:{category:'Segurança',engine:'LibPDF',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Testar senha e permissões em leitor externo.',depth:['AES-256/128','permissões','senha administrativa']},
    unlock:{category:'Segurança',engine:'LibPDF',input:'PDFs protegidos',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Confirmar autorização e remoção das restrições.',depth:['senha de usuário','senha administrativa','lote']},
    diagnose:{category:'Diagnóstico',engine:'LibPDF',input:'PDFs',output:'TXT/JSON/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Interpretar limitações do motor e do leitor.',depth:['estrutura','criptografia','formulários','assinaturas']},
    repairAdvanced:{category:'Recuperação',engine:'LibPDF',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Profunda',review:'Comparar integralmente com o original.',depth:['análise tolerante','varredura','proteção']},
    flattenForms:{category:'Formulários',engine:'LibPDF',input:'PDFs',output:'PDF/ZIP',min:1,max:null,batch:true,level:'Avançada',review:'Conferir valores e possíveis assinaturas existentes.',depth:['AcroForm','campos estáticos','lote']}
  };

  const state = {
    runs: read(STORAGE_KEY, {tools:{},recent:[]}),
    activeRun: null,
    lastAudit: null,
    query: '',
    status: 'all'
  };
  if (!state.runs || typeof state.runs !== 'object') state.runs = {tools:{},recent:[]};
  if (!state.runs.tools) state.runs.tools = {};
  if (!Array.isArray(state.runs.recent)) state.runs.recent = [];

  function catalog(){ return window.CentralPDFApp?.getToolCatalog?.() || {}; }
  function capabilities(){ return window.CentralPDFApp?.getToolCapabilities?.() || {}; }
  function files(){ return window.CentralPDFApp?.getFiles?.() || []; }
  function activeTool(){ return window.CentralPDFApp?.getActiveTool?.() || document.body.dataset.activeTool || 'organize'; }
  function engineReady(engine){
    if (/LibPDF/i.test(engine)) return Boolean(window.CentralPDFApp?.getProfessionalEngineStatus?.()?.ready || window.CentralPDFEngineStatus?.libPdfReady);
    if (/Tesseract/i.test(engine)) return Boolean(window.CentralPDFOCR);
    if (/PDF\.js/i.test(engine)) return Boolean(window.pdfjsLib);
    if (/pdf-lib/i.test(engine)) return Boolean(window.PDFLib);
    if (/ZIP/i.test(engine)) return Boolean(window.JSZip);
    return true;
  }

  function validateFiles(tool, list = files()){
    const meta = registry[tool];
    const cfg = catalog()[tool];
    const issues=[];
    if (!meta || !cfg) return [{level:'error',message:'Ferramenta não registrada no catálogo de qualidade.'}];
    if (list.length < meta.min) issues.push({level:'error',message:`Adicione ${meta.min === 1 ? 'pelo menos um arquivo' : `${meta.min} arquivos`} para continuar.`});
    if (Number.isFinite(meta.max) && list.length > meta.max) issues.push({level:'error',message:`Esta ferramenta aceita no máximo ${meta.max} arquivo(s).`});
    const empty=list.filter(file=>!Number(file.size));
    if (empty.length) issues.push({level:'error',message:`${empty.length} arquivo(s) estão vazios ou inacessíveis.`});
    const huge=list.filter(file=>Number(file.size)>600*1024*1024);
    if (huge.length) issues.push({level:'warn',message:`${huge.length} arquivo(s) excedem 600 MB e podem consumir muita memória.`});
    const total=list.reduce((sum,file)=>sum+Number(file.size||0),0);
    if (total>1200*1024*1024) issues.push({level:'warn',message:`O lote possui ${bytes(total)}; processe em grupos menores se o navegador ficar lento.`});
    if (!engineReady(meta.engine)) issues.push({level:'warn',message:`O motor ${meta.engine} será carregado quando necessário ou precisa do modo offline preparado.`});
    return issues;
  }

  function preflight(tool = activeTool(), list = files()){
    const meta=registry[tool];
    const issues=validateFiles(tool,list);
    return {tool,meta,files:list.length,totalSize:list.reduce((sum,file)=>sum+Number(file.size||0),0),issues,blocking:issues.some(item=>item.level==='error')};
  }

  function toolRuntime(key){
    const value=state.runs.tools[key] || {runs:0,success:0,failures:0,totalMs:0,lastRun:null,lastError:'',outputs:0,lastOutputSize:0,warnings:0};
    state.runs.tools[key]=value; return value;
  }
  function persist(){ state.runs.recent=state.runs.recent.slice(0,150); write(STORAGE_KEY,state.runs); }

  function beginRun(context={}){
    const tool=context.tool||activeTool(); const list=context.files||files(); const check=preflight(tool,list);
    if (check.blocking) return {ok:false,preflight:check};
    const run={id:`run-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,tool,startedAt:Date.now(),inputCount:list.length,inputSize:list.reduce((s,f)=>s+Number(f.size||0),0),outputs:[],warnings:check.issues.filter(x=>x.level==='warn').map(x=>x.message)};
    state.activeRun=run; window.dispatchEvent(new CustomEvent('centralpdf-quality-run-start',{detail:{...run}})); return {ok:true,run,preflight:check};
  }
  function finishRun(result={}){
    const run=state.activeRun; if(!run)return null; const rt=toolRuntime(run.tool); const duration=Date.now()-run.startedAt;
    run.finished=true;rt.runs+=1;rt.success+=1;rt.totalMs+=duration;rt.lastRun=new Date().toISOString();rt.outputs+=run.outputs.length;run.outputs.forEach(item=>item.counted=true);rt.lastOutputSize=run.outputs.at(-1)?.size||rt.lastOutputSize;rt.warnings+=run.warnings.length;
    state.runs.recent.unshift({...run,status:'success',duration,message:result?.message||'',endedAt:Date.now()});state.activeRun=null;persist();renderQualityPanel();window.dispatchEvent(new CustomEvent('centralpdf-quality-run-end',{detail:{tool:run.tool,status:'success',duration}}));return rt;
  }
  function failRun(error){
    const run=state.activeRun; if(!run)return null; const rt=toolRuntime(run.tool); const duration=Date.now()-run.startedAt; const message=error?.message||String(error||'Falha desconhecida');
    rt.runs+=1;rt.failures+=1;rt.totalMs+=duration;rt.lastRun=new Date().toISOString();rt.lastError=message;
    state.runs.recent.unshift({...run,status:'error',duration,message,endedAt:Date.now()});state.activeRun=null;persist();renderQualityPanel();window.dispatchEvent(new CustomEvent('centralpdf-quality-run-end',{detail:{tool:run.tool,status:'error',duration,message}}));return rt;
  }

  async function validateOutput(detail={}){
    const runAtStart=state.activeRun;
    const blob=detail.blob; if(!(blob instanceof Blob))return {ok:false,issues:['Saída sem Blob válido.']};
    const issues=[]; if(blob.size===0)issues.push('O arquivo gerado está vazio.');
    const name=String(detail.filename||'').toLowerCase();
    try{
      const head=new Uint8Array(await blob.slice(0,8).arrayBuffer()); const text=String.fromCharCode(...head.slice(0,5));
      if(name.endsWith('.pdf')&&text!=='%PDF-')issues.push('A saída .pdf não possui assinatura PDF válida.');
      if(/\.(zip|docx|xlsx|pptx)$/.test(name)&&!(head[0]===0x50&&head[1]===0x4b))issues.push('A saída compactada ou Office não possui assinatura ZIP válida.');
      if(name.endsWith('.png')&&!(head[0]===0x89&&head[1]===0x50&&head[2]===0x4e&&head[3]===0x47))issues.push('A saída .png não possui assinatura PNG válida.');
      if(/\.jpe?g$/.test(name)&&!(head[0]===0xff&&head[1]===0xd8))issues.push('A saída JPG não possui assinatura JPEG válida.');
      if(name.endsWith('.webp')&&String.fromCharCode(...head.slice(0,4))!=='RIFF')issues.push('A saída WebP não possui assinatura RIFF válida.');
      if(name.endsWith('.json')){try{JSON.parse(await blob.text())}catch{issues.push('A saída JSON não pôde ser interpretada.')}}
    }catch(error){issues.push(`Não foi possível validar a assinatura: ${error?.message||error}`)}
    const run=runAtStart; if(run){const output={filename:detail.filename||'',size:blob.size,type:blob.type||'',issues,counted:false};run.outputs.push(output);if(issues.length)run.warnings.push(...issues);if(run.finished){const rt=toolRuntime(run.tool);rt.outputs+=1;rt.lastOutputSize=blob.size;rt.warnings+=issues.length;output.counted=true;persist()}}
    const tool=detail.tool||run?.tool||activeTool();
    if(tool==='compress'&&run?.inputSize&&blob.size>=run.inputSize&&/\.pdf$/i.test(name)){
      const warning=`A saída comprimida (${bytes(blob.size)}) não ficou menor que a entrada (${bytes(run.inputSize)}).`;
      if(!issues.includes(warning))issues.push(warning); if(run&&!run.warnings.includes(warning))run.warnings.push(warning);
    }
    if(issues.length)window.CentralPDFStable?.addLog?.('aviso',issues.join(' '),`validação de saída: ${detail.filename||tool}`);
    window.dispatchEvent(new CustomEvent('centralpdf-output-validated',{detail:{tool,filename:detail.filename,size:blob.size,ok:!issues.length,issues}}));
    return {ok:!issues.length,issues,size:blob.size};
  }

  function auditTool(key){
    const meta=registry[key];const cfg=catalog()[key];const cap=capabilities()[key]||{};const checks=[];
    const add=(name,ok,detail,warn=false)=>checks.push({name,ok:Boolean(ok),warn:Boolean(warn&&!ok),detail});
    add('Catálogo',!!cfg,cfg?'Registrada':'Ausente');
    add('Card inicial',!!document.querySelector(`.tool-card[data-tool="${CSS.escape(key)}"]`),'Card da página inicial');
    add('Barra lateral',!!document.querySelector(`.sidebar [data-tool="${CSS.escape(key)}"]`),'Atalho lateral');
    add('Processador',cap.handler===true,cap.handler?'Handler disponível':'Handler não identificado');
    add('Configuração',Boolean(cap.settingsLength>0),cap.settingsLength?`${cap.settingsLength} caracteres de ajustes`:'Sem painel de ajustes',cap.settingsLength===0);
    add('Entrada',Boolean(cfg?.accept),cfg?.accept||'Não definida');
    add('Saída',Boolean(cap.outputExt),cap.outputExt||'Não definida');
    const eng=engineReady(meta?.engine||'')||Boolean(cap.professional);add('Motor',eng,eng?`${meta?.engine||'Nativo'} disponível ou sob demanda`:`${meta?.engine||'Motor'} não identificado`,true);
    const runtime=toolRuntime(key);const total=runtime.runs||0;const successRate=total?Math.round((runtime.success/total)*100):null;
    add('Execução observada',true,total?`${total} execução(ões), ${successRate}% de sucesso`:'Ainda não executada nesta instalação; pronta para teste real');
    const errors=checks.filter(x=>!x.ok&&!x.warn).length;const warnings=checks.filter(x=>x.warn&&!x.ok).length;const score=Math.max(0,Math.round(((checks.length-errors-warnings*.45)/checks.length)*100));
    return {key,title:cfg?.title||key,meta,checks,errors,warnings,score,status:errors?'error':warnings?'warn':'ok',runtime};
  }
  function auditTools(){
    const items=Object.keys(registry).map(auditTool);const summary={total:items.length,ok:items.filter(x=>x.status==='ok').length,warn:items.filter(x=>x.status==='warn').length,error:items.filter(x=>x.status==='error').length,average:Math.round(items.reduce((s,x)=>s+x.score,0)/Math.max(1,items.length))};
    state.lastAudit={version:VERSION,time:new Date().toISOString(),summary,items};renderQualityPanel();return state.lastAudit;
  }

  function preflightHtml(tool){
    const report=preflight(tool);const meta=report.meta;if(!meta)return'';
    const checks=report.issues.length?report.issues.map(item=>`<li class="${item.level}"><span>${item.level==='error'?'×':'!'}</span>${esc(item.message)}</li>`).join(''):'<li class="ok"><span>✓</span>Pré-verificação sem bloqueios.</li>';
    return `<section id="cpToolPreflight" class="cp-tool-preflight"><header><div><small>Profundidade da ferramenta</small><strong>${esc(meta.level)} · ${esc(meta.category)}</strong></div><span>${esc(meta.engine)}</span></header><div class="cp-tool-preflight-grid"><div><small>Entrada</small><strong>${esc(meta.input)}</strong></div><div><small>Saída</small><strong>${esc(meta.output)}</strong></div><div><small>Lote</small><strong>${meta.batch?'Sim':'Não'}</strong></div><div><small>Arquivos</small><strong>${report.files}</strong></div></div><div class="cp-tool-depth">${meta.depth.map(item=>`<span>${esc(item)}</span>`).join('')}</div><ul>${checks}</ul><p><strong>Revisão:</strong> ${esc(meta.review)}</p></section>`;
  }
  function mountPreflight(){
    const host=$('#settingsContent');if(!host||$('#cpToolPreflight',host))return;host.insertAdjacentHTML('afterbegin',preflightHtml(activeTool()));
  }
  function refreshPreflight(){const current=$('#cpToolPreflight');if(current)current.outerHTML=preflightHtml(activeTool());else mountPreflight()}

  function filteredAuditItems(){
    const audit=state.lastAudit||auditTools();const q=state.query.trim().toLowerCase();return audit.items.filter(item=>(state.status==='all'||item.status===state.status)&&(!q||`${item.key} ${item.title} ${item.meta?.category||''} ${item.meta?.engine||''}`.toLowerCase().includes(q)));
  }
  function auditCard(item){
    const runtime=item.runtime||{};const avg=runtime.runs?Math.round(runtime.totalMs/runtime.runs):0;
    return `<article class="cp-tool-audit-card ${item.status}"><header><div><small>${esc(item.meta?.category||'Ferramenta')}</small><strong>${esc(item.title)}</strong></div><b>${item.score}%</b></header><div class="cp-tool-audit-meta"><span>${esc(item.meta?.engine||'Nativo')}</span><span>${esc(item.meta?.level||'Base')}</span><span>${runtime.runs||0} execução(ões)</span>${avg?`<span>média ${(avg/1000).toFixed(1)}s</span>`:''}</div><details><summary>${item.errors} falha(s) · ${item.warnings} aviso(s)</summary>${item.checks.map(check=>`<div class="cp-tool-audit-check ${check.ok?'ok':check.warn?'warn':'error'}"><span>${check.ok?'✓':check.warn?'!':'×'}</span><div><strong>${esc(check.name)}</strong><small>${esc(check.detail)}</small></div></div>`).join('')}</details></article>`;
  }
  function renderQualityPanel(){
    const list=$('#cpToolAuditList');if(!list)return;const audit=state.lastAudit||auditTools();const items=filteredAuditItems();const summary=$('#cpToolAuditSummary');if(summary)summary.innerHTML=`<strong>${audit.summary.average}%</strong> média · <strong>${audit.summary.ok}</strong> prontas · <strong>${audit.summary.warn}</strong> com aviso · <strong>${audit.summary.error}</strong> com falha`;
    list.innerHTML=items.length?items.map(auditCard).join(''):'<div class="cp10-empty">Nenhuma ferramenta corresponde aos filtros.</div>';
  }
  function mountQualityPanel(){
    const body=$('#cp10Quality .cp10-dialog-body');if(!body||$('#cpToolAuditSection'))return false;
    const errorLog=$('.cp10-error-log',body);const section=document.createElement('section');section.id='cpToolAuditSection';section.className='cp-tool-audit-section';section.innerHTML=`<div class="cp-tool-audit-head"><div><strong>Auditoria das 34 ferramentas</strong><small>Valida catálogo, interface, processadores, motores, entradas, saídas e histórico local de execução.</small></div><div><button id="cpToolAuditRun" class="cp10-button primary" type="button">Auditar ferramentas</button><button id="cpToolAuditDownload" class="cp10-button" type="button">Baixar auditoria</button></div></div><div class="cp-tool-audit-controls"><input id="cpToolAuditSearch" type="search" placeholder="Buscar ferramenta, categoria ou motor"><select id="cpToolAuditFilter"><option value="all">Todos os estados</option><option value="ok">Prontas</option><option value="warn">Com aviso</option><option value="error">Com falha</option></select><div id="cpToolAuditSummary"></div></div><div id="cpToolAuditList" class="cp-tool-audit-list"></div>`;
    body.insertBefore(section,errorLog||null);
    $('#cpToolAuditRun').addEventListener('click',()=>{auditTools();window.CentralPDFStable?.announce?.('Auditoria das 34 ferramentas concluída')});
    $('#cpToolAuditDownload').addEventListener('click',()=>{const report=auditTools();const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`CentralPDF_${VERSION}_Auditoria_Ferramentas_${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500)});
    $('#cpToolAuditSearch').addEventListener('input',event=>{state.query=event.target.value;renderQualityPanel()});
    $('#cpToolAuditFilter').addEventListener('change',event=>{state.status=event.target.value;renderQualityPanel()});
    auditTools();return true;
  }

  function init(){
    window.addEventListener('centralpdf-tool-selected',()=>setTimeout(()=>{mountPreflight();refreshPreflight()},0));
    window.addEventListener('centralpdf-files-changed',refreshPreflight);
    window.addEventListener('centralpdf-result',event=>validateOutput(event.detail||{}));
    mountPreflight();
    if(!mountQualityPanel()){
      const observer=new MutationObserver(()=>{if(mountQualityPanel())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true});
    }
    window.CentralPDFToolQuality={version:VERSION,registry,getRegistry:()=>JSON.parse(JSON.stringify(registry)),validateFiles,preflight,beginRun,finishRun,failRun,validateOutput,auditTools,getLastAudit:()=>state.lastAudit,getRuntimeStats:()=>JSON.parse(JSON.stringify(state.runs)),refreshPreflight,mountQualityPanel};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
