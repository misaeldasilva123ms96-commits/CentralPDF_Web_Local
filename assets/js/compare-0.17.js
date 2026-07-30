(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { last: null };

  function mount(){
    ['compareMode','compareIgnoreCase','compareIgnoreWhitespace','compareThreshold','compareDpi','comparePages','compareIncludeImages'].forEach(id=>{
      const el=$('#'+id); if(el&&!el.dataset.cp17){el.dataset.cp17='1';el.addEventListener('input',()=>updatePlan(window.CentralPDFApp?.getFiles?.()||[]));el.addEventListener('change',()=>updatePlan(window.CentralPDFApp?.getFiles?.()||[]));}
    });
    updatePlan(window.CentralPDFApp?.getFiles?.()||[]);
  }

  async function updatePlan(files){
    const box=$('#comparePlan'); if(!box) return;
    const button=$('#processButton');
    if(files.length!==2){box.innerHTML=`<strong>Selecione exatamente 2 PDFs</strong><p>${files.length?`${files.length} arquivo(s) selecionado(s). Remova ou adicione arquivos até ficar com dois.`:'O PDF original e o PDF revisado serão comparados lado a lado.'}</p>`;if(button)button.disabled=true;return;}
    try{
      const counts=[];
      for(const file of files){const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;counts.push(doc.numPages);await doc.destroy();}
      box.innerHTML=`<strong>Comparação pronta</strong><p><b>${esc(files[0].name)}</b>: ${counts[0]} página(s)<br><b>${esc(files[1].name)}</b>: ${counts[1]} página(s)<br>Serão analisadas até ${Math.max(...counts)} páginas.</p>`;
      if(button)button.disabled=false;
    }catch(e){box.innerHTML=`<strong>Não foi possível ler os PDFs</strong><p>${esc(e.message||e)}</p>`;if(button)button.disabled=true;}
  }

  function settings(){return{
    mode:$('#compareMode')?.value||'hybrid', ignoreCase:$('#compareIgnoreCase')?.checked!==false,
    ignoreWhitespace:$('#compareIgnoreWhitespace')?.checked!==false, threshold:Number($('#compareThreshold')?.value||28),
    dpi:Number($('#compareDpi')?.value||110), pages:($('#comparePages')?.value||'all').trim(), includeImages:$('#compareIncludeImages')?.checked!==false
  }}
  function normalize(text,s){let v=String(text||'').normalize('NFKC');if(s.ignoreCase)v=v.toLocaleLowerCase('pt-BR');if(s.ignoreWhitespace)v=v.replace(/\s+/g,' ').trim();return v;}
  function tokenize(text){return String(text||'').split(/[^\p{L}\p{N}]+/u).filter(Boolean)}
  function similarity(a,b){if(a===b)return 100;if(!a&&!b)return 100;if(!a||!b)return 0;const A=new Set(tokenize(a)),B=new Set(tokenize(b));let inter=0;A.forEach(x=>{if(B.has(x))inter++});const union=new Set([...A,...B]).size;return union?Math.round(inter/union*100):0;}
  function lineChanges(a,b){const aa=String(a||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),bb=String(b||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const A=new Set(aa),B=new Set(bb);return{removed:aa.filter(x=>!B.has(x)).slice(0,80),added:bb.filter(x=>!A.has(x)).slice(0,80)}}
  function pageList(spec,max){if(!spec||spec.toLowerCase()==='all')return Array.from({length:max},(_,i)=>i);const out=[],seen=new Set();for(const part of spec.split(',')){const m=part.trim().match(/^(\d+)(?:-(\d+))?$/);if(!m)continue;let a=+m[1],b=+(m[2]||m[1]);if(a>b)[a,b]=[b,a];for(let n=a;n<=b;n++){const i=n-1;if(i>=0&&i<max&&!seen.has(i)){seen.add(i);out.push(i)}}}return out}
  async function extract(page){if(!page)return'';const c=await page.getTextContent();return c.items.map(i=>i.str||'').join(' ')}
  async function render(page,dpi){if(!page)return null;const base=page.getViewport({scale:1});let scale=dpi/72;const cap=1500;scale=Math.min(scale,cap/Math.max(base.width,base.height));const vp=page.getViewport({scale});const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await page.render({canvasContext:x,viewport:vp}).promise;return c}
  function resizeCanvas(source,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,w,h);if(source)x.drawImage(source,0,0,w,h);return c}
  function visualDiff(a,b,threshold){if(!a&&!b)return{percent:0,diff:null};const w=Math.max(a?.width||1,b?.width||1),h=Math.max(a?.height||1,b?.height||1);const A=resizeCanvas(a,w,h),B=resizeCanvas(b,w,h);const ax=A.getContext('2d').getImageData(0,0,w,h),bx=B.getContext('2d').getImageData(0,0,w,h);const out=document.createElement('canvas');out.width=w;out.height=h;const ox=out.getContext('2d');ox.drawImage(B,0,0);const od=ox.getImageData(0,0,w,h);let changed=0,total=0;const step=Math.max(1,Math.floor(Math.max(w,h)/900));for(let y=0;y<h;y+=step){for(let x=0;x<w;x+=step){const i=(y*w+x)*4;const d=(Math.abs(ax.data[i]-bx.data[i])+Math.abs(ax.data[i+1]-bx.data[i+1])+Math.abs(ax.data[i+2]-bx.data[i+2]))/3;total++;if(d>threshold){changed++;for(let yy=y;yy<Math.min(y+step,h);yy++)for(let xx=x;xx<Math.min(x+step,w);xx++){const j=(yy*w+xx)*4;od.data[j]=245;od.data[j+1]=38;od.data[j+2]=75;od.data[j+3]=190;}}}}ox.putImageData(od,0,0);return{percent:total?+(changed/total*100).toFixed(2):0,diff:out}}
  const blobOf=(c,type='image/jpeg',q=.78)=>new Promise(r=>c.toBlob(r,type,q));
  function reportHtml(nameA,nameB,rows){return`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Comparação de PDFs</title><style>body{font:14px Arial;margin:32px;color:#172033}h1{margin:0 0 6px}.meta{color:#667085}.summary{display:flex;gap:12px;margin:22px 0}.summary b{font-size:22px}.summary div{padding:14px;border:1px solid #ddd;border-radius:10px}.page{page-break-inside:avoid;border-top:2px solid #ddd;padding:22px 0}.status{font-weight:bold}.changed{color:#c21d43}.same{color:#16805c}.imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.imgs img{width:100%;border:1px solid #ddd}.changes{display:grid;grid-template-columns:1fr 1fr;gap:16px}.changes pre{white-space:pre-wrap;background:#f7f8fa;padding:10px;border-radius:8px;max-height:220px;overflow:auto}@media(max-width:700px){.imgs,.changes{grid-template-columns:1fr}}</style></head><body><h1>Comparação de PDFs</h1><div class="meta">Original: ${esc(nameA)}<br>Revisado: ${esc(nameB)}</div><div class="summary"><div><b>${rows.length}</b><br>páginas analisadas</div><div><b>${rows.filter(r=>r.changed).length}</b><br>com diferenças</div><div><b>${rows.filter(r=>r.missing).length}</b><br>adicionadas/removidas</div></div>${rows.map(r=>`<section class="page"><h2>Página ${r.page}</h2><div class="status ${r.changed?'changed':'same'}">${r.changed?'Diferença encontrada':'Sem diferença relevante'}</div><p>Similaridade textual: ${r.textSimilarity}% · Diferença visual: ${r.visualDifference}%</p>${r.paths?`<div class="imgs"><figure><img src="${r.paths.a}"><figcaption>Original</figcaption></figure><figure><img src="${r.paths.b}"><figcaption>Revisado</figcaption></figure><figure><img src="${r.paths.diff}"><figcaption>Diferenças</figcaption></figure></div>`:''}<div class="changes"><div><h3>Removido</h3><pre>${esc(r.removed.join('\n'))||'—'}</pre></div><div><h3>Adicionado</h3><pre>${esc(r.added.join('\n'))||'—'}</pre></div></div></section>`).join('')}</body></html>`}

  async function process({files,progress,cancelled}){
    if(files.length!==2)throw new Error('A comparação exige exatamente dois PDFs.');if(!window.pdfjsLib||!window.JSZip)throw new Error('PDF.js e JSZip precisam estar disponíveis.');
    const s=settings(),docs=[];for(const f of files)docs.push(await window.pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise);
    const max=Math.max(docs[0].numPages,docs[1].numPages),pages=pageList(s.pages,max);if(!pages.length)throw new Error('Nenhuma página válida foi selecionada.');
    const zip=new window.JSZip(),rows=[];
    for(let p=0;p<pages.length;p++){
      if(cancelled?.())throw new Error('Operação cancelada pelo usuário.');const idx=pages[p];const pa=idx<docs[0].numPages?await docs[0].getPage(idx+1):null,pb=idx<docs[1].numPages?await docs[1].getPage(idx+1):null;
      const ta=s.mode==='visual'?'':await extract(pa),tb=s.mode==='visual'?'':await extract(pb),na=normalize(ta,s),nb=normalize(tb,s),ts=similarity(na,nb),lc=lineChanges(na,nb);
      let vd=0,paths=null;if(s.mode!=='text'){const ca=await render(pa,s.dpi),cb=await render(pb,s.dpi),d=visualDiff(ca,cb,s.threshold);vd=d.percent;if(s.includeImages){const n=String(idx+1).padStart(4,'0'),ba=ca?await blobOf(ca):new Blob([], {type:'image/jpeg'}),bb=cb?await blobOf(cb):new Blob([],{type:'image/jpeg'}),bd=d.diff?await blobOf(d.diff,'image/png'):new Blob([],{type:'image/png'});paths={a:`imagens/pagina_${n}_original.jpg`,b:`imagens/pagina_${n}_revisado.jpg`,diff:`imagens/pagina_${n}_diferencas.png`};zip.file(paths.a,ba);zip.file(paths.b,bb);zip.file(paths.diff,bd);}}
      const missing=!pa||!pb,changed=missing||(s.mode==='visual'?vd>.15:s.mode==='text'?ts<99:(ts<99||vd>.15));rows.push({page:idx+1,missing,changed,textSimilarity:ts,visualDifference:vd,removed:lc.removed,added:lc.added,paths});progress?.(Math.round((p+1)/pages.length*92));await new Promise(r=>setTimeout(r,0));
    }
    const summary={version:'1.0',createdAt:new Date().toISOString(),original:files[0].name,revised:files[1].name,settings:s,pages:rows};zip.file('relatorio.html',reportHtml(files[0].name,files[1].name,rows));zip.file('relatorio.json',JSON.stringify(summary,null,2));zip.file('LEIA-ME.txt','Abra relatorio.html para visualizar a comparação. O relatório é local e não envia os documentos.');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},m=>progress?.(92+Math.round(m.percent*.08)));state.last=summary;for(const d of docs)await d.destroy();return{outputs:[{blob,filename:`${base(files[0].name)}_versus_${base(files[1].name)}_comparacao.zip`}],message:`Comparação concluída: ${rows.filter(r=>r.changed).length} de ${rows.length} página(s) com diferenças.`};
  }
  function base(n){return n.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(0,70)}
  window.CentralPDFCompare={mount,updatePlan,process,getLast:()=>state.last};
})();
