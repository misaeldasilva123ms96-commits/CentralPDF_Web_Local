/* Native text replacements: rewrite text operators, never paint over original text. */
(() => {
  'use strict';
  const fail = message => { throw new Error(message); };
  // A bounded PDF content tokenizer. Inline images are intentionally unsupported.
  function tokenize(source) {
    const tokens = []; let i = 0;
    const white = c => /[\s\0]/.test(c);
    while (i < source.length) {
      if (white(source[i])) { i++; continue; }
      if (source[i] === '%') { while (i < source.length && !/[\r\n]/.test(source[i])) i++; continue; }
      const start = i; const c = source[i++];
      if (c === '(') {
        let depth = 1; const bytes = [];
        while (i < source.length && depth) {
          let ch = source[i++];
          if (ch === '\\') {
            ch = source[i++];
            if (ch === '\r' || ch === '\n') { if (ch === '\r' && source[i] === '\n') i++; continue; }
            if (/[0-7]/.test(ch)) { let oct = ch; for (let n = 0; n < 2 && /[0-7]/.test(source[i] || 'x'); n++) oct += source[i++]; bytes.push(parseInt(oct, 8) & 255); }
            else bytes.push(({n:10,r:13,t:9,b:8,f:12})[ch] ?? ch.charCodeAt(0));
          } else if (ch === '(') { depth++; bytes.push(40); }
          else if (ch === ')') { if (--depth) bytes.push(41); }
          else { if (ch === '\r') { if (source[i] === '\n') i++; ch = '\n'; } bytes.push(ch.charCodeAt(0)); }
        }
        if (depth) fail('Texto PDF incompleto.');
        tokens.push({start,end:i,bytes});
      } else if (c === '<' && source[i] !== '<') {
        const end = source.indexOf('>', i); if (end < 0) fail('Texto hexadecimal incompleto.');
        let hex = source.slice(i,end).replace(/\s/g,''); if (!/^[0-9a-f]*$/i.test(hex)) fail('Texto hexadecimal inválido.');
        if (hex.length % 2) hex += '0';
        tokens.push({start,end:end+1,bytes:hex.match(/../g)?.map(v=>parseInt(v,16)) || []}); i=end+1;
      } else if ('[]'.includes(c)) tokens.push({start,end:i,value:c});
      else {
        while (i < source.length && !/[\s\0()[\]<>/%]/.test(source[i])) i++;
        // Dictionaries and inline images require a different grammar; refuse safely.
        if (i === start+1 && '<>'.includes(c)) fail('Esta página usa uma estrutura ainda não compatível com a edição original.');
        tokens.push({start,end:i,value:source.slice(start,i)});
      }
      if (tokens.length > 250000) fail('Página muito complexa para editar o texto original.');
    }
    return tokens;
  }
  function operations(source) {
    const result=[]; let args=[]; let depth=0;
    for (const token of tokenize(source)) {
      if (token.value === 'BI') fail('Página com imagem inline: edição original indisponível.');
      if (token.value === '[') depth++;
      if (token.value === ']') depth--;
      if (!depth && token.value && !['[',']'].includes(token.value) && !token.value.startsWith('/') && !/^[+\-\d.]+$/.test(token.value)) {
        result.push({op:token.value,args,start:args[0]?.start ?? token.start,end:token.end}); args=[];
      } else args.push(token);
    }
    return result;
  }
  function streams(page, lib) {
    const raw=page.node.Contents(); if (!raw) return [];
    const values=raw instanceof lib.PDFArray ? raw.asArray() : [raw];
    return values.map(ref=>{
      const stream=page.doc.context.lookup(ref);
      const bytes=lib.decodePDFRawStream(stream).decode();
      if(bytes.length > 8*1024*1024) fail('Conteúdo da página muito grande para edição original.');
      let text=''; for(let i=0;i<bytes.length;i+=8192) text+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return text;
    });
  }
  async function inspect(page, renderedPage, lib, pdfjs) {
    const content=streams(page,lib); const fonts=new Map(); const runs=[];
    const operatorList=await renderedPage.getOperatorList();
    const shows=operatorList.fnArray.flatMap((op,i)=>op===pdfjs.OPS.showText ? [operatorList.argsArray[i][0]] : []);
    let fontName=null,size=0,charSpace=0,wordSpace=0; const stack=[];
    content.forEach((text,streamIndex)=>{
      for(const operation of operations(text)) {
        const a=operation.args;
        if(operation.op==='q') stack.push({fontName,size,charSpace,wordSpace});
        if(operation.op==='Q') { const prev=stack.pop(); if(prev) ({fontName,size,charSpace,wordSpace}=prev); }
        if(operation.op==='Tf') {fontName=a[0]?.value?.slice(1);size=Number(a[1]?.value);}
        if(operation.op==='Tc') charSpace=Number(a[0]?.value);
        if(operation.op==='Tw') wordSpace=Number(a[0]?.value);
        if(operation.op==='gs') {
          const graphics=page.node.Resources()?.lookup(lib.PDFName.of('ExtGState'),lib.PDFDict)?.lookup(lib.PDFName.of(a[0]?.value?.slice(1)),lib.PDFDict);
          if(graphics?.has(lib.PDFName.of('Font'))) fail('Esta página define fontes por um estado gráfico ainda não compatível.');
        }
        if(operation.op==='Tr' && Number(a[0]?.value)>=4) fail('Esta página usa texto como máscara de recorte; a edição original ainda não é compatível.');
        if(["'",'"'].includes(operation.op)) fail('Esta página usa texto com posicionamento ainda não compatível.');
        if(!['Tj','TJ'].includes(operation.op)) continue;
        if(!fontName || !size || !Number.isFinite(charSpace+wordSpace)) fail('Fonte original não identificada.');
        const dict=page.node.Resources()?.lookup(lib.PDFName.of('Font'),lib.PDFDict)?.lookup(lib.PDFName.of(fontName),lib.PDFDict);
        if(!dict) fail('Fonte original não encontrada.');
        const subtype=dict.get(lib.PDFName.of('Subtype'))?.toString();
        const encoding=dict.get(lib.PDFName.of('Encoding'))?.toString();
        if(subtype==='/Type3' || (subtype==='/Type0' && encoding!=='/Identity-H')) fail('A codificação desta fonte ainda não permite edição original.');
        const byteWidth=subtype==='/Type0'?2:1;
        const glyphs=(shows[runs.length] || []).filter(g=>typeof g==='object' && g);
        const raw=a.filter(t=>t.bytes).flatMap(t=>t.bytes);
        const codes=[]; for(let i=0;i<raw.length;i+=byteWidth) codes.push(byteWidth===2 ? raw[i]*256+raw[i+1] : raw[i]);
        if(codes.length!==glyphs.length || codes.some((code,i)=>code!==glyphs[i].originalCharCode)) fail('O texto desta página está em uma estrutura composta ainda não editável.');
        if(!fonts.has(fontName)) fonts.set(fontName,{map:new Map(),byteWidth});
        const font=fonts.get(fontName);
        glyphs.forEach(g=>{if(g.unicode && Number.isFinite(g.width)) font.map.set(g.unicode,{code:g.originalCharCode,width:g.width});});
        const base=dict.get(lib.PDFName.of('BaseFont'))?.toString().slice(1);
        // Full standard encoding is safe only without a custom Encoding dictionary/ToUnicode.
        if(Object.values(lib.StandardFonts).includes(base) && !dict.has(lib.PDFName.of('ToUnicode')) && (!encoding || encoding==='/WinAnsiEncoding') && !dict.has(lib.PDFName.of('Widths'))) {
          font.standard=lib.StandardFontEmbedder.for(base);
        }
        runs.push({...operation,id:`${streamIndex}:${operation.start}`,streamIndex,fontName,size,charSpace,wordSpace,
          text:glyphs.map(g=>g.unicode).join(''),codes,glyphs,
          adjustments:a.filter(t=>t.value && /^[+\-\d.]+$/.test(t.value)).reduce((sum,t)=>sum+Number(t.value),0)});
      }
    });
    if(runs.length!==shows.length) fail('Há textos em objetos compostos nesta página; a edição original ainda não é compatível.');
    return {content,fonts,runs};
  }
  function replacement(analysis,run,text) {
    if(/[\r\n]/.test(text)) fail('Edite um trecho por vez, sem quebras de linha.');
    if(text.length>10000) fail('O trecho ultrapassa o limite de 10.000 caracteres.');
    const font=analysis.fonts.get(run.fontName); let next=[];
    if(font.standard) {
      try {next=Array.from(font.standard.encodeText(text).asBytes()).map((code,i)=>({code,width:font.standard.widthOfTextAtSize(Array.from(text)[i],1000)}));}
      catch (_) {fail('A fonte original não contém um dos caracteres digitados. Use Adicionar texto com outra fonte.');}
    } else {
      // Prefer longest Unicode mapping (ligatures may map to several characters).
      const keys=[...font.map.keys()].sort((a,b)=>b.length-a.length);
      for(let i=0;i<text.length;) {const key=keys.find(k=>text.startsWith(k,i));if(!key) fail(`A fonte incorporada não contém o caractere “${Array.from(text.slice(i))[0]}”. Use Adicionar texto com outra fonte.`);next.push(font.map.get(key));i+=key.length;}
    }
    const advance=gs=>gs.reduce((sum,g)=>sum+g.width+run.charSpace*1000/run.size+(font.byteWidth===1 && g.code===32?run.wordSpace*1000/run.size:0),0);
    const original=run.glyphs.map(g=>({code:g.originalCharCode,width:g.width}));
    const delta=advance(next)-advance(original)+run.adjustments;
    if(!Number.isFinite(delta)) fail('Métricas de fonte inválidas.');
    const hex=next.map(g=>g.code.toString(16).padStart(font.byteWidth*2,'0')).join('');
    // Retain the original text cursor position for the following operators.
    const adjustment=Number(delta.toFixed(6));
    // PDF.js text extraction adds Tc to a numeric-only TJ; neutralize it locally.
    if(!next.length) return `0 Tc [${adjustment}] TJ ${run.charSpace} Tc`;
    return `[<${hex}> ${adjustment}] TJ`;
  }
  function apply(page,analysis,edits,lib) {
    const content=[...analysis.content];
    for(const run of [...analysis.runs].reverse()) {
      if(!Object.prototype.hasOwnProperty.call(edits,run.id)) continue;
      const src=content[run.streamIndex];
      content[run.streamIndex]=src.slice(0,run.start)+replacement(analysis,run,edits[run.id])+src.slice(run.end);
    }
    // New streams prevent changes leaking into duplicated pages with shared Contents refs.
    page.node.set(lib.PDFName.of('Contents'),page.doc.context.obj(content.map(text=>page.doc.context.register(page.doc.context.flateStream(Uint8Array.from(text,c=>c.charCodeAt(0)))))));
  }
  window.PDFNativeText={inspect,replacement,apply};
})();
