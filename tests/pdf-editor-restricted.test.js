const fs=require('fs');
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
for(const snippet of ["compatibilityMode = 'raster'",'createRasterizedPdfPage','activeRenderTask','currentRenderGeneration','thumbnailRenderGeneration'])if(!code.includes(snippet))throw new Error(`missing ${snippet}`);
console.log('pdf-editor-restricted: passed');
