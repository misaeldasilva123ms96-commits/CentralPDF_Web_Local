/* Privacy and consent boundary. No network or document processing. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const calls=[],listeners={},saved=new Map();
const context={crypto,URL,AbortController,Date,JSON,Set,clearTimeout(){},setTimeout(){return 1;},setInterval(){},navigator:{onLine:true},document:{visibilityState:'visible',readyState:'loading',getElementById(){return null},addEventListener(name,fn){listeners[name]=fn}},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},fetch:async(url,init)=>{calls.push({url,...init});return {ok:true,status:200}}};
context.window=context;context.addEventListener=(name,fn)=>listeners[name]=fn;
vm.runInNewContext(fs.readFileSync('assets/js/admin-bridge.js','utf8'),context);
(async()=>{
 const bridge=context.CentralPDFAdminBridge;
 assert.equal(bridge.record('merge','completed'),false);assert.equal(calls.length,0);
 bridge.setConsent(true);await new Promise(setImmediate);
 assert.equal(bridge.record({name:'PRIVATE.pdf'},'completed'),false);
 assert.equal(bridge.record('merge','completed'),true);assert.equal(bridge.record('split','failed'),true);await bridge.flush();
 const body=JSON.parse(calls.at(-1).body);assert.deepEqual(body.events.map(e=>[e.tool,e.result]),[['merge','completed'],['split','failed']]);
 assert.equal(calls.at(-1).credentials,'omit');assert.equal(calls.at(-1).referrerPolicy,'no-referrer');assert(!JSON.stringify(calls).includes('PRIVATE.pdf'));
 bridge.setConsent(false);const before=calls.length;assert.equal(bridge.record('merge','completed'),false);await bridge.flush();assert.equal(calls.length,before);assert.equal(bridge.getStatus().pending,0);
 console.log('PASS: optional consent, bounded technical schema, no document objects or ambient credentials, revocation');
})().catch(error=>{console.error(error);process.exitCode=1});
