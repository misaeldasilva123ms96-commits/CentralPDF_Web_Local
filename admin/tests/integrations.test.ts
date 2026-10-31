import {it,expect,vi} from 'vitest';
import {usagePayload,sentryIssues} from '../worker/integrations';
import {handle} from '../worker/index';
const id='63000000-0000-4000-8000-000000000001';
const payload={schema:1,tab:id,active:true,events:[{id,tool:'merge',result:'completed'}]};
it('accepts only closed technical fields and bounded batches',()=>{
 expect(usagePayload(payload)).toEqual({p_tab:id,p_events:payload.events,p_active:true});
 for(const bad of [{...payload,filename:'private.pdf'},{...payload,tab:'email@example.invalid'},{...payload,events:[{...payload.events[0],text:'secret'}]},{...payload,events:[{id,tool:'private.pdf',result:'completed'}]},{...payload,events:Array(11).fill(payload.events[0])}]) expect(()=>usagePayload(bad)).toThrow();
});
it('scopes Sentry requests and strips event text, users and unrelated projects',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json([{id:'123',project:{id:'451'},metadata:{type:'input_corrupted',value:'PRIVATE DOCUMENT'},count:'2',lastSeen:'2026-10-31T12:00:00Z',level:'warning',assignedTo:{email:'secret@example.invalid'},permalink:'https://evil.test'},{id:'456',project:{id:'999'},count:'8'}]));
 const result=await sentryIssues({SENTRY_ORG:'example',SENTRY_PROJECT:'451',SENTRY_READ_TOKEN:'server-only-token'} as Env,fetcher);
 expect(result.connected).toBe(true);expect(result.issues).toHaveLength(1);expect(JSON.stringify(result)).not.toMatch(/PRIVATE|secret@|evil|server-only-token/);
 expect(String(fetcher.mock.calls[0][0])).toContain('project=451');expect(fetcher.mock.calls[0][1]?.redirect).toBe('manual');
});
it('never exposes Sentry errors or attempts a request without its secret',async()=>{
 const f=vi.fn<typeof fetch>(async()=>new Response('sensitive', {status:403}));
 expect((await sentryIssues({SENTRY_ORG:'example',SENTRY_PROJECT:'451'} as Env,f)).connected).toBe(false);expect(f).not.toHaveBeenCalled();
 await expect(sentryIssues({SENTRY_ORG:'example',SENTRY_PROJECT:'451',SENTRY_READ_TOKEN:'secret'} as Env,f)).rejects.toMatchObject({status:503,code:'sentry_unavailable'});
 const env={SENTRY_ORG:'example',SENTRY_PROJECT:'451',SENTRY_READ_TOKEN:'secret'} as Env;
 await expect(sentryIssues(env,async()=>{throw new Error('private provider detail')})).rejects.toMatchObject({status:503,code:'sentry_unavailable'});
 await expect(sentryIssues(env,async()=>new Response('private non-json response'))).rejects.toMatchObject({status:503,code:'sentry_unavailable'});
});
it('allows only approved public origins and forwards sanitized ingestion server-side',async()=>{
 const env={APP_ORIGIN:'https://admin.test',PUBLIC_ORIGIN:'https://public.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable',SUPABASE_METRICS_KEY:'server-secret'} as Env;
 const f=vi.fn<typeof fetch>(async()=>new Response('null'));
 const req=(origin:string,value=payload)=>new Request('https://admin.test/api/public/usage',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
 expect((await handle(req('https://evil.test'),env,f)).status).toBe(403);expect(f).not.toHaveBeenCalled();
 const r=await handle(req('https://public.test'),env,f);expect(r.status).toBe(200);expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://public.test');
 expect(f.mock.calls[0][1]?.body).toBe(JSON.stringify(usagePayload(payload)));expect(await r.text()).not.toContain('server-secret');
 expect((await handle(new Request('https://admin.test/api/overview'),env,f)).status).toBe(401);
});
