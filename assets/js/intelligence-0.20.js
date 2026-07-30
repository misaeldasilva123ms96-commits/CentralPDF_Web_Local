(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const state = { lastByTool: {}, cache: new Map() };
  const STOPWORDS = new Set(`a o as os um uma uns umas de da do das dos e em no na nos nas para por com sem sob sobre entre que se ao aos à às ou como mais menos muito muita muitos muitas já ainda também não sim ser estar ter foi foram é são era eram seu sua seus suas este esta estes estas esse essa esses essas aquele aquela aqueles aquelas eu você ele ela nós eles elas documento documentos página páginas arquivo arquivos pdf conforme mediante através onde quando qual quais`.split(/\s+/));
  const TYPE_RULES = [
    ['aditivo', /\b(aditivo|termo aditivo|prorroga(?:ção|r)|acréscimo|supressão)\b/i],
    ['contrato', /\b(contrato|contratante|contratada|objeto contratual|vigência contratual)\b/i],
    ['nota_fiscal', /\b(nota fiscal|nf-e|nfs-e|danfe|chave de acesso|valor total da nota)\b/i],
    ['cnd', /\b(certidão|regularidade fiscal|negativa de débitos|efeitos de negativa|fgts|trabalhista)\b/i],
    ['medicao', /\b(medição|boletim de medição|serviços executados|competência)\b/i],
    ['relatorio', /\b(relatório|resumo executivo|achados|conclusão|parecer)\b/i],
    ['atestado', /\b(atestado|afastamento|cid|declaro para os devidos fins)\b/i],
    ['proposta', /\b(proposta comercial|orçamento|validade da proposta|preço unitário)\b/i],
    ['comprovante', /\b(comprovante|pagamento|autenticação bancária|transferência|pix)\b/i],
    ['formulario', /\b(formulário|preencher|campo obrigatório|solicitação)\b/i]
  ];

  function mount(tool) {
    const ids = tool === 'documentAssistant'
      ? ['intelligenceQuestion','intelligenceSummarySize','intelligenceFocus','intelligenceEvidenceCount','intelligenceIncludeSections','intelligenceIncludePatterns']
      : tool === 'structuredExtraction'
        ? ['extractionProfile','extractionIncludePages','extractionGroupByFile','extractionExportXlsx','extractionCustomRegex']
        : tool === 'documentAudit'
          ? ['auditProfile','auditPaymentDate','auditLaunchDate','auditDueFallback','auditCompareAmounts','auditCompareCodes','auditCompareCnpj','auditCheckCnd']
          : ['renameTemplate','renameIncludeCopies','renameDetectDuplicates','renameDetectBlank','renameUseDate','renameMaxLength'];
    ids.forEach(id => {
      const el = $('#' + id);
      if (el && !el.dataset.cp20) {
        el.dataset.cp20 = '1';
        el.addEventListener('input', () => updatePlan(tool, window.CentralPDFApp?.getFiles?.() || []));
        el.addEventListener('change', () => updatePlan(tool, window.CentralPDFApp?.getFiles?.() || []));
      }
    });
    updatePlan(tool, window.CentralPDFApp?.getFiles?.() || []);
  }

  async function updatePlan(tool, files) {
    const box = $('#' + ({ documentAssistant:'intelligencePlan', structuredExtraction:'extractionPlan', documentAudit:'auditPlan', classifyRename:'renamePlan' }[tool] || 'intelligencePlan'));
    if (!box) return;
    if (!files.length) {
      box.innerHTML = `<strong>Adicione documentos para começar</strong><p>O processamento usa o texto selecionável do PDF. Digitalizações sem texto devem passar pelo OCR primeiro.</p>`;
      return;
    }
    const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    box.innerHTML = `<strong>${files.length} documento(s) selecionado(s)</strong><p>${formatBytes(totalSize)} no total. A análise será local, com evidências por arquivo e página.</p>`;
  }

  function normalize(text) {
    return String(text || '').normalize('NFKC').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function normalizeKey(text) {
    return normalize(text).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function words(text) {
    return normalizeKey(text).split(/\s+/).filter(word => word.length > 2 && !STOPWORDS.has(word));
  }
  function sentences(text) {
    const compact = String(text || '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
    return compact.split(/(?<=[.!?;:])\s+|\n+/).map(normalize).filter(item => item.length >= 24);
  }
  function baseName(name) {
    return String(name || 'documento').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 90) || 'documento';
  }
  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B','KB','MB','GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
  }
  function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
  function blobJson(value) { return new Blob([JSON.stringify(value, null, 2)], { type:'application/json' }); }
  function blobText(value, type='text/plain') { return new Blob(['\ufeff', value], { type:`${type};charset=utf-8` }); }
  function dateIsoFromBr(text) {
    const match = String(text || '').match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
    if (!match) return '';
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  }
  function parseMoney(value) {
    const raw = String(value || '').replace(/R\$\s*/i,'').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,'');
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }
  function toBrMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function unique(items) { return [...new Set(items.filter(Boolean))]; }
  function hashString(value) {
    let hash = 2166136261;
    const input = String(value || '');
    for (let i=0;i<input.length;i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash,16777619); }
    return (hash >>> 0).toString(16).padStart(8,'0');
  }

  async function extractDocument(file, options = {}) {
    const cacheKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (state.cache.has(cacheKey) && !options.visualAudit) return state.cache.get(cacheKey);
    if (!window.pdfjsLib) throw new Error('O motor PDF.js não foi carregado.');
    const pdf = await window.pdfjsLib.getDocument({ data:new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    try {
      for (let number=1; number<=pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const items = content.items.map(item => ({
          text: normalize(item.str || ''), x:Number(item.transform?.[4] || 0), y:Number(item.transform?.[5] || 0), width:Number(item.width || 0), height:Number(item.height || 0)
        })).filter(item => item.text);
        const byLine = new Map();
        items.forEach(item => {
          const key = Math.round(item.y / 3) * 3;
          if (!byLine.has(key)) byLine.set(key, []);
          byLine.get(key).push(item);
        });
        const lines = [...byLine.entries()].sort((a,b)=>b[0]-a[0]).map(([,line])=>line.sort((a,b)=>a.x-b.x).map(item=>item.text).join(' ')).map(normalize).filter(Boolean);
        const text = lines.join('\n');
        let visualHash = '';
        let visualBlank = null;
        if (options.visualAudit && text.length < 20) {
          const vp = page.getViewport({ scale:Math.min(0.35, 420 / Math.max(page.getViewport({scale:1}).width,page.getViewport({scale:1}).height)) });
          const canvas = document.createElement('canvas'); canvas.width=Math.max(1,Math.ceil(vp.width)); canvas.height=Math.max(1,Math.ceil(vp.height));
          const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:ctx,viewport:vp}).promise;
          const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let dark=0,total=0;const sample=[];
          const step=Math.max(1,Math.floor(Math.max(canvas.width,canvas.height)/64));
          for(let y=0;y<canvas.height;y+=step)for(let x=0;x<canvas.width;x+=step){const i=(y*canvas.width+x)*4;const lum=(data[i]+data[i+1]+data[i+2])/3;sample.push(lum<245?'1':'0');if(lum<235)dark++;total++;}
          visualBlank=total ? dark/total < 0.005 : true; visualHash=hashString(sample.join(''));
        }
        pages.push({ number, text, lines, charCount:text.length, visualHash, visualBlank });
        options.onPage?.(number,pdf.numPages);
      }
    } finally { await pdf.destroy(); }
    const fullText = pages.map(page => page.text).join('\n\n');
    const result = { fileName:file.name, size:file.size, pageCount:pages.length, pages, fullText, selectableCharacters:fullText.length, needsOcr:fullText.length < Math.max(40,pages.length*10) };
    if (!options.visualAudit) state.cache.set(cacheKey,result);
    return result;
  }

  function detectPatterns(text) {
    const source = String(text || '');
    const collect = regex => unique([...source.matchAll(regex)].map(match => normalize(match[0])));
    const values = collect(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2,4})|\b\d{1,3}(?:\.\d{3})+,\d{2,4}\b/g);
    const dates = collect(/\b(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:\d{4}|\d{2})\b/g);
    const cnpjs = collect(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g);
    const cpfs = collect(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g).filter(item => !cnpjs.includes(item));
    const emails = collect(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g);
    const invoiceNumbers = unique([
      ...[...source.matchAll(/(?:nota\s+fiscal|nf(?:-e|s-e)?|n[º°o]\.?)[\s:#-]*(\d{1,12})/gi)].map(m=>m[1]),
      ...[...source.matchAll(/\b(?:série|serie)\s*[:#-]?\s*(\d{1,6})\b/gi)].map(m=>`Série ${m[1]}`)
    ]);
    const contractCodes = unique([...source.matchAll(/\b(?:contrato|processo|convênio|convenio|instrumento)\s*(?:n[º°o]\.?|número|numero)?\s*[:#-]?\s*([\d./-]{4,24})/gi)].map(m=>m[1]));
    const codes = unique([...source.matchAll(/\b(?:código|codigo|item|procedimento)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,24})/gi)].map(m=>m[1]));
    const validityDates = unique([...source.matchAll(/(?:válid[ao]|validade|vencimento|vigência|vigencia)(?:\s+até|\s*:|\s*-)?\s*((?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:\d{4}|\d{2}))/gi)].map(m=>m[1]));
    const cndStatus = /positiva\s+com\s+efeitos?\s+de\s+negativa/i.test(source) ? 'positiva_com_efeito_negativa' : /certid[aã]o\s+negativa|situa[cç][aã]o\s+regular|regularidade/i.test(source) ? 'negativa_ou_regular' : /certid[aã]o\s+positiva|situa[cç][aã]o\s+irregular/i.test(source) ? 'positiva_ou_irregular' : '';
    return { cnpjs, cpfs, dates, values, emails, invoiceNumbers, contractCodes, codes, validityDates, cndStatus };
  }

  function classify(text, fileName='') {
    const sample = `${fileName}\n${String(text || '').slice(0,16000)}`;
    const fileKey = normalizeKey(fileName);
    const nameHints = { aditivo:/aditivo/, contrato:/contrato/, nota_fiscal:/nota fiscal|nfe|nfse|danfe/, cnd:/cnd|certidao|fgts/, medicao:/medicao/, relatorio:/relatorio/, atestado:/atestado/, proposta:/proposta|orcamento/, comprovante:/comprovante/, formulario:/formulario/ };
    const scores = TYPE_RULES.map(([type,regex]) => {
      const hits = (sample.match(new RegExp(regex.source,regex.flags.includes('g')?regex.flags:regex.flags+'g'))||[]).length;
      return [type, hits + (nameHints[type]?.test(fileKey) ? 3 : 0)];
    });
    scores.sort((a,b)=>b[1]-a[1]);
    return { type:scores[0][1] ? scores[0][0] : 'documento', confidence:Math.min(99, 45 + scores[0][1]*12), alternatives:scores.slice(1,4).filter(item=>item[1]).map(item=>item[0]) };
  }

  function findSections(document) {
    const output=[];
    document.pages.forEach(page => page.lines.forEach((line,index) => {
      const compact=normalize(line); if(compact.length<4||compact.length>140)return;
      const isClause=/^(cl[aá]usula|cap[ií]tulo|se[cç][aã]o|anexo|item)\b/i.test(compact);
      const isNumbered=/^\d+(?:\.\d+){0,3}[.)-]?\s+\p{L}/u.test(compact);
      const letters=compact.replace(/[^\p{L}]/gu,''); const upper=letters.length>4&&letters===letters.toLocaleUpperCase('pt-BR');
      if(isClause||isNumbered||upper) output.push({page:page.number,title:compact,line:index+1});
    }));
    return output.slice(0,160);
  }

  function summarize(document, maxSentences=8, focus='general') {
    const all=[];
    document.pages.forEach(page => sentences(page.text).forEach((sentence,index)=>all.push({sentence,page:page.number,index})));
    if(!all.length)return[];
    const frequency=new Map();all.forEach(item=>words(item.sentence).forEach(word=>frequency.set(word,(frequency.get(word)||0)+1)));
    const focusTerms={contract:['contrato','objeto','vigencia','valor','obrigacao','rescisao','reajuste'],fiscal:['nota','valor','imposto','vencimento','cnpj','pagamento'],cnd:['certidao','validade','negativa','regularidade','vencimento'],audit:['divergencia','valor','codigo','data','cnpj','total']}[focus]||[];
    return all.map(item=>{
      const ws=words(item.sentence);const raw=ws.reduce((sum,w)=>sum+(frequency.get(w)||0),0)/(Math.sqrt(ws.length||1));
      const focusBonus=focusTerms.reduce((sum,term)=>sum+(normalizeKey(item.sentence).includes(term)?4:0),0);
      const positionBonus=item.index<2?2:0;
      return {...item,score:raw+focusBonus+positionBonus};
    }).sort((a,b)=>b.score-a.score).slice(0,maxSentences).sort((a,b)=>a.page-b.page||a.index-b.index);
  }

  function answerQuestion(document, question, count=6) {
    const qWords=words(question); if(!qWords.length)return[];
    const phrases=[]; document.pages.forEach(page=>sentences(page.text).forEach(sentence=>phrases.push({page:page.number,sentence})));
    return phrases.map(item=>{
      const textKey=normalizeKey(item.sentence);const sWords=new Set(words(item.sentence));let score=0;
      qWords.forEach(word=>{if(sWords.has(word))score+=5;else if(textKey.includes(word))score+=2;});
      const exact=normalizeKey(question);if(exact.length>8&&textKey.includes(exact))score+=20;
      return {...item,score};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,count);
  }

  function assistantHtml(payload) {
    const docs=payload.documents;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Assistente documental</title><style>${reportCss()}</style></head><body><header><h1>Assistente documental local</h1><p>Relatório criado em ${esc(new Date(payload.createdAt).toLocaleString('pt-BR'))}. As respostas são extrativas e devem ser conferidas nas páginas indicadas.</p></header>${docs.map(doc=>`<section class="document"><h2>${esc(doc.fileName)}</h2><div class="metrics"><div><b>${doc.pageCount}</b><span>páginas</span></div><div><b>${doc.selectableCharacters}</b><span>caracteres</span></div><div><b>${esc(doc.classification.type)}</b><span>classificação</span></div></div>${doc.needsOcr?'<div class="warning"><b>OCR recomendado</b><p>Há pouco texto selecionável. A análise pode estar incompleta.</p></div>':''}<h3>Resumo por evidências</h3><ol>${doc.summary.map(item=>`<li>${esc(item.sentence)} <small>Página ${item.page}</small></li>`).join('')||'<li>Nenhum texto suficiente para resumir.</li>'}</ol>${payload.question?`<h3>Pergunta</h3><blockquote>${esc(payload.question)}</blockquote><div class="evidence">${doc.answers.map(item=>`<article><b>Página ${item.page}</b><p>${highlight(item.sentence,payload.question)}</p></article>`).join('')||'<p>Nenhuma passagem com termos suficientes foi encontrada.</p>'}</div>`:''}<h3>Dados localizados</h3>${patternsHtml(doc.patterns)}${payload.includeSections?`<h3>Seções e cláusulas detectadas</h3><table><thead><tr><th>Página</th><th>Título</th></tr></thead><tbody>${doc.sections.map(item=>`<tr><td>${item.page}</td><td>${esc(item.title)}</td></tr>`).join('')||'<tr><td colspan="2">Nenhuma estrutura detectada.</td></tr>'}</tbody></table>`:''}</section>`).join('')}</body></html>`;
  }
  function reportCss(){return`body{font:14px/1.55 Arial,sans-serif;color:#182033;max-width:1100px;margin:32px auto;padding:0 24px}h1{font-size:30px;margin-bottom:4px}h2{font-size:23px;border-bottom:2px solid #ddd;padding-bottom:8px}h3{margin-top:24px}.document{margin:36px 0}.metrics{display:flex;gap:10px;flex-wrap:wrap}.metrics div{border:1px solid #d8dce5;border-radius:10px;padding:12px 16px;min-width:120px}.metrics b{display:block;font-size:20px}.metrics span,small{color:#667085}.warning{background:#fff7e6;border:1px solid #f0c36b;border-radius:10px;padding:12px 16px;margin:16px 0}.warning p{margin:3px 0}.evidence{display:grid;gap:10px}.evidence article{border-left:4px solid #7655d7;background:#f7f5ff;padding:10px 14px}.evidence p{margin:4px 0}mark{background:#fff09b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}blockquote{margin-left:0;background:#f4f5f8;padding:12px 15px;border-radius:8px}.tag{display:inline-block;padding:3px 8px;background:#eef0f5;border-radius:999px;margin:2px}`}
  function highlight(text,question){let output=esc(text);words(question).slice(0,12).forEach(word=>{const re=new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');output=output.replace(re,'<mark>$1</mark>')});return output}
  function patternsHtml(patterns){const rows=[['CNPJ',patterns.cnpjs],['CPF',patterns.cpfs],['Datas',patterns.dates],['Valores',patterns.values],['Notas fiscais',patterns.invoiceNumbers],['Contratos/processos',patterns.contractCodes],['Códigos',patterns.codes],['Validades',patterns.validityDates],['E-mails',patterns.emails]];return rows.map(([label,items])=>`<p><b>${label}:</b> ${items.length?items.map(item=>`<span class="tag">${esc(item)}</span>`).join(' '):'—'}</p>`).join('')}

  function extractionRows(document) {
    const rows=[];
    document.pages.forEach(page=>{
      const p=detectPatterns(page.text);
      const push=(type,values)=>values.forEach(value=>rows.push({arquivo:document.fileName,pagina:page.number,tipo:type,valor:value}));
      push('CNPJ',p.cnpjs);push('CPF',p.cpfs);push('Data',p.dates);push('Valor',p.values);push('Nota fiscal',p.invoiceNumbers);push('Contrato/processo',p.contractCodes);push('Código',p.codes);push('Validade',p.validityDates);push('E-mail',p.emails);if(p.cndStatus)push('Situação CND',[p.cndStatus]);
    });
    return rows;
  }

  function extractionHtml(payload){return`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Extração estruturada</title><style>${reportCss()}</style></head><body><h1>Extração estruturada</h1><p>${payload.rows.length} ocorrência(s) em ${payload.documents.length} documento(s).</p><table><thead><tr><th>Arquivo</th><th>Página</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${payload.rows.map(row=>`<tr><td>${esc(row.arquivo)}</td><td>${row.pagina}</td><td>${esc(row.tipo)}</td><td>${esc(row.valor)}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum padrão encontrado.</td></tr>'}</tbody></table></body></html>`}

  function auditDocuments(documents, settings) {
    const findings=[];
    const allCnpj=new Map(),allContracts=new Map(),allValues=[];
    documents.forEach(doc=>{
      const patterns=detectPatterns(doc.fullText);doc.patterns=patterns;
      patterns.cnpjs.forEach(value=>{if(!allCnpj.has(value))allCnpj.set(value,[]);allCnpj.get(value).push(doc.fileName)});
      patterns.contractCodes.forEach(value=>{if(!allContracts.has(value))allContracts.set(value,[]);allContracts.get(value).push(doc.fileName)});
      patterns.values.forEach(value=>{const number=parseMoney(value);if(number!==null)allValues.push({file:doc.fileName,value,number})});
      if(settings.checkCnd && classify(doc.fullText,doc.fileName).type==='cnd'){
        if(!patterns.cndStatus)findings.push({severity:'medium',file:doc.fileName,title:'Situação da certidão não identificada',detail:'Não foi possível confirmar se a certidão é negativa ou positiva com efeito de negativa.'});
        if(patterns.cndStatus==='positiva_ou_irregular')findings.push({severity:'high',file:doc.fileName,title:'Certidão positiva ou situação irregular',detail:'A redação encontrada não atende ao padrão de certidão negativa ou positiva com efeito de negativa.'});
        const payment=settings.paymentDate?new Date(settings.paymentDate+'T12:00:00'):null;
        const expiry=patterns.validityDates.map(dateIsoFromBr).filter(Boolean).sort().pop();
        if(payment&&expiry&&new Date(expiry+'T12:00:00')<payment)findings.push({severity:'high',file:doc.fileName,title:'Certidão vence antes do pagamento',detail:`Validade localizada: ${expiry.split('-').reverse().join('/')}; pagamento informado: ${settings.paymentDate.split('-').reverse().join('/')}.`});
      }
    });
    if(settings.compareCnpj && allCnpj.size>1)findings.push({severity:'medium',file:'Conjunto',title:'Mais de um CNPJ localizado',detail:[...allCnpj.entries()].map(([value,files])=>`${value}: ${files.join(', ')}`).join(' | ')});
    if(settings.compareCodes){for(const [code,files] of allContracts.entries())if(files.length===1&&documents.length>1)findings.push({severity:'low',file:files[0],title:'Código contratual aparece em apenas um documento',detail:`${code} não foi localizado nos demais arquivos.`})}
    if(settings.compareAmounts && allValues.length){
      const groups=new Map();allValues.forEach(item=>{const key=item.number.toFixed(2);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)});
      const significant=[...groups.entries()].filter(([,items])=>items.length>=2).sort((a,b)=>b[1].length-a[1].length).slice(0,10);
      if(!significant.length)findings.push({severity:'low',file:'Conjunto',title:'Nenhum valor coincidente entre documentos',detail:'Os valores monetários encontrados não se repetem entre os arquivos. Confira se deveriam estar vinculados.'});
    }
    if(settings.launchDate && settings.paymentDate && settings.dueFallback){
      const launch=new Date(settings.launchDate+'T12:00:00'),due=new Date(launch);due.setDate(due.getDate()+8);const payment=new Date(settings.paymentDate+'T12:00:00');
      if(payment>due)findings.push({severity:'medium',file:'Regra informada',title:'Pagamento posterior ao vencimento calculado',detail:`Sem vencimento expresso, a regra de 8 dias resultaria em ${due.toLocaleDateString('pt-BR')}.`});
    }
    if(!findings.length)findings.push({severity:'info',file:'Conjunto',title:'Nenhuma divergência automática relevante',detail:'As regras selecionadas não produziram alertas. Isso não substitui a conferência humana.'});
    return { findings, cnpjMatrix:[...allCnpj.entries()].map(([value,files])=>({value,files})), contractMatrix:[...allContracts.entries()].map(([value,files])=>({value,files})), values:allValues };
  }

  function auditHtml(payload){const sev={high:'Alta',medium:'Média',low:'Baixa',info:'Informação'};return`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Auditoria documental</title><style>${reportCss()}.sev-high{border-left-color:#c62828!important}.sev-medium{border-left-color:#ef8c00!important}.sev-low{border-left-color:#3867d6!important}</style></head><body><h1>Auditoria documental local</h1><p>${payload.documents.length} documento(s) analisado(s). Regras automáticas produzem indícios, não conclusões jurídicas ou contábeis.</p><div class="evidence">${payload.audit.findings.map(item=>`<article class="sev-${item.severity}"><b>${esc(sev[item.severity]||item.severity)} · ${esc(item.title)}</b><p>${esc(item.file)} — ${esc(item.detail)}</p></article>`).join('')}</div><h2>Matriz de CNPJ</h2><table><thead><tr><th>CNPJ</th><th>Arquivos</th></tr></thead><tbody>${payload.audit.cnpjMatrix.map(item=>`<tr><td>${esc(item.value)}</td><td>${esc(item.files.join(', '))}</td></tr>`).join('')||'<tr><td colspan="2">Nenhum CNPJ localizado.</td></tr>'}</tbody></table><h2>Códigos de contrato/processo</h2><table><thead><tr><th>Código</th><th>Arquivos</th></tr></thead><tbody>${payload.audit.contractMatrix.map(item=>`<tr><td>${esc(item.value)}</td><td>${esc(item.files.join(', '))}</td></tr>`).join('')||'<tr><td colspan="2">Nenhum código localizado.</td></tr>'}</tbody></table></body></html>`}

  function buildSuggestedName(document, settings) {
    const patterns=detectPatterns(document.fullText),classification=classify(document.fullText,document.fileName);
    const firstDate=patterns.dates[0]||'';const iso=dateIsoFromBr(firstDate);const dateToken=iso||new Date().toISOString().slice(0,10);
    const tokens={tipo:classification.type.toUpperCase(),cnpj:(patterns.cnpjs[0]||'SEM_CNPJ').replace(/\D/g,''),data:dateToken,numero:patterns.invoiceNumbers[0]||patterns.contractCodes[0]||'SEM_NUMERO',original:baseName(document.fileName)};
    let name=(settings.template||'{tipo}_{data}_{numero}').replace(/\{(tipo|cnpj|data|numero|original)\}/g,(_,key)=>tokens[key]);
    name=name.replace(/[^\p{L}\p{N}._-]+/gu,'_').replace(/_+/g,'_').replace(/^_|_$/g,'').slice(0,settings.maxLength||100)||baseName(document.fileName);
    return `${name}.pdf`;
  }

  function classifyHtml(payload){return`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Classificação e renomeação</title><style>${reportCss()}</style></head><body><h1>Classificar e renomear</h1><table><thead><tr><th>Arquivo original</th><th>Tipo</th><th>Confiança</th><th>Nome sugerido</th><th>Páginas possíveis em branco</th><th>Duplicadas</th></tr></thead><tbody>${payload.documents.map(doc=>`<tr><td>${esc(doc.fileName)}</td><td>${esc(doc.classification.type)}</td><td>${doc.classification.confidence}%</td><td>${esc(doc.suggestedName)}</td><td>${esc(doc.blankPages.join(', ')||'—')}</td><td>${esc(doc.duplicatePages.map(pair=>`${pair[0]}=${pair[1]}`).join(', ')||'—')}</td></tr>`).join('')}</tbody></table><div class="warning"><b>Revisão necessária</b><p>Páginas sem texto podem ser digitalizações, não páginas vazias. Confira os nomes e as páginas antes de substituir os arquivos originais.</p></div></body></html>`}

  async function process(tool,{files,progress,cancelled}) {
    if(!files?.length)throw new Error('Adicione pelo menos um PDF.');if(!window.JSZip)throw new Error('JSZip não foi carregado.');
    const visualAudit=tool==='classifyRename'&&($('#renameDetectBlank')?.checked||$('#renameDetectDuplicates')?.checked);
    const docs=[];let completedPages=0;let totalEstimate=Math.max(files.length,1);
    for(let index=0;index<files.length;index++){
      if(cancelled?.())throw new Error('Operação cancelada pelo usuário.');
      const doc=await extractDocument(files[index],{visualAudit,onPage:(page,total)=>{progress?.(Math.min(78,Math.round(((index+(page/total))/files.length)*78)));}});docs.push(doc);completedPages+=doc.pageCount;totalEstimate+=doc.pageCount;await new Promise(r=>setTimeout(r,0));
    }
    const zip=new window.JSZip();let payload;
    if(tool==='documentAssistant'){
      const question=normalize($('#intelligenceQuestion')?.value||'');const size=Number($('#intelligenceSummarySize')?.value||8),focus=$('#intelligenceFocus')?.value||'general',evidence=Number($('#intelligenceEvidenceCount')?.value||6),includeSections=$('#intelligenceIncludeSections')?.checked!==false,includePatterns=$('#intelligenceIncludePatterns')?.checked!==false;
      const processed=docs.map(doc=>({...doc,classification:classify(doc.fullText,doc.fileName),summary:summarize(doc,size,focus),answers:question?answerQuestion(doc,question,evidence):[],sections:includeSections?findSections(doc):[],patterns:includePatterns?detectPatterns(doc.fullText):detectPatterns('')}));
      payload={version:'1.0',tool,createdAt:new Date().toISOString(),question,focus,includeSections,documents:processed};zip.file('relatorio_assistente.html',assistantHtml(payload));zip.file('dados_assistente.json',JSON.stringify(payload,null,2));zip.file('texto_extraido.txt',processed.map(doc=>`===== ${doc.fileName} =====\n${doc.pages.map(page=>`--- PÁGINA ${page.number} ---\n${page.text}`).join('\n\n')}`).join('\n\n'));
    } else if(tool==='structuredExtraction'){
      const rows=docs.flatMap(extractionRows);const custom=$('#extractionCustomRegex')?.value?.trim();if(custom){try{const regex=new RegExp(custom,'gimu');docs.forEach(doc=>doc.pages.forEach(page=>[...page.text.matchAll(regex)].forEach(match=>rows.push({arquivo:doc.fileName,pagina:page.number,tipo:'Expressão personalizada',valor:match[0]}))))}catch(error){throw new Error(`Expressão regular inválida: ${error.message}`)}}
      payload={version:'1.0',tool,createdAt:new Date().toISOString(),documents:docs.map(doc=>({fileName:doc.fileName,pageCount:doc.pageCount,needsOcr:doc.needsOcr})),rows};const csv=['Arquivo,Página,Tipo,Valor',...rows.map(row=>[row.arquivo,row.pagina,row.tipo,row.valor].map(csvCell).join(','))].join('\r\n');zip.file('extracao_estruturada.csv',blobText(csv,'text/csv'));zip.file('extracao_estruturada.json',JSON.stringify(payload,null,2));zip.file('relatorio_extracao.html',extractionHtml(payload));
    } else if(tool==='documentAudit'){
      const settings={profile:$('#auditProfile')?.value||'general',paymentDate:$('#auditPaymentDate')?.value||'',launchDate:$('#auditLaunchDate')?.value||'',dueFallback:$('#auditDueFallback')?.checked!==false,compareAmounts:$('#auditCompareAmounts')?.checked!==false,compareCodes:$('#auditCompareCodes')?.checked!==false,compareCnpj:$('#auditCompareCnpj')?.checked!==false,checkCnd:$('#auditCheckCnd')?.checked!==false};
      const audit=auditDocuments(docs,settings);payload={version:'1.0',tool,createdAt:new Date().toISOString(),settings,documents:docs.map(doc=>({fileName:doc.fileName,pageCount:doc.pageCount,classification:classify(doc.fullText,doc.fileName),patterns:doc.patterns,needsOcr:doc.needsOcr})),audit};zip.file('relatorio_auditoria.html',auditHtml(payload));zip.file('auditoria_documental.json',JSON.stringify(payload,null,2));const csv=['Severidade,Arquivo,Achado,Detalhe',...audit.findings.map(item=>[item.severity,item.file,item.title,item.detail].map(csvCell).join(','))].join('\r\n');zip.file('achados_auditoria.csv',blobText(csv,'text/csv'));
    } else {
      const settings={template:$('#renameTemplate')?.value||'{tipo}_{data}_{numero}',includeCopies:$('#renameIncludeCopies')?.checked!==false,detectDuplicates:$('#renameDetectDuplicates')?.checked!==false,detectBlank:$('#renameDetectBlank')?.checked!==false,maxLength:Number($('#renameMaxLength')?.value||100)};
      const processed=[];
      for(let i=0;i<docs.length;i++){
        const doc=docs[i],classification=classify(doc.fullText,doc.fileName),blankPages=[],duplicatePages=[],seen=new Map();
        doc.pages.forEach(page=>{if(settings.detectBlank&&((page.charCount<8&&page.visualBlank===true)||(page.charCount===0&&page.visualBlank===null)))blankPages.push(page.number);if(settings.detectDuplicates){const signature=page.charCount>=8?`t:${hashString(normalizeKey(page.text))}`:page.visualHash?`v:${page.visualHash}`:'';if(signature){if(seen.has(signature))duplicatePages.push([seen.get(signature),page.number]);else seen.set(signature,page.number)}}});
        const suggestedName=buildSuggestedName(doc,settings);const item={fileName:doc.fileName,pageCount:doc.pageCount,classification,suggestedName,blankPages,duplicatePages,needsOcr:doc.needsOcr};processed.push(item);if(settings.includeCopies)zip.file(`arquivos_renomeados/${suggestedName}`,files[i]);
      }
      payload={version:'1.0',tool,createdAt:new Date().toISOString(),settings,documents:processed};zip.file('relatorio_classificacao.html',classifyHtml(payload));zip.file('classificacao_renomeacao.json',JSON.stringify(payload,null,2));const csv=['Original,Tipo,Confiança,Nome sugerido,Páginas possíveis em branco,Páginas duplicadas',...processed.map(doc=>[doc.fileName,doc.classification.type,doc.classification.confidence,doc.suggestedName,doc.blankPages.join('|'),doc.duplicatePages.map(pair=>pair.join('=')).join('|')].map(csvCell).join(','))].join('\r\n');zip.file('classificacao_renomeacao.csv',blobText(csv,'text/csv'));
    }
    zip.file('LEIA-ME.txt','Relatórios gerados localmente pela Central PDF 1.0. Resultados automáticos devem ser conferidos nas páginas originais. PDFs sem texto selecionável devem passar pelo OCR antes da análise.');
    progress?.(86);const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},meta=>progress?.(86+Math.round(meta.percent*.14)));state.lastByTool[tool]=payload;renderLast(tool,payload);return{outputs:[{blob,filename:`${tool}_${new Date().toISOString().slice(0,10)}.zip`}],message:messageFor(tool,payload)};
  }

  function renderLast(tool,payload){const id={documentAssistant:'intelligenceLastSummary',structuredExtraction:'extractionLastSummary',documentAudit:'auditLastSummary',classifyRename:'renameLastSummary'}[tool];const box=$('#'+id);if(!box)return;box.classList.remove('hidden');if(tool==='documentAssistant'){const evidence=payload.documents.reduce((sum,doc)=>sum+doc.answers.length,0);box.innerHTML=`<strong>Análise concluída</strong><p>${payload.documents.length} documento(s), ${evidence} evidência(s) para a pergunta e ${payload.documents.filter(doc=>doc.needsOcr).length} arquivo(s) com OCR recomendado.</p>`}else if(tool==='structuredExtraction'){box.innerHTML=`<strong>Extração concluída</strong><p>${payload.rows.length} ocorrência(s) estruturadas.</p>`}else if(tool==='documentAudit'){const high=payload.audit.findings.filter(item=>item.severity==='high').length;box.innerHTML=`<strong>Auditoria concluída</strong><p>${payload.audit.findings.length} achado(s), sendo ${high} de severidade alta.</p>`}else{const blank=payload.documents.reduce((sum,doc)=>sum+doc.blankPages.length,0),dup=payload.documents.reduce((sum,doc)=>sum+doc.duplicatePages.length,0);box.innerHTML=`<strong>Classificação concluída</strong><p>${payload.documents.length} nome(s) sugerido(s), ${blank} possível(is) página(s) em branco e ${dup} duplicidade(s).</p>`}}
  function messageFor(tool,payload){if(tool==='documentAssistant')return`Análise concluída para ${payload.documents.length} documento(s).`;if(tool==='structuredExtraction')return`${payload.rows.length} ocorrência(s) extraídas.`;if(tool==='documentAudit')return`Auditoria concluída com ${payload.audit.findings.length} achado(s).`;return`${payload.documents.length} documento(s) classificados e renomeados.`}

  window.CentralPDFIntelligence={mount,updatePlan,process,getLast:tool=>state.lastByTool[tool]||null,clearCache:()=>state.cache.clear()};
})();
