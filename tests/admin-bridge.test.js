/* Privacy and consent boundary. No network or document processing. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function load(saved=new Map()) {
const calls=[],listeners={};
const context={crypto,URL,AbortController,Date,JSON,Set,clearTimeout(){},setTimeout(){return 1;},setInterval(){},navigator:{onLine:true},document:{visibilityState:'visible',readyState:'loading',getElementById(){return null},addEventListener(name,fn){listeners[name]=fn}},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},fetch:async(url,init)=>{calls.push({url,...init});return {ok:true,status:200}}};
context.window=context;context.addEventListener=(name,fn)=>listeners[name]=fn;
vm.runInNewContext(fs.readFileSync('assets/js/admin-bridge.js','utf8'),context);
return {bridge:context.CentralPDFAdminBridge,calls,listeners,saved};
}
(async()=>{
 const {bridge,calls,listeners,saved}=load();
 assert.equal(bridge.getStatus().allowed,true,'Fresh browser starts enabled');
 await new Promise(setImmediate);assert.equal(calls.length,1);
 assert.equal(bridge.record({name:'PRIVATE.pdf'},'completed'),false);
 assert.equal(bridge.record('merge','completed'),true);assert.equal(bridge.record('split','failed'),true);await bridge.flush();
 const body=JSON.parse(calls.at(-1).body);assert.deepEqual(body.events.map(e=>[e.tool,e.result]),[['merge','completed'],['split','failed']]);
 assert.equal(calls.at(-1).credentials,'omit');assert.equal(calls.at(-1).referrerPolicy,'no-referrer');assert(!JSON.stringify(calls).includes('PRIVATE.pdf'));
  bridge.record('merge','completed');bridge.setConsent(false);const before=calls.length;assert.equal(bridge.record('merge','completed'),false);await bridge.flush();assert.equal(calls.length,before);assert.equal(bridge.getStatus().pending,0);
 const reloaded=load(saved);assert.equal(reloaded.bridge.getStatus().allowed,false);assert.equal(reloaded.calls.length,0,'Saved opt-out survives reload');
 assert.equal(load(new Map([['centralpdf-usage-consent-v1','true']])).bridge.getStatus().allowed,true);
 const unreadable=load(new class extends Map {get(){throw new Error('Storage blocked')}}());assert.equal(unreadable.bridge.getStatus().allowed,false);assert.equal(unreadable.calls.length,0);
 listeners.storage({key:'centralpdf-usage-consent-v1',newValue:null});await new Promise(setImmediate);assert.equal(bridge.getStatus().allowed,true,'Removed preference restores default');
 listeners.storage({key:'centralpdf-usage-consent-v1',newValue:'false'});assert.equal(bridge.getStatus().allowed,false,'Other tabs can disable collection');
 listeners.storage({key:null,newValue:null});assert.equal(bridge.getStatus().allowed,true,'Clearing storage restores the default');
 console.log('PASS: default enabled, persisted opt-out, cross-tab updates, bounded technical schema, no document data');
})().catch(error=>{console.error(error);process.exitCode=1});
