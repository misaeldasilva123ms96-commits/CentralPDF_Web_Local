const fs = require('fs');
const vm = require('vm');
const AdvancedPlanner = require('../assets/js/advanced-planner.js');
const SplitPlanner = require('../assets/js/split-planner.js');

function classList(){ return { add(){}, remove(){}, toggle(){}, contains(){return false;} }; }
function element(){
  return {
    classList: classList(), style:{ setProperty(){} }, dataset:{}, value:'', checked:false, disabled:false,
    tagName:'DIV', type:'', textContent:'', innerHTML:'', files:[], selectedOptions:[{textContent:''}],
    addEventListener(){}, removeEventListener(){}, setAttribute(){}, appendChild(){}, remove(){},
    querySelector(){ return element(); }, querySelectorAll(){ return []; },
    showModal(){}, close(){}, click(){}, focus(){},
  };
}
const documentStub = {
  querySelector(){ return element(); }, querySelectorAll(){ return []; }, addEventListener(){},
  createElement(){ return element(); }, body: element(),
};
const context = {
  console, document: documentStub, AdvancedPlanner, SplitPlanner,
  window: null, globalThis: null, localStorage:{setItem(){},getItem(){return null;}},
  URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}}, Blob, Uint8Array, ArrayBuffer,
  setTimeout(fn){ if(typeof fn==='function') fn(); }, clearTimeout(){},
  Image: function(){}, createImageBitmap: async()=>({width:1,height:1,close(){}}),
};
context.window=context; context.globalThis=context; context.window.scrollTo=()=>{};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../assets/js/app.js'),'utf8'), context, {filename:'assets/js/app.js'});
console.log('app-load-smoke: passed');
