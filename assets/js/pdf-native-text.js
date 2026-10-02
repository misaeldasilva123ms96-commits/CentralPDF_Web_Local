/* Native text replacements: rewrite text operators, never paint over original text. */
(() => {
  'use strict';
  const fail = message => { throw new Error(message); };
  const identity=()=>[1,0,0,1,0,0];
  const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];

  function extendFontMap(dict,font,lib) {
    const cmap=dict.lookupMaybe(lib.PDFName.of('ToUnicode'),lib.PDFRawStream);
    if(!cmap) return;
    const data=lib.decodePDFRawStream(cmap).decode();if(data.length>2*1024*1024)return;
    let source='';for(let i=0;i<data.length;i+=8192)source+=String.fromCharCode(...data.subarray(i,i+8192));
    const widths=new Map();
    if(font.byteWidth===1) {
      const first=dict.lookupMaybe(lib.PDFName.of('FirstChar'),lib.PDFNumber)?.asNumber();
      const values=dict.lookupMaybe(lib.PDFName.of('Widths'),lib.PDFArray);
      if(Number.isInteger(first)&&values)for(let i=0;i<values.size();i++)widths.set(first+i,values.lookup(i,lib.PDFNumber).asNumber());
    } else {
      const descendant=dict.lookupMaybe(lib.PDFName.of('DescendantFonts'),lib.PDFArray)?.lookup(0,lib.PDFDict);
      const values=descendant?.lookupMaybe(lib.PDFName.of('W'),lib.PDFArray);
      if(values)for(let i=0;i<values.size();) {
        const first=values.lookup(i++,lib.PDFNumber).asNumber(), next=values.lookup(i++);
        if(next instanceof lib.PDFArray) {for(let j=0;j<next.size();j++)widths.set(first+j,next.lookup(j,lib.PDFNumber).asNumber());}
        else {const last=next.asNumber(),width=values.lookup(i++,lib.PDFNumber).asNumber();if(last-first>65536)return;for(let code=first;code<=last;code++)widths.set(code,width);}
      }
    }
    const add=(codeHex,unicodeHex)=>{
      if(codeHex.length!==font.byteWidth*2 || unicodeHex.length%4 || unicodeHex.length>32)return;
      const code=parseInt(codeHex,16),width=widths.get(code);if(!Number.isFinite(width)||width<=0)return;
      let unicode='';for(let i=0;i<unicodeHex.length;i+=4)unicode+=String.fromCharCode(parseInt(unicodeHex.slice(i,i+4),16));
      if(!unicode || /[\u0000-\u001f\ufffd]/.test(unicode) || font.map.has(unicode))return;
      font.map.set(unicode,{code,width});
    };
    for(const block of source.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for(const pair of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>/gi))add(pair[1],pair[2]);
    }
    for(const block of source.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for(const range of block[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>\s*(<([\da-f]+)>|\[([^\]]*)\])/gi)) {
        const first=parseInt(range[1],16),last=parseInt(range[2],16);if(last-first>65536)continue;
        const entries=range[5]?[...range[5].matchAll(/<([\da-f]+)>/gi)].map(m=>m[1]):null;
        if(!entries && range[4].length!==4)continue;
        for(let code=first;code<=last;code++) {
          const unicode=entries?entries[code-first]:(parseInt(range[4],16)+code-first).toString(16).padStart(4,'0');
          if(unicode)add(code.toString(16).padStart(range[1].length,'0'),unicode);
        }
      }
    }
  }
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
      } else if ((c === '<' && source[i] === '<') || (c === '>' && source[i] === '>')) {
        i++; tokens.push({start,end:i,value:c+c});
      } else if ('[]'.includes(c)) tokens.push({start,end:i,value:c});
      else {
        while (i < source.length && !/[\s\0()[\]<>/%]/.test(source[i])) i++;
        // A solitary dictionary delimiter is invalid.
        if (i === start+1 && '<>'.includes(c)) fail('Esta página usa uma estrutura ainda não compatível com a edição original.');
        const value=source.slice(start,i);
        tokens.push({start,end:i,value:c==='/'?value.replace(/#([\da-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))):value});
      }
      if (tokens.length > 250000) fail('Página muito complexa para editar o texto original.');
    }
    return tokens;
  }
  function operations(source) {
    const result=[]; let args=[]; const containers=[];
    for (const token of tokenize(source)) {
      if (!containers.length && token.value === 'BI') fail('Página com imagem inline: edição original indisponível.');
      if (token.value === '[' || token.value === '<<') containers.push(token.value);
      if (token.value === ']' || token.value === '>>') {
        if(containers.pop() !== (token.value === ']' ? '[' : '<<')) fail('Estrutura de conteúdo PDF inválida.');
      }
      if (!containers.length && token.value && !['[',']','<<','>>','true','false','null'].includes(token.value) && !token.value.startsWith('/') && !/^[+\-\d.]+$/.test(token.value)) {
        result.push({op:token.value,args,start:args[0]?.start ?? token.start,end:token.end}); args=[];
      } else args.push(token);
    }
    if(containers.length) fail('Estrutura de conteúdo PDF incompleta.');
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
    let fontName=null,size=0,charSpace=0,wordSpace=0,leading=0,hScale=1,rise=0,ctm=identity(),tm=identity(),line=identity(); const stack=[];
    const moveLine=(x,y)=>{line=multiply(line,[1,0,0,1,x,y]);tm=[...line];};
    content.forEach((text,streamIndex)=>{
      for(const operation of operations(text)) {
        const a=operation.args;
        // ActualText overrides extracted text independently of the visible glyphs.
        // Do not leave stale accessibility text behind after a replacement.
        if(operation.op==='BDC' || operation.op==='DP') {
          const named=a[1]?.value?.startsWith('/') ? page.node.Resources()?.lookupMaybe(lib.PDFName.of('Properties'),lib.PDFDict)?.lookupMaybe(lib.PDFName.of(a[1].value.slice(1)),lib.PDFDict) : null;
          if(a.some(t=>t.value==='/ActualText') || named?.has(lib.PDFName.of('ActualText'))) fail('Esta página usa ActualText (texto alternativo de acessibilidade). A edição original ainda não pode atualizar esse conteúdo com segurança.');
        }
        if(operation.op==='q') stack.push({fontName,size,charSpace,wordSpace,leading,hScale,rise,ctm:[...ctm]});
        if(operation.op==='Q') { const prev=stack.pop(); if(prev) ({fontName,size,charSpace,wordSpace,leading,hScale,rise,ctm}=prev); }
        const numbers=a.map(t=>Number(t.value));
        if(operation.op==='cm')ctm=multiply(ctm,numbers);
        if(operation.op==='BT'){tm=identity();line=identity();}
        if(operation.op==='Tm'){tm=[...numbers];line=[...numbers];}
        if(operation.op==='Td'||operation.op==='TD'){if(operation.op==='TD')leading=-numbers[1];moveLine(numbers[0],numbers[1]);}
        if(operation.op==='TL')leading=numbers[0];
        if(operation.op==='Tz')hScale=numbers[0]/100;
        if(operation.op==='Ts')rise=numbers[0];
        if(operation.op==='T*')moveLine(0,-leading);
        if(operation.op==='Tf') {fontName=a[0]?.value?.slice(1);size=Number(a[1]?.value);}
        if(operation.op==='Tc') charSpace=Number(a[0]?.value);
        if(operation.op==='Tw') wordSpace=Number(a[0]?.value);
        if(operation.op==='gs') {
          const graphics=page.node.Resources()?.lookup(lib.PDFName.of('ExtGState'),lib.PDFDict)?.lookup(lib.PDFName.of(a[0]?.value?.slice(1)),lib.PDFDict);
          if(graphics?.has(lib.PDFName.of('Font'))) fail('Esta página define fontes por um estado gráfico ainda não compatível.');
        }
        if(operation.op==='Tr' && Number(a[0]?.value)>=4) fail('Esta página usa texto como máscara de recorte; a edição original ainda não é compatível.');
        if(operation.op==='"'){wordSpace=numbers[0];charSpace=numbers[1];}
        if(["'",'"'].includes(operation.op))moveLine(0,-leading);
        if(!['Tj','TJ',"'",'"'].includes(operation.op)) continue;
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
        const adjustments=operation.op==='TJ'?a.filter(t=>t.value && /^[+\-\d.]+$/.test(t.value)).reduce((sum,t)=>sum+Number(t.value),0):0;
        const advance=glyphs.reduce((sum,g)=>sum+g.width*size/1000+charSpace+(byteWidth===1&&g.originalCharCode===32?wordSpace:0),0)-adjustments*size/1000;
        const matrix=multiply(ctm,tm);
        const geometry=[[0,rise-size*.22],[advance*hScale,rise-size*.22],[advance*hScale,rise+size*.85],[0,rise+size*.85]].map(([x,y])=>point(matrix,x,y));
        runs.push({...operation,id:`${streamIndex}:${operation.start}`,streamIndex,fontName,size,charSpace,wordSpace,geometry,
          text:glyphs.map(g=>g.unicode).join(''),codes,glyphs,
          adjustments});
        tm=multiply(tm,[1,0,0,1,advance*hScale,0]);
        font.dict=dict;
      }
    });
    if(runs.length!==shows.length) fail('Há textos em objetos compostos nesta página; a edição original ainda não é compatível.');
    for(const font of fonts.values()) {try {extendFontMap(font.dict,font,lib);}catch(_){/* Keep the verified glyphs if an optional font map cannot be read. */}}
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
    const prefix=run.op==='"'?`${run.wordSpace} Tw ${run.charSpace} Tc T* `:run.op==="'"?'T* ':'';
    if(!next.length) return `${prefix}0 Tc [${adjustment}] TJ ${run.charSpace} Tc`;
    return `${prefix}[<${hex}> ${adjustment}] TJ`;
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
