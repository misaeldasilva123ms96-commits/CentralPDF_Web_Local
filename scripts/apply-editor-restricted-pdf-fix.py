from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label} não encontrado')
    return text.replace(old, new, 1)


def replace_block(text: str, start: str, end: str, replacement: str, label: str) -> str:
    pattern = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
    if not pattern.search(text):
        if replacement in text:
            return text
        raise SystemExit(f'{label} não encontrado')
    return pattern.sub(replacement, text, count=1)


editor_path = Path('assets/js/pdf-editor.js')
editor = editor_path.read_text(encoding='utf-8')

editor = replace_once(
    editor,
    "    loadGeneration: 0,\n",
    "    loadGeneration: 0,\n    currentRenderGeneration: 0,\n    thumbnailRenderGeneration: 0,\n    activeRenderTask: null,\n",
    'Estado de renderização',
)

helpers_marker = "  async function loadFile(file) {"
helpers = """  function isEncryptedPdfError(error) {
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');
    return name === 'EncryptedPDFError' || /encrypted|encryption|criptograf/i.test(message);
  }

  function isRenderCancellation(error) {
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');
    return name === 'RenderingCancelledException' || /rendering cancelled/i.test(message);
  }

  function cancelActivePageRender() {
    const task = state.activeRenderTask;
    state.activeRenderTask = null;
    if (!task || typeof task.cancel !== 'function') return;
    try { task.cancel(); } catch (_) {}
  }

  async function loadPdfSource(file, sourceId) {
    const bytes = await file.arrayBuffer();
    const renderedBytes = bytes.slice(0);
    const libraryBytes = bytes.slice(0);
    const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(renderedBytes) });
    const rendered = await loadingTask.promise;
    let pdfLibDoc = null;
    let compatibilityMode = 'native';
    try {
      pdfLibDoc = await window.PDFLib.PDFDocument.load(libraryBytes, { ignoreEncryption: false, updateMetadata: false });
    } catch (error) {
      if (!isEncryptedPdfError(error)) {
        try { await loadingTask.destroy?.(); } catch (_) {}
        throw error;
      }
      compatibilityMode = 'raster';
    }
    return {
      id: sourceId,
      name: file.name,
      file,
      rendered,
      loadingTask,
      pdfLibDoc,
      bytes: libraryBytes,
      compatibilityMode,
      restricted: compatibilityMode === 'raster'
    };
  }

  async function renderPdfPageToCanvas(renderedPage, viewport) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const task = renderedPage.render({ canvasContext: context, viewport });
    await task.promise;
    return canvas;
  }

  async function createRasterizedPdfPage(output, source, model) {
    const renderedPage = await source.rendered.getPage(model.sourceIndex + 1);
    const base = renderedPage.getViewport({ scale: 1, rotation: getPageRenderRotation(model) });
    const scale = Math.max(1, Math.min(2, 2400 / Math.max(base.width, base.height)));
    const viewport = renderedPage.getViewport({ scale, rotation: getPageRenderRotation(model) });
    const canvas = await renderPdfPageToCanvas(renderedPage, viewport);
    const image = await output.embedPng(dataUrlBytes(canvas.toDataURL('image/png')));
    const page = output.addPage([model.width, model.height]);
    page.drawImage(image, { x: 0, y: 0, width: model.width, height: model.height });
    canvas.width = 1;
    canvas.height = 1;
    return page;
  }

"""
if 'async function loadPdfSource(file, sourceId)' not in editor:
    editor = replace_once(editor, helpers_marker, helpers + helpers_marker, 'Inserção dos helpers')

load_replacement = """  async function loadFile(file) {
    init();
    reset();
    if (!file) return;
    if (!window.PDFLib || !window.pdfjsLib) throw new Error('Os motores PDF não carregaram. Verifique a conexão com a internet.');
    await ensureWorker();
    const generation = ++state.loadGeneration;
    setEditorStatus('Lendo páginas e preparando o editor...', 'processing');
    const sourceId = nextSourceId();
    const source = await loadPdfSource(file, sourceId);
    state.sources.set(sourceId, source);
    for (let index = 0; index < source.rendered.numPages; index++) {
      if (generation !== state.loadGeneration) return;
      const page = await source.rendered.getPage(index + 1);
      const sourceRotation = normalizeAngle(Number(page.rotate || 0));
      const viewport = page.getViewport({ scale: 1, rotation: sourceRotation });
      state.pages.push({
        id: nextPageId(), kind: 'pdf', sourceId, sourceIndex: index,
        width: viewport.width, height: viewport.height, sourceRotation, rotation: 0,
        crop: null, objects: []
      });
    }
    state.activeIndex = 0;
    await renderThumbnails();
    await renderCurrentPage();
    const compatible = source.compatibilityMode === 'raster';
    setEditorStatus(
      compatible
        ? `${state.pages.length} página(s) carregada(s) em modo compatível. O PDF possui restrições internas; a aparência será preservada e o conteúdo-base será achatado somente na exportação.`
        : `${state.pages.length} página(s) carregada(s). Escolha uma ferramenta e edite visualmente.`,
      compatible ? '' : 'success'
    );
    updatePageControls();
    return state.pages.length;
  }

  function currentPage() { return state.pages[state.activeIndex] || null; }"""
editor = replace_block(
    editor,
    "  async function loadFile(file) {",
    "  function currentPage() { return state.pages[state.activeIndex] || null; }",
    load_replacement,
    'Carregamento principal',
)

editor = replace_once(
    editor,
    "  function deactivate() {\n    state.pendingGesture = null;\n  }",
    "  function deactivate() {\n    state.pendingGesture = null;\n    state.currentRenderGeneration += 1;\n    cancelActivePageRender();\n  }",
    'Desativação do editor',
)
editor = replace_once(
    editor,
    "  function reset() {\n    state.pages = [];",
    "  function reset() {\n    state.currentRenderGeneration += 1;\n    state.thumbnailRenderGeneration += 1;\n    cancelActivePageRender();\n    state.pages = [];",
    'Reset do editor',
)

render_replacement = """  async function renderCurrentPage() {
    const generation = ++state.currentRenderGeneration;
    cancelActivePageRender();
    const page = currentPage();
    if (!page) { renderEmpty(); return; }
    const stage = $('#editorStage');
    stage.classList.remove('empty');
    stage.classList.toggle('crop-adjusting', Boolean(state.tempCrop));
    let renderedPage = null;
    let displayWidth = page.width;
    let displayHeight = page.height;
    const renderRotation = getPageRenderRotation(page);
    if (page.kind === 'pdf') {
      const source = state.sources.get(page.sourceId);
      renderedPage = await source.rendered.getPage(page.sourceIndex + 1);
      if (generation !== state.currentRenderGeneration) return;
      const baseViewport = renderedPage.getViewport({ scale: 1, rotation: renderRotation });
      displayWidth = baseViewport.width;
      displayHeight = baseViewport.height;
    }
    const viewportLimitW = 860;
    const viewportLimitH = 1020;
    const fit = Math.min(viewportLimitW / displayWidth, viewportLimitH / displayHeight, 1.45);
    state.scale = fit * (state.zoom / 100);
    const cssWidth = Math.max(160, Math.round(displayWidth * state.scale));
    const cssHeight = Math.max(160, Math.round(displayHeight * state.scale));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let renderCanvas = null;
    if (renderedPage) {
      const viewport = renderedPage.getViewport({ scale: state.scale * dpr, rotation: renderRotation });
      renderCanvas = document.createElement('canvas');
      renderCanvas.width = Math.max(1, Math.ceil(viewport.width));
      renderCanvas.height = Math.max(1, Math.ceil(viewport.height));
      const renderContext = renderCanvas.getContext('2d', { alpha: false });
      renderContext.fillStyle = '#fff';
      renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
      const task = renderedPage.render({ canvasContext: renderContext, viewport });
      state.activeRenderTask = task;
      try {
        await task.promise;
      } catch (error) {
        if (isRenderCancellation(error)) return;
        throw error;
      } finally {
        if (state.activeRenderTask === task) state.activeRenderTask = null;
      }
      if (generation !== state.currentRenderGeneration) return;
    }
    if (generation !== state.currentRenderGeneration) return;
    stage.style.width = `${cssWidth}px`;
    stage.style.height = `${cssHeight}px`;
    const base = $('#editorBaseCanvas');
    const pixelWidth = renderCanvas?.width || Math.round(cssWidth * dpr);
    const pixelHeight = renderCanvas?.height || Math.round(cssHeight * dpr);
    base.style.width = `${cssWidth}px`;
    base.style.height = `${cssHeight}px`;
    base.width = pixelWidth;
    base.height = pixelHeight;
    const baseCtx = base.getContext('2d', { alpha: false });
    baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    baseCtx.fillStyle = '#fff';
    baseCtx.fillRect(0, 0, base.width, base.height);
    if (renderCanvas) {
      baseCtx.drawImage(renderCanvas, 0, 0, base.width, base.height);
      renderCanvas.width = 1;
      renderCanvas.height = 1;
    }
    const interaction = $('#editorInteractionCanvas');
    interaction.width = base.width; interaction.height = base.height;
    interaction.style.width = base.style.width; interaction.style.height = base.style.height;
    const layer = $('#editorObjectLayer');
    layer.style.width = base.style.width; layer.style.height = base.style.height;
    renderObjects();
    drawVectorObjects();
    drawCropOverlay();
    $('#editorPageIndicator').textContent = `${state.activeIndex + 1} / ${state.pages.length}`;
    $('#editorCurrentPageInfo').textContent = `Página ${state.activeIndex + 1} • ${Math.round(displayWidth)} × ${Math.round(displayHeight)} pt • ${pageOrientation({ width: displayWidth, height: displayHeight })}${page.crop ? ' • recortada' : ''}`;
    updatePageControls();
  }

  function updateEditorPointerRouting() {"""
editor = replace_block(
    editor,
    "  async function renderCurrentPage() {",
    "  function updateEditorPointerRouting() {",
    render_replacement,
    'Renderização da página atual',
)

add_pdf_replacement = """  async function addPdfPages(files) {
    if(!files.length)return; if(!window.pdfjsLib||!window.PDFLib)throw new Error('Motores PDF indisponíveis.');
    checkpoint(); let insertAt=state.activeIndex+1; let compatibleCount=0;
    for(const file of files){
      const sourceId=nextSourceId();
      const source=await loadPdfSource(file,sourceId);
      state.sources.set(sourceId,source);
      if(source.compatibilityMode==='raster')compatibleCount+=1;
      const additions=[];
      for(let index=0;index<source.rendered.numPages;index++){
        const p=await source.rendered.getPage(index+1); const sourceRotation=normalizeAngle(Number(p.rotate||0)); const v=p.getViewport({scale:1,rotation:sourceRotation});
        additions.push({id:nextPageId(),kind:'pdf',sourceId,sourceIndex:index,width:v.width,height:v.height,sourceRotation,rotation:0,crop:null,objects:[]});
      }
      state.pages.splice(insertAt,0,...additions); insertAt+=additions.length;
    }
    $('#editorPdfInput').value=''; await renderThumbnails(); await renderCurrentPage(); updatePageControls();
    setEditorStatus(compatibleCount ? 'Páginas adicionadas em modo compatível. PDFs com restrições serão achatados somente na exportação.' : 'Páginas de outro PDF adicionadas ao documento.', compatibleCount ? '' : 'success');
  }

  function addBlankPage() {"""
editor = replace_block(
    editor,
    "  async function addPdfPages(files) {",
    "  function addBlankPage() {",
    add_pdf_replacement,
    'Adição de páginas PDF',
)

editor = replace_once(
    editor,
    "    if(state.pages.length<=1){setEditorStatus('O documento precisa manter pelo menos uma página.', 'error');return;}",
    "    if(state.pages.length<=1){setEditorStatus('O documento precisa manter pelo menos uma página.');return;}",
    'Aviso de página mínima',
)

thumb_replacement = """  async function renderThumbnails() {
    const generation=++state.thumbnailRenderGeneration;
    const list=$('#editorThumbnailList'); if(!list)return; list.innerHTML='';
    for(let index=0;index<state.pages.length;index++){
      if(generation!==state.thumbnailRenderGeneration)return;
      const page=state.pages[index]; const button=document.createElement('button'); button.type='button'; button.className=`editor-thumbnail${index===state.activeIndex?' active':''}`;
      const canvas=document.createElement('canvas'); canvas.width=108; canvas.height=144; const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff';ctx.fillRect(0,0,108,144);
      if(page.kind==='pdf'){
        try{
          const source=state.sources.get(page.sourceId);const renderedPage=await source.rendered.getPage(page.sourceIndex+1);const rotation=getPageRenderRotation(page);const base=renderedPage.getViewport({scale:1,rotation});const scale=Math.min(100/base.width,132/base.height);const viewport=renderedPage.getViewport({scale,rotation});const temp=await renderPdfPageToCanvas(renderedPage,viewport);
          if(generation!==state.thumbnailRenderGeneration)return;
          ctx.drawImage(temp,(108-temp.width)/2,(144-temp.height)/2);temp.width=1;temp.height=1;
        }catch(error){if(!isRenderCancellation(error))drawBlankThumb(ctx,'PDF');}
      }else drawBlankThumb(ctx,'Em branco');
      if(generation!==state.thumbnailRenderGeneration)return;
      button.appendChild(canvas); const span=document.createElement('span');span.textContent=`Página ${index+1} · ${pageOrientation(page)}`;button.appendChild(span);
      if(page.objects.length){const badge=document.createElement('small');badge.textContent=`${page.objects.length} edição(ões)`;button.appendChild(badge);}
      button.addEventListener('click',()=>{state.activeIndex=index;state.selectedObjectId=null;renderThumbnails();renderCurrentPage();updateInspector();});
      list.appendChild(button);
    }
    if(generation===state.thumbnailRenderGeneration)$('#editorPageIndicator').textContent=`${state.pages.length?state.activeIndex+1:0} / ${state.pages.length}`;
  }

  function drawBlankThumb(ctx,label){"""
editor = replace_block(
    editor,
    "  async function renderThumbnails() {",
    "  function drawBlankThumb(ctx,label){",
    thumb_replacement,
    'Miniaturas',
)

export_old = """      if(model.kind==='pdf'){
        const source=state.sources.get(model.sourceId); const [copied]=await output.copyPages(source.pdfLibDoc,[model.sourceIndex]); page=copied; output.addPage(page);
      }else page=output.addPage([model.width,model.height]);
      const exportRotation=getExportRotation(model,page);
      if(model.kind==='pdf')page.setRotation(degrees(exportRotation));"""
export_new = """      let source=null; let rasterized=false;
      if(model.kind==='pdf'){
        source=state.sources.get(model.sourceId);
        if(source?.pdfLibDoc){const [copied]=await output.copyPages(source.pdfLibDoc,[model.sourceIndex]);page=copied;output.addPage(page);}
        else{page=await createRasterizedPdfPage(output,source,model);rasterized=true;}
      }else page=output.addPage([model.width,model.height]);
      const exportRotation=rasterized?0:getExportRotation(model,page);
      if(model.kind==='pdf'&&!rasterized)page.setRotation(degrees(exportRotation));"""
editor = replace_once(editor, export_old, export_new, 'Exportação compatível')
editor = replace_once(
    editor,
    "    return {bytes:await output.save({useObjectStreams:true}),message:`PDF editado com ${state.pages.length} página(s) e ${state.pages.reduce((sum,p)=>sum+p.objects.length,0)} objeto(s) adicionados.`};",
    "    const compatiblePages=state.pages.filter(model=>model.kind==='pdf'&&state.sources.get(model.sourceId)?.compatibilityMode==='raster').length;\n    return {bytes:await output.save({useObjectStreams:true}),message:`PDF editado com ${state.pages.length} página(s) e ${state.pages.reduce((sum,p)=>sum+p.objects.length,0)} objeto(s) adicionados.${compatiblePages?` ${compatiblePages} página(s) restrita(s) foram achatadas para preservar a aparência.`:''}`};",
    'Mensagem de exportação',
)

restore_old = """      const bytes = await file.arrayBuffer();
      const renderedBytes = bytes.slice(0);
      const libraryBytes = bytes.slice(0);
      const rendered = await window.pdfjsLib.getDocument({ data: new Uint8Array(renderedBytes) }).promise;
      const pdfLibDoc = await window.PDFLib.PDFDocument.load(libraryBytes, { ignoreEncryption: false, updateMetadata: false });
      state.sources.set(sourceDescriptor.id, { id: sourceDescriptor.id, name: sourceDescriptor.name || file.name, file, rendered, pdfLibDoc, bytes: libraryBytes });"""
restore_new = """      const source = await loadPdfSource(file, sourceDescriptor.id);
      source.name = sourceDescriptor.name || file.name;
      state.sources.set(sourceDescriptor.id, source);"""
editor = replace_once(editor, restore_old, restore_new, 'Restauração de projeto')

editor = replace_once(
    editor,
    "__test:{ normalizedRect, wrapText, hexRgb, resolveStandardFont, normalizeAngle, rotatePoint, rotateVector, rotatedPdfPlacement, clampObjectInsidePage, getPageRenderRotation, pageOrientation, rotateVisualPoint, rotateVisualRect, rotatePageGeometry, visualPointToPdf, visualRectToPdfBox, getExportRotation }",
    "__test:{ normalizedRect, wrapText, hexRgb, resolveStandardFont, normalizeAngle, rotatePoint, rotateVector, rotatedPdfPlacement, clampObjectInsidePage, getPageRenderRotation, pageOrientation, rotateVisualPoint, rotateVisualRect, rotatePageGeometry, visualPointToPdf, visualRectToPdfBox, getExportRotation, isEncryptedPdfError, isRenderCancellation }",
    'Exports de teste',
)

editor_path.write_text(editor, encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8').replace('centralpdf-v1.2.1-pages-3', 'centralpdf-v1.2.1-pages-4')
sw_path.write_text(sw, encoding='utf-8')
for test_name in ('tests/version-sync-1.1.1.test.py','tests/editor-orientation-delivery.test.py','tests/workspace-visual-fixes-1.2.2.test.py'):
    path = Path(test_name)
    text = path.read_text(encoding='utf-8').replace('centralpdf-v1.2.1-pages-3', 'centralpdf-v1.2.1-pages-4')
    path.write_text(text, encoding='utf-8')

Path('tests/pdf-editor-restricted.test.js').write_text("""const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('assets/js/pdf-editor.js','utf8');
const elements=new Map();
function element(){return {style:{},classList:{add(){},remove(){},toggle(){},contains(){return true}},addEventListener(){},appendChild(){},insertBefore(){},setAttribute(){},getContext(){return {fillRect(){},clearRect(){},setTransform(){},drawImage(){}}},querySelector(){return null},querySelectorAll(){return []}};}
const context={console,window:{CentralPDFEnginePaths:{},addEventListener(){},dispatchEvent(){},devicePixelRatio:1},document:{readyState:'loading',querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],addEventListener(){},createElement:element},CustomEvent:function(){}};
context.window.window=context.window;context.window.document=context.document;vm.createContext(context);vm.runInContext(code,context);
const t=context.window.PDFVisualEditor.__test;
if(!t.isEncryptedPdfError({name:'EncryptedPDFError',message:'encrypted'}))throw new Error('encrypted classification failed');
if(t.isEncryptedPdfError(new Error('arquivo inválido')))throw new Error('false encrypted classification');
if(!t.isRenderCancellation({name:'RenderingCancelledException'}))throw new Error('render cancellation classification failed');
for(const snippet of ['compatibilityMode = \'raster\'','createRasterizedPdfPage','activeRenderTask','currentRenderGeneration','thumbnailRenderGeneration'])if(!code.includes(snippet))throw new Error(`missing ${snippet}`);
console.log('pdf-editor-restricted: passed');
""", encoding='utf-8')

Path('tests/editor-restricted-runtime.test.py').write_text("""from playwright.sync_api import sync_playwright
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css='\\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/css/styles.css','assets/css/ux-redesign.css','assets/css/layout-controls.css'])
html=re.sub(r'\\s*<link rel=\"stylesheet\" href=\"[^\"]+\"\\s*/?>','',html)
html=html.replace('</head>',f'<style>{css}</style></head>')
html=re.sub(r'\\s*<script src=\"[^\"]+\"></script>','',html)
scripts='\\n'.join((root/name).read_text(encoding='utf-8') for name in ['assets/js/split-planner.js','assets/js/advanced-planner.js','assets/js/organizer-planner.js','assets/js/pdf-editor.js','assets/js/ux-enhancements.js','assets/js/app.js','assets/js/layout-controls.js'])
html=html.replace('</body>',f'<script>{scripts}</script></body>')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1400,'height':900})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('[data-tool=\"editPdf\"].tool-card').click()
    page.evaluate(r'''() => {
      const active=new WeakSet();
      const makePage=()=>({
        rotate:0,
        getViewport:({scale=1,rotation=0}={})=>({width:595*scale,height:842*scale,rotation}),
        render:({canvasContext})=>{
          const canvas=canvasContext.canvas;
          if(active.has(canvas))throw new Error('Cannot use the same canvas during multiple render() operations.');
          active.add(canvas);let rejectPromise;let timer;
          const promise=new Promise((resolve,reject)=>{rejectPromise=reject;timer=setTimeout(()=>{active.delete(canvas);resolve();},25)});
          return {promise,cancel(){clearTimeout(timer);active.delete(canvas);const error=new Error('Rendering cancelled');error.name='RenderingCancelledException';rejectPromise(error);}};
        }
      });
      window.pdfjsLib={GlobalWorkerOptions:{workerSrc:'test-worker.mjs'},getDocument(){return {promise:Promise.resolve({numPages:1,getPage:async()=>makePage()}),destroy:async()=>{}}}};
      const pageModel={getSize:()=>({width:595,height:842}),drawImage(){},setCropBox(){},setRotation(){},drawText(){},drawRectangle(){},drawLine(){}};
      window.PDFLib={
        PDFDocument:{
          load:async()=>{const error=new Error('Input document to PDFDocument.load is encrypted.');error.name='EncryptedPDFError';throw error;},
          create:async()=>({addPage:()=>pageModel,embedPng:async()=>({}),embedFont:async()=>({}),copyPages:async()=>{throw new Error('copyPages must not be used for restricted PDFs')},save:async()=>new Uint8Array([1,2,3])})
        },
        StandardFonts:{Helvetica:'Helvetica'},rgb:()=>({}),degrees:value=>value
      };
    }''')
    page.evaluate("PDFVisualEditor.loadFile(new File([new Uint8Array([1,2,3])],'restrito.pdf',{type:'application/pdf'}))")
    page.wait_for_function("PDFVisualEditor.hasDocument()")
    page.wait_for_function("document.querySelector('#editorStatus').textContent.includes('modo compatível')")
    page.evaluate("""() => { const zoom=document.querySelector('#editorZoom'); for(const value of [90,110,80,125,100]){zoom.value=value;zoom.dispatchEvent(new Event('input',{bubbles:true}));} }""")
    page.wait_for_timeout(120)
    result=page.evaluate("PDFVisualEditor.exportPdf().then(result=>({length:result.bytes.length,message:result.message}))")
    assert result['length']==3
    assert 'achatadas' in result['message']
    assert not any('same canvas' in error.lower() for error in errors), errors
    assert not errors, errors
    print('editor-restricted-runtime: passed')
    browser.close()
""", encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
entry = """## Editor PDF — documentos restritos e renderização concorrente

- abre PDFs com criptografia de permissões e senha de usuário vazia em modo compatível;
- preserva a aparência do documento e achata apenas a página-base na exportação quando o pdf-lib não consegue copiar a origem;
- mantém textos, imagens, desenhos, recortes e rotação editáveis sobre a página compatível;
- cancela renderizações anteriores e usa canvas temporário por operação, eliminando o erro de canvas reutilizado;
- evita intercalamento de miniaturas de execuções antigas;
- reduz o aviso de página mínima a uma orientação sem registro de erro;
- renova o cache do aplicativo para entregar o runtime corrigido.

"""
if entry not in changelog:
    changelog_path.write_text(entry + changelog, encoding='utf-8')
