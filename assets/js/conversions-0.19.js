(() => {
  'use strict';

  const MIME = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pdf: 'application/pdf',
    zip: 'application/zip'
  };

  const $ = selector => document.querySelector(selector);
  const state = { bound: new Set(), lastPlans: new Map(), optional: {} };

  function escapeXml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  }
  function baseName(name) { return String(name || 'arquivo').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '_'); }
  function ext(name) { return (String(name).split('.').pop() || '').toLowerCase(); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function formatBytes(bytes) { if (!bytes) return '0 B'; const u=['B','KB','MB','GB']; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),u.length-1); return `${(bytes/1024**i).toFixed(i?1:0)} ${u[i]}`; }
  function safeSheetName(name, index) { const raw=(name||`Planilha ${index+1}`).replace(/[\\/?*\[\]:]/g,' ').trim()||`Planilha ${index+1}`; return raw.slice(0,31); }
  function normalizeOutputName(name, fallback) { return (String(name||fallback).trim().replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}._-]+/gu,'_')||fallback); }

  function parsePages(text, count) {
    const raw=String(text||'all').trim().toLowerCase();
    if (!raw || raw === 'all' || raw === 'todas') return Array.from({length:count},(_,i)=>i);
    const set=[];
    for (const token of raw.split(',').map(v=>v.trim()).filter(Boolean)) {
      if (/^\d+$/.test(token)) { const n=Number(token); if(n>=1&&n<=count&&!set.includes(n-1)) set.push(n-1); continue; }
      const m=token.match(/^(\d+)\s*-\s*(\d+)$/); if(!m) throw new Error(`Intervalo inválido: ${token}`);
      let a=Number(m[1]),b=Number(m[2]); const step=a<=b?1:-1;
      for(let n=a; step>0?n<=b:n>=b; n+=step) if(n>=1&&n<=count&&!set.includes(n-1)) set.push(n-1);
    }
    if(!set.length) throw new Error('Nenhuma página válida foi selecionada.');
    return set;
  }

  function scriptLoader(url, test) {
    return new Promise((resolve,reject)=>{
      if(test()) return resolve(true);
      const s=document.createElement('script'); s.src=url; s.async=true;
      s.onload=()=>test()?resolve(true):reject(new Error(`A biblioteca carregou, mas a API não foi encontrada: ${url}`));
      s.onerror=()=>{s.remove();reject(new Error(`Não foi possível carregar ${url}`));};
      document.head.appendChild(s);
    });
  }

  async function ensureOptionalDecoder(kind) {
    if(kind==='tiff') {
      if(window.UTIF) return window.UTIF;
      const candidates=['vendor/UTIF.min.js','https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.min.js'];
      let last;
      for(const url of candidates){try{await scriptLoader(url,()=>Boolean(window.UTIF));return window.UTIF;}catch(e){last=e;}}
      throw new Error(`O decodificador TIFF não está disponível. Execute PREPARAR_OFFLINE.bat. ${last?.message||''}`);
    }
    if(kind==='heic') {
      if(window.heic2any) return window.heic2any;
      const candidates=['vendor/heic2any.min.js','https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js'];
      let last;
      for(const url of candidates){try{await scriptLoader(url,()=>Boolean(window.heic2any));return window.heic2any;}catch(e){last=e;}}
      throw new Error(`O decodificador HEIC não está disponível. Execute PREPARAR_OFFLINE.bat. ${last?.message||''}`);
    }
  }

  async function ensurePdfJsWorker() {
    if(!window.pdfjsLib?.getDocument) throw new Error('PDF.js não está disponível.');
    if(pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc=window.CentralPDFEnginePaths?.pdfWorker||'vendor/pdf.worker.min.js';
  }

  function dataUrlFromBlob(blob) { return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(r.error); r.readAsDataURL(blob); }); }
  function canvasBlob(canvas, type='image/png', quality=.9) { return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao gerar imagem.')),type,quality)); }
  function imageBitmapFromBlob(blob) { return createImageBitmap(blob); }

  async function renderPdfPage(pdf, index, dpi=144, format='image/png', quality=.9) {
    const page=await pdf.getPage(index+1); const viewport=page.getViewport({scale:dpi/72});
    const canvas=document.createElement('canvas'); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d',{alpha:format!=='image/jpeg'}); if(format==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);} await page.render({canvasContext:ctx,viewport}).promise;
    return {canvas, blob:await canvasBlob(canvas,format,quality), viewport};
  }

  function groupTextItems(items) {
    const normalized=(items||[]).filter(i=>String(i.str||'').trim()).map(i=>({text:String(i.str),x:Number(i.transform?.[4]||0),y:Number(i.transform?.[5]||0),w:Number(i.width||0)}));
    normalized.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x);
    const lines=[];
    for(const item of normalized){let line=lines.find(l=>Math.abs(l.y-item.y)<=3);if(!line){line={y:item.y,items:[]};lines.push(line);}line.items.push(item);}
    lines.sort((a,b)=>b.y-a.y);
    return lines.map(line=>line.items.sort((a,b)=>a.x-b.x).map(i=>i.text.trim()).filter(Boolean));
  }

  async function extractPdfPageRows(page) {
    const content=await page.getTextContent(); return groupTextItems(content.items);
  }
  async function extractPdfPageText(page) { return (await extractPdfPageRows(page)).map(r=>r.join(' ')).join('\n').trim(); }

  function docxParagraph(text, bold=false, size=22) {
    const safe=escapeXml(text||' ');
    return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
  }
  function docxImage(rId, cx, cy, name) {
    return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${rId}" name="${escapeXml(name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  async function buildDocx({title,pages,mode}) {
    if(!window.JSZip) throw new Error('JSZip não está disponível.');
    const zip=new JSZip(); const rels=[]; const body=[]; let rid=1;
    for(let i=0;i<pages.length;i++){
      const p=pages[i]; body.push(docxParagraph(`Página ${p.pageNumber}`,true,28));
      if((mode==='image'||mode==='hybrid')&&p.imageBlob){
        const data=await p.imageBlob.arrayBuffer(); zip.file(`word/media/page-${i+1}.png`,data); rels.push(`<Relationship Id="rId${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page-${i+1}.png"/>`);
        const ratio=p.imageWidth/p.imageHeight; const maxCx=5486400,maxCy=7315200; let cx=maxCx,cy=Math.round(cx/ratio); if(cy>maxCy){cy=maxCy;cx=Math.round(cy*ratio);} body.push(docxImage(rid,cx,cy,`Página ${p.pageNumber}`)); rid++;
      }
      if((mode==='text'||mode==='hybrid')&&p.text){for(const line of p.text.split(/\r?\n/)){body.push(docxParagraph(line||' ',false,21));}}
      if(i<pages.length-1) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
    zip.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`);
    zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`);
    const now=new Date().toISOString();
    zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Central PDF &amp; Imagem 1.0</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`);
    zip.file('docProps/app.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Central PDF &amp; Imagem</Application></Properties>`);
    return zip.generateAsync({type:'blob',mimeType:MIME.docx,compression:'DEFLATE'});
  }

  function colName(index){let s='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+((n-1)%26))+s;return s;}
  async function buildXlsx({title,sheets}) {
    if(!window.JSZip) throw new Error('JSZip não está disponível.');
    const zip=new JSZip();
    const sheetDefs=[]; const rels=[]; const overrides=[];
    sheets.forEach((sheet,i)=>{
      const rows=(sheet.rows||[]).map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>`<c r="${colName(ci)}${ri+1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`).join('')}</row>`).join('');
      zip.file(`xl/worksheets/sheet${i+1}.xml`,`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${rows}</sheetData></worksheet>`);
      sheetDefs.push(`<sheet name="${escapeXml(safeSheetName(sheet.name,i))}" sheetId="${i+1}" r:id="rId${i+1}"/>`);
      rels.push(`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`);
      overrides.push(`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    });
    const stylesRid=sheets.length+1; rels.push(`<Relationship Id="rId${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides.join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
    zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetDefs.join('')}</sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
    zip.file('xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>`);
    const now=new Date().toISOString();
    zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Central PDF &amp; Imagem 1.0</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`);
    zip.file('docProps/app.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Central PDF &amp; Imagem</Application></Properties>`);
    return zip.generateAsync({type:'blob',mimeType:MIME.xlsx,compression:'DEFLATE'});
  }

  async function buildPptx({title,pages}) {
    if(!window.PptxGenJS) throw new Error('O motor de PowerPoint não carregou.');
    const pptx=new PptxGenJS(); pptx.layout='LAYOUT_WIDE'; pptx.author='Central PDF & Imagem'; pptx.subject='Conversão local de PDF'; pptx.title=title; pptx.company='Central PDF';
    for(const p of pages){const slide=pptx.addSlide();slide.background={color:'FFFFFF'};const data=await dataUrlFromBlob(p.imageBlob);const sw=13.333,sh=7.5,ratio=(p.imageWidth||1)/(p.imageHeight||1);let w=sw,h=w/ratio;if(h>sh){h=sh;w=h*ratio;}slide.addImage({data,x:(sw-w)/2,y:(sh-h)/2,w,h});if(p.text&&slide.addNotes)slide.addNotes(`Página ${p.pageNumber}\n${p.text}`);}
    const result=await pptx.write({outputType:'blob',compression:true}); return result instanceof Blob?result:new Blob([result],{type:MIME.pptx});
  }

  async function processPdfToOffice({files,progress,cancelled}) {
    await ensurePdfJsWorker(); const format=$('#officeExportFormat')?.value||'docx'; const mode=$('#officeDocxMode')?.value||'text'; const dpi=Number($('#officeExportDpi')?.value||144); const pageText=$('#officeExportPages')?.value||'all'; const outputs=[];
    for(let fi=0;fi<files.length;fi++){
      if(cancelled?.()) throw new Error('Operação cancelada pelo usuário.');
      const file=files[fi]; const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; const pages=[];
      try{
        const indexes=parsePages(pageText,pdf.numPages);
        for(let pi=0;pi<indexes.length;pi++){
          const idx=indexes[pi]; const page=await pdf.getPage(idx+1); const text=(format==='xlsx'||mode!=='image'||format==='pptx')?await extractPdfPageText(page):''; const rows=format==='xlsx'?await extractPdfPageRows(page):[]; let imageBlob=null,imageWidth=0,imageHeight=0;
          if(format==='pptx'||mode==='image'||mode==='hybrid'){const rendered=await renderPdfPage(pdf,idx,dpi,'image/png');imageBlob=rendered.blob;imageWidth=rendered.canvas.width;imageHeight=rendered.canvas.height;}
          pages.push({pageNumber:idx+1,text,rows,imageBlob,imageWidth,imageHeight}); progress?.(10+Math.round(((fi+(pi+1)/indexes.length)/files.length)*75));
        }
      }finally{await pdf.destroy();}
      let blob,filename;
      if(format==='docx'){blob=await buildDocx({title:baseName(file.name),pages,mode});filename=`${baseName(file.name)}.docx`;}
      else if(format==='pptx'){blob=await buildPptx({title:baseName(file.name),pages});filename=`${baseName(file.name)}.pptx`;}
      else {const oneSheetPerPage=$('#officeXlsxSheets')?.value!=='document'; const sheets=oneSheetPerPage?pages.map(p=>({name:`Página ${p.pageNumber}`,rows:p.rows.length?p.rows:[[p.text]]})):[{name:baseName(file.name),rows:pages.flatMap(p=>[[`Página ${p.pageNumber}`],...(p.rows.length?p.rows:[[p.text]]),[]])}];blob=await buildXlsx({title:baseName(file.name),sheets});filename=`${baseName(file.name)}.xlsx`;}
      outputs.push({blob,filename});
    }
    progress?.(95); return {outputs,message:`${outputs.length} arquivo(s) convertido(s) para ${format.toUpperCase()}.`};
  }

  async function parseDocx(file){const zip=await JSZip.loadAsync(await file.arrayBuffer());const xml=await zip.file('word/document.xml')?.async('text');if(!xml)throw new Error('DOCX sem word/document.xml.');const doc=new DOMParser().parseFromString(xml,'application/xml');return [...doc.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).filter(Boolean).join('\n');}
  async function parsePptx(file){const zip=await JSZip.loadAsync(await file.arrayBuffer());const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));const blocks=[];for(const name of names){const xml=await zip.file(name).async('text');const doc=new DOMParser().parseFromString(xml,'application/xml');const texts=[...doc.getElementsByTagNameNS('*','t')].map(n=>n.textContent).filter(Boolean);blocks.push(`Slide ${blocks.length+1}\n${texts.join('\n')}`);}return blocks.join('\n\n');}
  async function parseXlsx(file){const zip=await JSZip.loadAsync(await file.arrayBuffer());const shared=[];const s=zip.file('xl/sharedStrings.xml');if(s){const doc=new DOMParser().parseFromString(await s.async('text'),'application/xml');for(const si of [...doc.getElementsByTagNameNS('*','si')]) shared.push([...si.getElementsByTagNameNS('*','t')].map(n=>n.textContent).join(''));}
    const sheets=Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));const out=[];for(const name of sheets){const doc=new DOMParser().parseFromString(await zip.file(name).async('text'),'application/xml');out.push(`Planilha ${out.length+1}`);for(const row of [...doc.getElementsByTagNameNS('*','row')]){const vals=[];for(const c of [...row.getElementsByTagNameNS('*','c')]){const type=c.getAttribute('t');const v=c.getElementsByTagNameNS('*','v')[0]?.textContent||'';const inline=c.getElementsByTagNameNS('*','t')[0]?.textContent;vals.push(inline??(type==='s'?shared[Number(v)]??v:v));}out.push(vals.join('\t'));}out.push('');}return out.join('\n');}
  function htmlToText(source){const doc=new DOMParser().parseFromString(source,'text/html');doc.querySelectorAll('script,style,noscript').forEach(n=>n.remove());return doc.body?.innerText||'';}

  async function decodeImageFile(file) {
    const extension=ext(file.name);
    if(['tif','tiff'].includes(extension)){
      const UTIF=await ensureOptionalDecoder('tiff');const buffer=await file.arrayBuffer();const ifds=UTIF.decode(buffer);if(!ifds.length)throw new Error('TIFF sem páginas.');const images=[];for(const ifd of ifds){UTIF.decodeImage(buffer,ifd);const rgba=UTIF.toRGBA8(ifd);const canvas=document.createElement('canvas');canvas.width=ifd.width;canvas.height=ifd.height;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),ifd.width,ifd.height),0,0);images.push({canvas,blob:await canvasBlob(canvas,'image/png')});}return images;
    }
    if(['heic','heif'].includes(extension)){
      const converter=await ensureOptionalDecoder('heic');const converted=await converter({blob:file,toType:'image/png',quality:.95});const blobs=Array.isArray(converted)?converted:[converted];const images=[];for(const blob of blobs){const bitmap=await createImageBitmap(blob);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();images.push({canvas,blob:await canvasBlob(canvas,'image/png')});}return images;
    }
    const bitmap=await imageBitmapFromBlob(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();return [{canvas,blob:await canvasBlob(canvas,'image/png')}];
  }

  function wrapLine(text,font,size,maxWidth){const words=String(text).split(/\s+/);const lines=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}if(line||!lines.length)lines.push(line);return lines;}
  async function buildTextPdf({title,text,pageSize='a4',fontSize=11,margin=42}){
    const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(title);pdf.setProducer('Central PDF & Imagem 1.0 - Conversão local');const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);const bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);const mono=await pdf.embedFont(PDFLib.StandardFonts.Courier);const dims=pageSize==='letter'?[612,792]:[595.28,841.89];let page=pdf.addPage(dims),y=dims[1]-margin;const maxWidth=dims[0]-margin*2;
    const addPage=()=>{page=pdf.addPage(dims);y=dims[1]-margin;};
    for(const raw of String(text||'').replace(/\r/g,'').split('\n')){let line=raw;let currentFont=font,currentSize=fontSize; if(/^#{1,3}\s+/.test(line)){const level=(line.match(/^#+/)[0].length);line=line.replace(/^#{1,3}\s+/,'');currentFont=bold;currentSize=level===1?18:level===2?15:13;} else if(/^Página \d+|^Slide \d+|^Planilha \d+/i.test(line)){currentFont=bold;currentSize=14;} else if(/\t/.test(line)){currentFont=mono;currentSize=Math.max(8,fontSize-1);} const wrapped=line?wrapLine(line,currentFont,currentSize,maxWidth):[''];for(const part of wrapped){if(y<margin+currentSize*2)addPage();if(part)page.drawText(part,{x:margin,y,size:currentSize,font:currentFont,color:PDFLib.rgb(.12,.15,.22)});y-=currentSize*1.45;}if(!line)y-=fontSize*.6;}
    return new Blob([await pdf.save({useObjectStreams:true})],{type:MIME.pdf});
  }

  async function buildImagePdf(images,title,pageMode='image',margin=18){const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(title);pdf.setProducer('Central PDF & Imagem 1.0 - Imagens para PDF');for(const item of images){const bytes=await item.blob.arrayBuffer();const image=await pdf.embedPng(bytes);let pageW,pageH;if(pageMode==='a4'){pageW=595.28;pageH=841.89;}else{pageW=image.width+margin*2;pageH=image.height+margin*2;}const page=pdf.addPage([pageW,pageH]);const scale=Math.min((pageW-margin*2)/image.width,(pageH-margin*2)/image.height,1);const w=image.width*scale,h=image.height*scale;page.drawImage(image,{x:(pageW-w)/2,y:(pageH-h)/2,width:w,height:h});}return new Blob([await pdf.save({useObjectStreams:true})],{type:MIME.pdf});}

  async function processDocumentsToPdf({files,progress,cancelled}){
    const combine=$('#docToPdfCombine')?.checked;const pageSize=$('#docToPdfPageSize')?.value||'a4';const fontSize=Number($('#docToPdfFontSize')?.value||11);const imagePage=$('#docToPdfImagePage')?.value||'image';const outputs=[];const combinedTexts=[];const combinedImages=[];
    for(let i=0;i<files.length;i++){
      if(cancelled?.())throw new Error('Operação cancelada pelo usuário.');const file=files[i],e=ext(file.name);let blob;
      if(['png','jpg','jpeg','webp','bmp','gif','tif','tiff','heic','heif'].includes(e)){
        const images=await decodeImageFile(file);if(combine)combinedImages.push(...images);else blob=await buildImagePdf(images,baseName(file.name),imagePage);
      }else{
        let text='';if(e==='docx')text=await parseDocx(file);else if(e==='xlsx')text=await parseXlsx(file);else if(e==='pptx')text=await parsePptx(file);else{const raw=await file.text();text=['html','htm'].includes(e)?htmlToText(raw):raw;}
        if(combine)combinedTexts.push(`# ${baseName(file.name)}\n\n${text}`);else blob=await buildTextPdf({title:baseName(file.name),text,pageSize,fontSize});
      }
      if(blob)outputs.push({blob,filename:`${baseName(file.name)}.pdf`});progress?.(10+Math.round(((i+1)/files.length)*75));
    }
    if(combine){if(combinedTexts.length&&combinedImages.length)throw new Error('Para combinar em um único PDF, use somente documentos de texto ou somente imagens.');if(combinedTexts.length)outputs.push({blob:await buildTextPdf({title:'Documentos_convertidos',text:combinedTexts.join('\n\n'),pageSize,fontSize}),filename:'Documentos_convertidos.pdf'});else if(combinedImages.length)outputs.push({blob:await buildImagePdf(combinedImages,'Imagens_convertidas',imagePage),filename:'Imagens_convertidas.pdf'});}
    progress?.(95);return{outputs,message:`${outputs.length} PDF(s) criado(s).`};
  }

  function getPdfObject(objs,name){return new Promise((resolve,reject)=>{try{const v=objs.get(name,obj=>resolve(obj));if(v)resolve(v);setTimeout(()=>reject(new Error('Imagem interna não foi resolvida.')),5000);}catch(e){reject(e);}});}
  function imageDataCanvas(obj){if(obj?.bitmap){const c=document.createElement('canvas');c.width=obj.bitmap.width;c.height=obj.bitmap.height;c.getContext('2d').drawImage(obj.bitmap,0,0);return c;}const w=obj?.width,h=obj?.height,data=obj?.data;if(!w||!h||!data)return null;const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(data.length===w*h*4){ctx.putImageData(new ImageData(new Uint8ClampedArray(data),w,h),0,0);return c;}if(data.length===w*h*3){const rgba=new Uint8ClampedArray(w*h*4);for(let i=0,j=0;i<data.length;i+=3,j+=4){rgba[j]=data[i];rgba[j+1]=data[i+1];rgba[j+2]=data[i+2];rgba[j+3]=255;}ctx.putImageData(new ImageData(rgba,w,h),0,0);return c;}if(data.length===Math.ceil(w/8)*h){const rgba=new Uint8ClampedArray(w*h*4);const stride=Math.ceil(w/8);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const bit=(data[y*stride+(x>>3)]>>(7-(x&7)))&1;const v=bit?255:0;const j=(y*w+x)*4;rgba[j]=rgba[j+1]=rgba[j+2]=v;rgba[j+3]=255;}ctx.putImageData(new ImageData(rgba,w,h),0,0);return c;}return null;}
  function quickHash(data){let h=2166136261;const step=Math.max(1,Math.floor(data.length/128));for(let i=0;i<data.length;i+=step){h^=data[i];h=Math.imul(h,16777619);}return (h>>>0).toString(16);}

  async function extractInternalImages(page, minW, minH, format, quality, dedupeSet){
    const ops=await page.getOperatorList();const out=[];const O=pdfjsLib.OPS||{};
    for(let i=0;i<ops.fnArray.length;i++){
      const fn=ops.fnArray[i],args=ops.argsArray[i]||[];let obj=null,label='imagem';
      try{
        if(fn===O.paintImageXObject||fn===O.paintImageXObjectRepeat){obj=await getPdfObject(page.objs,args[0]);label=String(args[0]||'imagem');}
        else if(fn===O.paintInlineImageXObject||fn===O.paintInlineImageXObjectGroup){obj=args[0];label='inline';}
        else continue;
        const canvas=imageDataCanvas(obj);if(!canvas||canvas.width<minW||canvas.height<minH)continue;const ctx=canvas.getContext('2d');const sample=ctx.getImageData(0,0,Math.min(canvas.width,64),Math.min(canvas.height,64)).data;const key=`${canvas.width}x${canvas.height}-${quickHash(sample)}`;if(dedupeSet&&dedupeSet.has(key))continue;if(dedupeSet)dedupeSet.add(key);out.push({canvas,blob:await canvasBlob(canvas,format,quality),label});
      }catch(_){}
    }
    return out;
  }

  async function processExtractImages({files,progress,cancelled}){
    await ensurePdfJsWorker();if(!window.JSZip)throw new Error('JSZip não está disponível.');const mode=$('#extractImageMode')?.value||'internal';const fmt=$('#extractImageFormat')?.value||'png';const format=fmt==='jpg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png';const quality=Number($('#extractImageQuality')?.value||90)/100;const minW=Number($('#extractImageMinWidth')?.value||80),minH=Number($('#extractImageMinHeight')?.value||80);const pageText=$('#extractImagePages')?.value||'all';const dedupe=$('#extractImageDedupe')?.checked;const zip=new JSZip();const manifest=[];let total=0;
    for(let fi=0;fi<files.length;fi++){
      const file=files[fi],pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const indexes=parsePages(pageText,pdf.numPages);const seen=dedupe?new Set():null;let foundForFile=0;
      try{for(let pi=0;pi<indexes.length;pi++){if(cancelled?.())throw new Error('Operação cancelada pelo usuário.');const idx=indexes[pi],page=await pdf.getPage(idx+1);if(mode==='internal'||mode==='both'){const images=await extractInternalImages(page,minW,minH,format,quality,seen);for(let j=0;j<images.length;j++){const name=`${baseName(file.name)}/pagina_${String(idx+1).padStart(3,'0')}_interna_${String(j+1).padStart(2,'0')}.${fmt}`;zip.file(name,images[j].blob);manifest.push({arquivo:file.name,pagina:idx+1,tipo:'interna',nome:name,largura:images[j].canvas.width,altura:images[j].canvas.height});total++;foundForFile++;}}
        if(mode==='pages'||mode==='both'){const rendered=await renderPdfPage(pdf,idx,Number($('#extractImageDpi')?.value||150),format,quality);const name=`${baseName(file.name)}/pagina_${String(idx+1).padStart(3,'0')}_completa.${fmt}`;zip.file(name,rendered.blob);manifest.push({arquivo:file.name,pagina:idx+1,tipo:'pagina',nome:name,largura:rendered.canvas.width,altura:rendered.canvas.height});total++;foundForFile++;}
        progress?.(10+Math.round(((fi+(pi+1)/indexes.length)/files.length)*75));}}
      finally{await pdf.destroy();}
      if(!foundForFile)manifest.push({arquivo:file.name,aviso:'Nenhuma imagem interna encontrada com os filtros atuais.'});
    }
    zip.file('manifesto_imagens.json',JSON.stringify({geradoEm:new Date().toISOString(),total,arquivos:manifest},null,2));const blob=await zip.generateAsync({type:'blob',mimeType:MIME.zip,compression:'DEFLATE'});progress?.(95);return{outputs:[{blob,filename:'imagens_extraidas.zip'}],message:`${total} imagem(ns) preparada(s).`};
  }

  async function sha256(blob){if(!crypto?.subtle)return null;const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  function detectPdfArchiveSignals(bytes){const text=new TextDecoder('latin1').decode(bytes.slice(0,Math.min(bytes.length,2_000_000)));return{versao:(text.match(/%PDF-(\d\.\d)/)||[])[1]||null,criptografado:/\/Encrypt\b/.test(text),outputIntent:/\/OutputIntent[s]?\b/.test(text),pdfaXmp:/pdfaid:part|pdfaSchema|PDF\/A/i.test(text),formularios:/\/AcroForm\b/.test(text),javascript:/\/JavaScript\b|\/JS\b/.test(text),anexos:/\/EmbeddedFiles\b/.test(text)};}

  async function processArchivePdf({files,progress,cancelled}){
    const mode=$('#archiveMode')?.value||'normalize';const dpi=Number($('#archiveDpi')?.value||180);const removeMeta=$('#archiveRemoveMetadata')?.checked;const flatten=$('#archiveFlattenForms')?.checked;const includeManifest=$('#archiveManifest')?.checked;const zip=new JSZip();const reports=[];const outputs=[];
    for(let fi=0;fi<files.length;fi++){
      if(cancelled?.())throw new Error('Operação cancelada pelo usuário.');const file=files[fi];const originalBlob=file;const signals=detectPdfArchiveSignals(new Uint8Array(await file.arrayBuffer()));let resultBlob,pageCount=0;
      if(mode==='raster'){
        await ensurePdfJsWorker();const pdfjs=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const out=await PDFLib.PDFDocument.create();pageCount=pdfjs.numPages;
        try{for(let i=0;i<pdfjs.numPages;i++){const page=await pdfjs.getPage(i+1);const viewport=page.getViewport({scale:1});const rendered=await renderPdfPage(pdfjs,i,dpi,'image/jpeg',.86);const img=await out.embedJpg(await rendered.blob.arrayBuffer());const target=out.addPage([viewport.width,viewport.height]);target.drawImage(img,{x:0,y:0,width:viewport.width,height:viewport.height});progress?.(10+Math.round(((fi+(i+1)/pdfjs.numPages)/files.length)*70));}}finally{await pdfjs.destroy();}
        out.setProducer('Central PDF & Imagem 1.0 - Cópia de arquivamento rasterizada');out.setCreator('Central PDF & Imagem');resultBlob=new Blob([await out.save({useObjectStreams:true})],{type:MIME.pdf});
      }else{
        const doc=await PDFLib.PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false});pageCount=doc.getPageCount();if(flatten){try{doc.getForm().flatten();}catch(_){}}if(removeMeta){doc.setTitle('');doc.setAuthor('');doc.setSubject('');doc.setKeywords([]);}doc.setProducer('Central PDF & Imagem 1.0 - Cópia normalizada para arquivamento');doc.setCreator('Central PDF & Imagem');resultBlob=new Blob([await doc.save({useObjectStreams:true,objectsPerTick:30})],{type:MIME.pdf});progress?.(20+Math.round(((fi+1)/files.length)*65));
      }
      const filename=`${baseName(file.name)}_arquivamento.pdf`;outputs.push({blob:resultBlob,filename});zip.file(filename,resultBlob);
      const report={arquivoOriginal:file.name,arquivoGerado:filename,modo:mode,paginas:pageCount,tamanhoOriginal:file.size,tamanhoGerado:resultBlob.size,sha256Original:await sha256(originalBlob),sha256Gerado:await sha256(resultBlob),sinaisPDF:signals,certificacaoPDFA:false,aviso:'Este processo prepara uma cópia para arquivamento, mas não certifica conformidade PDF/A.'};reports.push(report);
      if(includeManifest)zip.file(`${baseName(file.name)}_manifesto.json`,JSON.stringify(report,null,2));
    }
    if(outputs.length===1&&!includeManifest)return{outputs,message:'Cópia de arquivamento criada.'};zip.file('manifesto_geral.json',JSON.stringify({geradoEm:new Date().toISOString(),documentos:reports},null,2));const archive=await zip.generateAsync({type:'blob',mimeType:MIME.zip,compression:'DEFLATE'});progress?.(95);return{outputs:[{blob:archive,filename:'pacote_de_arquivamento.zip'}],message:`Pacote de arquivamento criado para ${files.length} documento(s).`};
  }

  function toolPlanText(tool,files){const total=files.reduce((s,f)=>s+(f.size||0),0);const map={pdfToOffice:['Conversão para Office','DOCX, XLSX ou PPTX'],documentsToPdf:['Documentos para PDF','DOCX, XLSX, PPTX, HTML, TXT, CSV, Markdown e imagens'],extractImages:['Extração de imagens','Imagens internas e/ou páginas renderizadas'],archivePdf:['Arquivamento','PDF normalizado ou cópia rasterizada com manifesto']};const [title,result]=map[tool]||['Conversão','Resultado local'];return `<strong>${title}</strong><p>${files.length?`${files.length} arquivo(s), ${formatBytes(total)}. ${result}.`:'Adicione arquivos para calcular o plano.'}</p>`;}

  function updatePlan(tool,files){const el=$(`#${tool}Plan`);if(el)el.innerHTML=toolPlanText(tool,files||[]);state.lastPlans.set(tool,{files:(files||[]).length});}
  function bindChange(tool){if(state.bound.has(tool))return;state.bound.add(tool);document.querySelectorAll(`#settingsContent [id^="office"],#settingsContent [id^="docToPdf"],#settingsContent [id^="extractImage"],#settingsContent [id^="archive"]`).forEach(el=>el.addEventListener('change',()=>window.dispatchEvent(new Event('centralpdf-settings-changed'))));
    const format=$('#officeExportFormat');if(format)format.addEventListener('change',()=>{const f=format.value;$('#officeDocxOptions')?.classList.toggle('hidden',f!=='docx');$('#officeXlsxOptions')?.classList.toggle('hidden',f!=='xlsx');});
    const archive=$('#archiveMode');if(archive)archive.addEventListener('change',()=>$('#archiveRasterOptions')?.classList.toggle('hidden',archive.value!=='raster'));
  }
  function mount(tool){bindChange(tool);}

  window.CentralPDFConversions={mount,updatePlan,processPdfToOffice,processDocumentsToPdf,processExtractImages,processArchivePdf,parseDocx,parseXlsx,parsePptx,buildDocx,buildXlsx,buildPptx,detectPdfArchiveSignals};
})();
