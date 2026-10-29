/* Trace envelope contract and consent races; never contacts Sentry. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync('assets/js/diagnostics-telemetry.js', 'utf8');
const DSN = 'https://11111111111111111111111111111111@o123.ingest.us.sentry.io/456';
const TRACE_KEY = 'centralpdf-tracing-consent-v1';
function client(rate=1, saved=new Map(), automaticErrors=false) {
  let now=1800000000000, mono=1000, random=0, response={status:200,headers:{}};
  const calls=[], listeners={};
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const window={CentralPDFDiagnosticsConfig:{enabled:true,dsn:DSN,tracesSampleRate:rate,automaticErrors},addEventListener:(k,fn)=>listeners[k]=fn};
  const context={window,document:{getElementById:()=>null},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
    URL,crypto:webcrypto,TextEncoder,AbortController,Date:Clock,performance:{now:()=>mono},Math:Object.assign(Object.create(Math),{random:()=>random}),
    navigator:{onLine:true},setTimeout:()=>1,clearTimeout:()=>{},fetch:async (url,options)=>{
      calls.push({url,options});if(typeof response==='function')return response(options);
      return {ok:response.status===200,status:response.status,headers:{get:k=>response.headers[k]??null}};
    }};
  vm.runInNewContext(source,context);
  return {api:window.CentralPDFTelemetry,calls,saved,listeners,context,advance:ms=>{now+=ms;mono+=ms;},wall:ms=>{now+=ms;},random:v=>{random=v;},respond:v=>{response=v;}};
}
function payload(call){
  const [head,item,raw]=call.options.body.trimEnd().split('\n');
  const result=JSON.parse(raw);assert.equal(JSON.parse(item).type,'transaction');assert.equal(JSON.parse(item).length,Buffer.byteLength(raw));
  assert.equal(JSON.parse(head).event_id,result.event_id);return result;
}
(async()=>{
  // Automatic error sharing never opts a browser into performance tracing.
  const automatic=(saved=new Map())=>client(1,saved,true).api;
  const defaultAuto=automatic();assert.equal(defaultAuto.getStatus().consent,true);assert.equal(defaultAuto.getStatus().tracingConsent,false);
  assert.equal(defaultAuto.capture('console','SECRET_FILE.pdf'),true);
  const preferences=new Map();const optedOut=automatic(preferences);optedOut.setConsent(false);
  assert.equal(automatic(preferences).getStatus().consent,false,'explicit opt-out persists across reloads');
  const c=client();assert.equal(typeof c.api.startToolTrace,'function');
  assert.equal(c.api.startToolTrace('merge'),null);assert.equal(c.api.setTracingConsent(true),false);
  c.api.setConsent(true);assert.equal(c.api.startToolTrace('merge'),null);
  c.api.setTracingConsent(true);
  assert.equal(c.api.startToolTrace('PRIVATE_FILE.pdf'),null);
  const finish=c.api.startToolTrace('merge');assert.equal(typeof finish,'function');
  c.advance(1250);c.wall(-50000);assert.equal(finish(true),true);assert.equal(finish(true),false);
  await c.api.flush();assert.equal(c.calls.length,1);
  const t=payload(c.calls[0]);assert.equal(t.type,'transaction');assert.equal(t.transaction,'tool.merge');assert.equal(t.contexts.trace.status,'ok');
  assert.equal(t.timestamp-t.start_timestamp,1.25);assert.match(t.contexts.trace.trace_id,/^[0-9a-f]{32}$/);assert.match(t.contexts.trace.span_id,/^[0-9a-f]{16}$/);
  assert.equal(t.tags.tool,'merge');assert.equal(t.spans.length,0);
  assert.deepEqual(Object.keys(t).sort(),['event_id','type','platform','release','environment','transaction','transaction_info','start_timestamp','timestamp','contexts','tags','spans'].sort());
  for(const field of ['request','user','breadcrumbs','exception','extra'])assert.equal(t[field],undefined);
  assert.equal(c.calls[0].options.credentials,'omit');assert.equal(c.calls[0].options.referrerPolicy,'no-referrer');
  const failed=c.api.startToolTrace('editPdf');c.advance(20);failed(false);await c.api.flush();assert.equal(payload(c.calls[1]).contexts.trace.status,'internal_error');
  const old=c.api.startToolTrace('ocr');c.api.setTracingConsent(false);c.api.setTracingConsent(true);assert.equal(old(true),false);
  const revoked=c.api.startToolTrace('merge');c.api.setConsent(false);assert.equal(revoked(true),false);assert.equal(c.api.getStatus().tracingConsent,false);
  c.api.setConsent(true);assert.equal(c.api.getStatus().tracingConsent,false);
  for(const rate of [0,-1,2,NaN,'1',undefined]){const x=client(rate===undefined?null:rate);x.api.setConsent(true);assert.equal(x.api.setTracingConsent(true),false);assert.equal(x.api.startToolTrace('merge'),null);}
  const sample=client(.1);sample.api.setConsent(true);sample.api.setTracingConsent(true);sample.random(.1);assert.equal(sample.api.startToolTrace('merge'),null);sample.random(.099);assert(sample.api.startToolTrace('merge'));
  const expired=client();expired.api.setConsent(true);expired.api.setTracingConsent(true);const long=expired.api.startToolTrace('ocr');expired.advance(15*60000+1);assert.equal(long(true),false);
  const offline=client();offline.api.setConsent(true);offline.api.setTracingConsent(true);offline.context.navigator.onLine=false;
  offline.api.startToolTrace('merge')(true);await offline.api.flush();assert.equal(offline.calls.length,0);offline.api.setTracingConsent(false);offline.context.navigator.onLine=true;await offline.api.flush();assert.equal(offline.calls.length,0);
  const prior=new Map([['centralpdf-diagnostics-consent-v1',JSON.stringify({version:1,destination:'https://o123.ingest.us.sentry.io/456',allowed:true})]]);
  const legacy=client(1,prior);assert.equal(legacy.api.getStatus().consent,true);assert.equal(legacy.api.getStatus().tracingConsent,false);
  legacy.api.setTracingConsent(true);assert.equal(client(1,prior).api.getStatus().tracingConsent,true);
  legacy.listeners.storage({key:TRACE_KEY,newValue:null});assert.equal(legacy.api.getStatus().tracingConsent,false);
  const other=client(1,new Map([...prior].map(([k,v])=>[k,v.replace('/456','/789')])));assert.equal(other.api.getStatus().tracingConsent,false);
  const race=client();race.api.setConsent(true);race.api.setTracingConsent(true);
  race.respond(options=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('abort')))));
  race.api.startToolTrace('merge')(true);const pending=race.api.flush();race.api.setTracingConsent(false);await pending;
  assert.equal(race.api.getStatus().pending,0);assert.equal(race.api.getStatus().sent,0);
  const limited=client();limited.api.setConsent(true);limited.api.setTracingConsent(true);limited.respond({status:200,headers:{'X-Sentry-Rate-Limits':'60:transaction:organization'}});
  limited.api.startToolTrace('merge')(true);await limited.api.flush();assert.equal(limited.api.startToolTrace('merge'),null);
  limited.api.capture('console','trace quota must not block errors');await limited.api.flush();assert.equal(limited.calls.length,2);
  // A transaction-only 429 must preserve errors queued during the request and
  // accept new errors even when Retry-After accompanies the explicit category.
  for(const retryAfter of [null,'120']) {
    const separate=client();separate.api.setConsent(true);separate.api.setTracingConsent(true);
    separate.respond(()=>{
      separate.api.capture('console','queued error');
      const headers={'X-Sentry-Rate-Limits':'60:transaction:organization'};
      if(retryAfter!==null)headers['Retry-After']=retryAfter;
      return {ok:false,status:429,headers:{get:key=>headers[key]??null}};
    });
    separate.api.startToolTrace('merge')(true);await separate.api.flush();
    assert.equal(separate.api.getStatus().pausedUntil,0,'transaction-only 429 must not pause errors');
    assert.equal(separate.api.getStatus().pending,1,'queued errors must survive transaction limits');
    assert.equal(separate.api.capture('javascript','new error'),true);
    assert.equal(separate.api.startToolTrace('merge'),null,'traces remain paused');
    separate.respond({status:200,headers:{}});await separate.api.flush();await separate.api.flush();
    assert.equal(separate.calls.length,3);assert.equal(separate.api.getStatus().sent,2);
    assert.equal(separate.api.getStatus().discarded,1,'only the rejected trace is discarded');
  }
  for(const seconds of [60,120]) {
    const fallback=client();fallback.api.setConsent(true);fallback.api.setTracingConsent(true);
    fallback.respond({status:429,headers:seconds===120?{'Retry-After':'120'}:{}});
    fallback.api.startToolTrace('merge')(true);await fallback.api.flush();
    assert.equal(fallback.api.capture('console','globally limited'),false);
    fallback.advance(seconds*1000+1);
    assert.equal(fallback.api.capture('console','after generic cooldown'),true);
  }
  const quota=client();quota.api.setConsent(true);quota.api.setTracingConsent(true);
  for(let i=0;i<15;i++){const end=quota.api.startToolTrace('merge');if(end)end(true);await quota.api.flush();quota.advance(61000);}
  assert.equal(quota.calls.length,10);assert.equal(quota.api.getStatus().tracesSent,10);
  quota.api.capture('console','PRIVATE_DOCUMENT_TEXT SECRET.pdf');await quota.api.flush();assert.equal(quota.calls.length,11,'trace quota must leave room for errors');
  console.log('Sentry traces: envelopes, duration, sampling, consent, privacy, revocation, offline, rate limits and budgets passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
