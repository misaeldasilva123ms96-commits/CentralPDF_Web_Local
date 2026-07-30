const fs = require('fs');
const vm = require('vm');

function classList(){ return { add(){}, remove(){}, toggle(){}, contains(){return false;} }; }
function ctx(){ return { fillStyle:'', strokeStyle:'', font:'', textAlign:'', globalAlpha:1, lineWidth:1, lineCap:'', lineJoin:'', setTransform(){}, fillRect(){}, clearRect(){}, drawImage(){}, strokeRect(){}, fillText(){}, save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, setLineDash(){} }; }
function element(tag='DIV'){
  return {
    classList: classList(), style:{}, dataset:{}, value:'', checked:false, disabled:false,
    tagName:tag, type:'', textContent:'', innerHTML:'', files:[], width:680, height:480,
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, appendChild(){}, remove(){},
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
if(!context.PDFVisualEditor) throw new Error('PDFVisualEditor não foi registrado');
if(context.PDFVisualEditor.hasDocument()) throw new Error('Editor deve iniciar vazio');
const t=context.PDFVisualEditor.__test;
const rect=t.normalizedRect({x:20,y:30},{x:5,y:10});
if(JSON.stringify(rect)!==JSON.stringify({x:5,y:10,width:15,height:20})) throw new Error('normalizedRect incorreto');
const font={widthOfTextAtSize(text){return text.length*5;}};
const lines=t.wrapText('um texto longo para quebrar',font,10,45);
if(lines.length<2) throw new Error('wrapText não quebrou linhas');
const rgb=t.hexRgb('#ff8000');
if(Math.abs(rgb.r-1)>1e-9 || Math.abs(rgb.g-128/255)>1e-9 || rgb.b!==0) throw new Error('hexRgb incorreto');

if(t.normalizeAngle(-90)!==270 || t.normalizeAngle(450)!==90) throw new Error('normalizeAngle incorreto');
const rotated=t.rotatePoint({x:1,y:0},{x:0,y:0},90);
if(Math.abs(rotated.x)>1e-9 || Math.abs(rotated.y-1)>1e-9) throw new Error('rotatePoint incorreto');
const placed=t.rotatedPdfPlacement({x:10,y:20,width:100,height:50,rotation:0},500);
if(Math.abs(placed.x-10)>1e-9 || Math.abs(placed.y-430)>1e-9 || placed.angle!==0) throw new Error('rotatedPdfPlacement incorreto');
const boxed={x:-20,y:-10,width:100,height:50,rotation:0};
t.clampObjectInsidePage(boxed,{width:300,height:300});
if(boxed.x<0 || boxed.y<0) throw new Error('clampObjectInsidePage incorreto');

console.log('pdf-editor tests: ok');
