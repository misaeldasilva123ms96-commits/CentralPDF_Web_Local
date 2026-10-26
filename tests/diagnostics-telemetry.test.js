/* Exercise privacy and failure paths without contacting Sentry. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync('assets/js/diagnostics-telemetry.js', 'utf8');
const DSN = 'https://11111111111111111111111111111111@o123.ingest.us.sentry.io/456';
const KEY = 'centralpdf-diagnostics-consent-v1';
function harness(config = { enabled: true, dsn: DSN }, saved = new Map()) {
  let now = 100000000, active = 'editPdf', outcome = { status: 200, headers: {} };
  const calls = [], listeners = {}, timers = new Map();let timerId = 0;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const window = { CentralPDFDiagnosticsConfig: config, CentralPDFApp: { getActiveTool: () => active }, addEventListener: (type, fn) => { listeners[type] = fn; } };
  const context = { window, document: { getElementById: () => null }, URL, crypto: webcrypto, TextEncoder, AbortController, Date: Clock, navigator: { onLine: true },
    localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k,v) => saved.set(k,v) },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay });return timerId; }, clearTimeout: id => timers.delete(id),
    fetch: async (url, options) => { calls.push({ url, options });if (outcome instanceof Error) throw outcome;if (typeof outcome === 'function') return outcome(options);
      return { status: outcome.status, ok: outcome.status >= 200 && outcome.status < 300, headers: { get: name => outcome.headers[name] ?? null } }; }
  };
  vm.runInNewContext(source, context);
  return { api: window.CentralPDFTelemetry, calls, saved, listeners, timers, context,
    advance: ms => { now += ms; }, tool: value => { active = value; }, respond: response => { outcome = response; } };
}
function body(call) {
  const [header,item,payload,tail] = call.options.body.split('\n');
  assert.equal(tail, '');assert.equal(JSON.parse(item).length, Buffer.byteLength(payload));
  const event = JSON.parse(payload);assert.equal(JSON.parse(header).event_id, event.event_id);return event;
}
(async () => {
  for (const config of [undefined, {}, {enabled:false,dsn:DSN}, ...[
    'http://11111111111111111111111111111111@o123.ingest.sentry.io/456',
    'https://11111111111111111111111111111111@evil.invalid/456',
    DSN+'?token=secret',DSN+'#secret',DSN.replace('@',':password@'),DSN.replace('/456','/not-a-project')
  ].map(dsn => ({enabled:true,dsn}))]) {
    const h = harness(config === undefined ? {} : config);
    assert.equal(h.api.getStatus().configured,false);assert.equal(h.api.setConsent(true),false);
    h.api.capture('javascript','private.pdf','secret');await h.api.flush();assert.equal(h.calls.length,0);
  }
  const h = harness();assert.equal(h.api.capture('javascript','before consent',''),false);await h.api.flush();assert.equal(h.calls.length,0);
  h.api.setConsent(true);
  for(let i=0;i<3;i++)h.api.capture('javascript','CPF 123.456.789-00 João segredo.pdf document contents', 'https://private.invalid/assets/js/pdf-editor.js?password=SECRET');
  await h.api.flush();assert.equal(h.calls.length,1);
  const call=h.calls[0],event=body(call);
  assert.equal(call.url,'https://o123.ingest.us.sentry.io/api/456/envelope/');
  assert.equal(call.options.credentials,'omit');assert.equal(call.options.referrerPolicy,'no-referrer');assert.equal(call.options.redirect,'error');
  assert.equal(event.tags.tool,'editPdf');assert.equal(event.tags.component,'pdf-editor.js');assert.equal(event.extra.occurrences,3);
  assert.match(event.event_id,/^[0-9a-f]{32}$/);assert.equal(event.tags.code,'javascript_failure');
  for(const secret of ['CPF','123.456','João','segredo.pdf','document contents','private.invalid','password','SECRET'])assert(!call.options.body.includes(secret),secret);
  for(const field of ['user','request','breadcrumbs','stacktrace','attachments','contexts'])assert.equal(event[field],undefined);
  h.api.capture('aviso','secret name.pdf','entrada: merge; código: empty');await h.api.flush();assert.equal(body(h.calls[1]).tags.code,'input_empty');
  for(const kind of ['javascript','promessa','console'])assert.equal(h.api.capture(kind,'Failure chrome-extension://abc/provider.js',''),false);
  assert.equal(h.api.capture('aviso','unknown warning containing private text',''),false);
  h.tool('private title.pdf');h.api.capture('console','secret','/assets/js/private-name.js');await h.api.flush();
  assert.equal(body(h.calls[2]).tags.tool,'unknown');assert.equal(body(h.calls[2]).tags.component,'runtime');
  const historical=harness({enabled:true,dsn:DSN},h.saved);assert.equal(historical.api.getStatus().consent,true);await historical.api.flush();assert.equal(historical.calls.length,0);
  const changed=harness({enabled:true,dsn:DSN.replace('/456','/789')},h.saved);assert.equal(changed.api.getStatus().consent,false);
  h.api.capture('console','pending');h.api.setConsent(false);assert.equal(h.api.getStatus().pending,0);await h.api.flush();assert.equal(h.calls.length,3);
  h.api.setConsent(true);h.api.capture('console','pending');h.listeners.storage({key:null,newValue:null});assert.equal(h.api.getStatus().consent,false);assert.equal(h.api.getStatus().pending,0);
  const offline=harness();offline.api.setConsent(true);offline.context.navigator.onLine=false;offline.api.capture('console','local');await offline.api.flush();assert.equal(offline.calls.length,0);
  offline.context.navigator.onLine=true;offline.listeners.online();await offline.api.flush();assert.equal(offline.calls.length,1);
  offline.api.capture('javascript','expired');offline.advance(15*60000+1);await offline.api.flush();assert.equal(offline.calls.length,1);assert.equal(offline.api.getStatus().discarded,1);
  for(const response of [{status:429,headers:{'Retry-After':'60'}},{status:200,headers:{'X-Sentry-Rate-Limits':'60:error:organization'}},{status:503,headers:{'X-Sentry-Rate-Limits':'60::organization'}}]) {
    const limited=harness();limited.api.setConsent(true);limited.respond(response);limited.api.capture('javascript','one');limited.api.capture('console','two');await limited.api.flush();
    assert.equal(limited.calls.length,1);assert.equal(limited.api.getStatus().pending,0);assert.equal(limited.api.capture('console','blocked'),false);
    limited.advance(60001);limited.respond({status:200,headers:{}});assert.equal(limited.api.capture('console','after'),true);await limited.api.flush();assert.equal(limited.calls.length,2);
  }
  const otherCategory=harness();otherCategory.api.setConsent(true);otherCategory.respond({status:200,headers:{'X-Sentry-Rate-Limits':'60:transaction:organization'}});otherCategory.api.capture('console','one');await otherCategory.api.flush();assert.equal(otherCategory.api.capture('console','not rate limited'),true);
  for(const failure of [new Error('network'),{status:503,headers:{}}]) {
    const retry=harness();retry.api.setConsent(true);retry.respond(failure);retry.api.capture('console','private');
    for(let n=0;n<3;n++){await retry.api.flush();retry.advance(10000);}
    assert.equal(retry.calls.length,3);assert.equal(retry.api.getStatus().pending,0);assert.equal(retry.api.getStatus().discarded,1);
  }
  const denied=harness();denied.api.setConsent(true);denied.respond({status:403,headers:{}});denied.api.capture('console','x');await denied.api.flush();assert.equal(denied.api.getStatus().discarded,1);assert.equal(denied.api.getStatus().pending,0);
  const abort=harness();abort.api.setConsent(true);abort.respond(options=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))));
  abort.api.capture('console','x');const pending=abort.api.flush();abort.api.setConsent(false);await pending;assert.equal(abort.api.getStatus().pending,0);assert.equal(abort.api.getStatus().sent,0);
  const max=harness();max.api.setConsent(true);
  for(let n=0;n<40;n++){max.tool(n%2?'merge':'editPdf');max.api.capture('console','x');await max.api.flush();max.advance(60001);}
  assert.equal(max.calls.length,30);assert.equal(max.api.getStatus().pending,0);
  const burst=harness();burst.api.setConsent(true);
  for(let n=0;n<12;n++){burst.api.capture('console','x');await burst.api.flush();}
  assert.equal(burst.calls.length,10);assert.equal(burst.api.getStatus().pending,1);
  const full=harness();full.api.setConsent(true);
  for(const tool of 'organize editPdf merge split extract rotate watermark pageNumbers imagesToPdf imageConvert compress pdfToImage crop metadata normalize pdfToText ocr compare redact formBuilder signPdf'.split(' ')){full.tool(tool);full.api.capture('console','x');}
  assert.equal(full.api.getStatus().pending,20);assert.equal(full.api.getStatus().discarded,1);
  const noop=harness();noop.api.setConsent(true);noop.respond(options=>new Promise(resolve=>{noop.resolve=()=>resolve({ok:true,status:200,headers:{get:()=>null}});}));
  noop.api.capture('console','x');const inflight=noop.api.flush();noop.listeners.storage({key:KEY,newValue:noop.saved.get(KEY)});noop.resolve();await inflight;assert.equal(noop.api.getStatus().sent,1);
  // Adversarial document/credential data must never cross the transport boundary.
  const privateVectors = [
    'CPF 123.456.789-09 CNPJ 12.345.678/0001-90',
    'João da Silva joao@example.invalid NF medição confidencial.pdf',
    'C:\\Users\\Pessoa\\Documents\\segredo.pdf /home/pessoa/private.pem',
    'Authorization: Bearer SECRET_ACCESS_TOKEN Cookie: session=SECRET_COOKIE',
    'password=SECRET_PASSWORD api_key=SECRET_API_KEY PRIVATE_DOCUMENT_CONTENT',
    '-----BEGIN PRIVATE KEY----- SECRET_KEY -----END PRIVATE KEY-----',
    'x'.repeat(1024*1024)+'TAIL_SECRET'
  ];
  for (const secret of privateVectors) {
    for (const kind of ['javascript','promessa','console','interface','recurso']) {
      const sensitive=harness();
      assert.equal(sensitive.api.capture(kind,secret,secret),false);
      await sensitive.api.flush();assert.equal(sensitive.calls.length,0);
      sensitive.api.setConsent(true);
      assert.equal(sensitive.api.capture(kind,secret,secret),true);
      await sensitive.api.flush();assert.equal(sensitive.calls.length,1);
      const request=sensitive.calls[0];const value=body(request);
      assert(Buffer.byteLength(request.options.body)<2048,'generated envelope must remain bounded');
      assert.equal(value.tags.component,'runtime');
      for(const key of ['CPF','CNPJ','João','example.invalid','SECRET','Users','Documents','PRIVATE','TAIL_SECRET'])
        assert(!request.options.body.includes(key),key);
      assert.equal(request.url,'https://o123.ingest.us.sentry.io/api/456/envelope/');
      sensitive.api.setConsent(false);
      sensitive.api.capture(kind,secret,secret);await sensitive.api.flush();assert.equal(sensitive.calls.length,1);
    }
  }
  const malformed=harness();malformed.api.setConsent(true);
  assert.equal(malformed.api.capture('javascript',{toString(){throw new Error('PRIVATE');}},''),false);
  for(const raw of ['true','{"version":1,"allowed":"true"}','{"version":2,"allowed":true}']) {
    malformed.listeners.storage({key:KEY,newValue:raw});assert.equal(malformed.api.getStatus().consent,false);
  }
  console.log('Sentry telemetry: consent, closed payload, aggregation, privacy, offline, retry, revocation and quotas passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
