const fs = require('fs');
const vm = require('vm');

function classList(){ return { add(){}, remove(){}, toggle(){}, contains(){return false;} }; }
function ctx(){ return { fillStyle:'', strokeStyle:'', font:'', textAlign:'', globalAlpha:1, lineWidth:1, lineCap:'', lineJoin:'', setTransform(){}, fillRect(){}, clearRect(){}, drawImage(){}, strokeRect(){}, fillText(){}, save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, setLineDash(){} }; }
function element(tag='DIV'){
  return {
    classList: classList(), style:{}, dataset:{}, value:'', checked:false, disabled:false,
    tagName:tag, type:'', textContent:'', innerHTML:'', files:[], width:680, height:480,
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, appendChild(){}, remove(){}, insertBefore(){},
    querySelector(){ return element(); }, querySelectorAll(){ return []; }, getContext(){ return ctx(); },
    showModal(){}, close(){}, click(){}, focus(){}, setPointerCapture(){}, releasePointerCapture(){},
    getBoundingClientRect(){ return {left:0,top:0,width:680,height:480}; },
  };
}
const elements = new Map();
const documentStub = {
  readyState:'complete',
  querySelector(selector){ if(!elements.has(selector)) elements.set(selector, element(selector.includes('Canvas') || selector.includes('canvas') ? 'CANVAS':'DIV')); return elements.get(selector); },
  querySelectorAll(){ return []; }, addEventListener(){}, createElement(tag){ return element(String(tag).toUpperCase()); }, body:element('BODY')
};
const context={
  console, document:documentStub, window:null, globalThis:null,
  devicePixelRatio:1, setTimeout, clearTimeout, Uint8Array, ArrayBuffer, Blob,
  Image:function(){}, atob:(v)=>Buffer.from(v,'base64').toString('binary'),
  createImageBitmap:async()=>({width:1,height:1,close(){}}), CustomEvent:function(){},
};
context.window=context; context.globalThis=context; context.window.addEventListener=()=>{}; context.window.dispatchEvent=()=>{};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../assets/js/pdf-editor.js'),'utf8'),context,{filename:'assets/js/pdf-editor.js'});
const t=context.PDFVisualEditor.__test;

if(t.pageOrientation({width:842,height:595})!=='Paisagem') throw new Error('Paisagem não reconhecida');
if(t.pageOrientation({width:595,height:842})!=='Retrato') throw new Error('Retrato não reconhecido');
if(t.getPageRenderRotation({sourceRotation:90,rotation:270})!==0) throw new Error('Rotação total incorreta');

const page={
  kind:'pdf', width:595, height:842, sourceRotation:0, rotation:0, crop:{x:10,y:20,width:100,height:200},
  objects:[
    {type:'text',x:100,y:200,width:120,height:40,rotation:0},
    {type:'path',points:[{x:10,y:20},{x:30,y:50}],width:2}
  ]
};
t.rotatePageGeometry(page,90);
if(page.width!==842 || page.height!==595 || page.rotation!==90) throw new Error('Geometria da página não girou');
if(page.objects[0].rotation!==90) throw new Error('Objeto não acompanhou a rotação da página');
if(page.crop.width!==200 || page.crop.height!==100) throw new Error('Recorte não acompanhou a rotação');

const r0=t.visualPointToPdf({x:20,y:30},0,595,842);
if(r0.x!==20 || r0.y!==812) throw new Error('Mapeamento PDF 0° incorreto');
const r90=t.visualPointToPdf({x:20,y:30},90,595,842);
if(r90.x!==30 || r90.y!==20) throw new Error('Mapeamento PDF 90° incorreto');
const r270=t.visualPointToPdf({x:20,y:30},270,595,842);
if(r270.x!==565 || r270.y!==822) throw new Error('Mapeamento PDF 270° incorreto');

const box=t.visualRectToPdfBox({x:10,y:20,width:100,height:50},90,595,842);
if(JSON.stringify(box)!==JSON.stringify({x:20,y:10,width:50,height:100})) throw new Error(`Crop 90° incorreto: ${JSON.stringify(box)}`);

const mockPage={getRotation:()=>({angle:90}),getSize:()=>({width:595,height:842})};
const placement=t.rotatedPdfPlacement({x:10,y:20,width:100,height:50,rotation:0},{kind:'pdf',sourceRotation:90,rotation:0},mockPage);
if(Math.abs(placement.x-70)>1e-9 || Math.abs(placement.y-10)>1e-9 || placement.angle!==90) throw new Error(`Posicionamento rotacionado incorreto: ${JSON.stringify(placement)}`);

console.log('pdf-editor orientation tests: ok');
