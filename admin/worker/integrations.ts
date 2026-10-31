import { ApiError, readJson } from './index';
const tools = new Set('organize editPdf merge split extract rotate watermark pageNumbers imagesToPdf imageConvert compress pdfToImage crop metadata normalize pdfToText ocr compare redact formBuilder signPdf pdfToOffice documentsToPdf extractImages archivePdf documentAssistant structuredExtraction documentAudit classifyRename protect unlock diagnose repairAdvanced flattenForms'.split(' '));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function usagePayload(value: unknown) {
  if(!value || typeof value!=='object') throw new ApiError(400,'invalid_usage');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['schema','tab','events','active'].includes(k)) || v.schema!==1 || typeof v.tab!=='string' || !uuid.test(v.tab) || typeof v.active!=='boolean' || !Array.isArray(v.events) || v.events.length>10) throw new ApiError(400,'invalid_usage');
  for(const item of v.events) {
    if(!item || typeof item!=='object' || Object.keys(item).sort().join(',')!=='id,result,tool' || !uuid.test(item.id) || !tools.has(item.tool) || !['completed','failed'].includes(item.result)) throw new ApiError(400,'invalid_usage');
  }
  return {p_tab:v.tab,p_events:v.events,p_active:v.active};
}
export async function sentryIssues(env: Env, fetcher: typeof fetch) {
  const url=`https://${encodeURIComponent(env.SENTRY_ORG)}.sentry.io/issues/?project=${encodeURIComponent(env.SENTRY_PROJECT)}`;
  if(!env.SENTRY_READ_TOKEN) return {connected:false,url,issues:[],reason:'read_integration_pending'};
  const response=await fetcher(`https://sentry.io/api/0/organizations/${encodeURIComponent(env.SENTRY_ORG)}/issues/?project=${encodeURIComponent(env.SENTRY_PROJECT)}&statsPeriod=7d&query=&per_page=25`,{
    headers:{Authorization:`Bearer ${env.SENTRY_READ_TOKEN}`},redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(8000),
  });
  if(!response.ok) throw new ApiError(503,'sentry_unavailable');
  const raw=await readJson(response,524288);
  if(!Array.isArray(raw)) throw new ApiError(503,'sentry_unavailable');
  const codes=new Set('input_empty input_read_failure input_unsupported input_encrypted input_unsupported_encryption input_corrupted worker_failure recovery_limit recovery_read_failure font_fallback pdf_repaired_object resource_failure javascript_failure promise_failure console_failure interface_failure diagnostic_test'.split(' '));
  return {connected:true,url,issues:raw.slice(0,25).filter(i=>i && typeof i==='object' && String(i.project?.id)===env.SENTRY_PROJECT && /^\d+$/.test(String(i.id))).map(i=>({
    id:String(i.id),code:codes.has(i.metadata?.type)?i.metadata.type:'technical_error',
    count:/^\d+$/.test(String(i.count))?String(i.count):null,
    level:['error','warning','info','fatal'].includes(i.level)?i.level:'error',
    lastSeen:Number.isFinite(Date.parse(i.lastSeen))?new Date(i.lastSeen).toISOString():null,
    url:`https://${encodeURIComponent(env.SENTRY_ORG)}.sentry.io/issues/${encodeURIComponent(i.id)}/?project=${encodeURIComponent(env.SENTRY_PROJECT)}`,
  }))};
}
