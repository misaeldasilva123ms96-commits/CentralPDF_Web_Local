const status = document.querySelector('#status');
const channelName = new URLSearchParams(location.hash.slice(1)).get('channel');
let converter;
let busy = false;
let stopped = false;
let booted = false;
let reloading = false;
let channel;
const scriptURLs = [];
const downloads = new AbortController();
const send = message => channel?.postMessage(message);
function message(text) { status.textContent = text; }
function stop(reason = 'closed') {
  stopped = true;
  downloads.abort();
  converter?.destroy();
  converter = null;
  scriptURLs.splice(0).forEach(url => URL.revokeObjectURL(url));
  send({ type: 'closed', reason });
  message(reason === 'complete' ? 'Conversão concluída. Você pode fechar esta janela.' : 'Conversão interrompida. Você pode fechar esta janela.');
}
document.querySelector('#stop').addEventListener('click', () => stop('cancelled'));
window.addEventListener('beforeunload', () => { if (!reloading) stop(); });

async function start() {
  if (!/^[a-f0-9]{48}$/.test(channelName || '')) throw new Error('Inicie a conversão pelo CentralPDF.');
  if (!('serviceWorker' in navigator) || !('BroadcastChannel' in window)) throw new Error('Use um navegador atualizado, com armazenamento e Service Worker disponíveis.');
  channel = new BroadcastChannel(`centralpdf-office-${channelName}`);
  channel.onmessage = ({ data }) => { if (data?.type === 'stop') stop(); };
  let registration = await navigator.serviceWorker.getRegistration(location.href);
  if (registration?.scope !== new URL('./', location.href).href || !registration.active) {
    registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } else if (navigator.onLine) registration.update().catch(() => {});
  await navigator.serviceWorker.ready;
  if (stopped) return;
  if (!crossOriginIsolated || !navigator.serviceWorker.controller) {
    const retries = Number(sessionStorage.getItem('office-isolation-retry') || 0);
    if (retries >= 2) throw new Error('O navegador não permitiu o ambiente isolado. Atualize o navegador e permita o Service Worker para este site.');
    sessionStorage.setItem('office-isolation-retry', String(retries + 1));
    reloading = true;
    location.reload();
    return;
  }
  sessionStorage.removeItem('office-isolation-retry');
  message('Preparando conversão…');
  const { WorkerBrowserConverter, createWasmPaths } = await import('../vendor/office/browser.js');
  if (stopped) return;
  const root = new URL('../vendor/office/', location.href);
  async function runtimeURL(name, type) {
    const response = await fetch(new URL(name, root), { signal: downloads.signal });
    if (!response.ok) throw new Error('O pacote do motor Office está incompleto.');
    const data = await response.blob();
    const url = URL.createObjectURL(new Blob([data], { type }));
    scriptURLs.push(url);
    return url;
  }
  // Fetch through this window's service worker before creating the pthreads.
  // Workers then read local Blob URLs, which also works without a network on
  // later uses and prevents a second download outside the isolated cache.
  const [wasmURL, dataURL] = await Promise.all([
    runtimeURL('soffice.wasm', 'application/wasm'),
    runtimeURL('soffice.data', 'application/octet-stream')
  ]);
  if (stopped) return;
  // GitHub Pages cannot attach COEP to the initial Worker script response.
  // Blob-backed scripts inherit this isolated window's policy, including the
  // nested pthread workers. Only verified, same-origin runtime code is loaded.
  async function scriptURL(name) {
    const response = await fetch(new URL(name, root), { signal: downloads.signal });
    if (!response.ok) throw new Error('O pacote do motor Office está incompleto.');
    const source = await response.text();
    if (source.length > 2 * 1024 * 1024) throw new Error('Arquivo de motor inesperado.');
    const allowed = ['soffice.js','soffice.worker.js','soffice.wasm','soffice.data']
      .map(name => new URL(name, root).href);
    allowed.push(wasmURL, dataURL);
    const guard = `(() => {
      const allowed = new Set(${JSON.stringify(allowed)});
      const valid = input => { try { return allowed.has(new URL(input?.url || String(input), self.location.href).href); } catch (_) { return false; } };
      const original = self.fetch.bind(self);
      self.fetch = (input, ...args) => valid(input) ? original(input, ...args) : Promise.reject(new TypeError('Office document network access blocked'));
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...args) { if (!valid(url)) throw new TypeError('Office document network access blocked'); return Reflect.apply(open, this, [method, url, ...args]); };
      self.WebSocket = class { constructor() { throw new TypeError('Office document network access blocked'); } };
    })();\n`;
    const url = URL.createObjectURL(new Blob([guard, source], { type: 'text/javascript' }));
    scriptURLs.push(url);
    return url;
  }
  const [workerScript, sofficeScript, pthreadScript] = await Promise.all([
    scriptURL('browser.worker.global.js'), scriptURL('soffice.js'), scriptURL('soffice.worker.js')
  ]);
  if (stopped) return;
  converter = new WorkerBrowserConverter({
    ...createWasmPaths(root.href),
    sofficeJs: sofficeScript,
    sofficeWasm: wasmURL,
    sofficeData: dataURL,
    sofficeWorkerJs: pthreadScript,
    browserWorkerJs: workerScript,
    onProgress: progress => {
      if (!booted && Number.isFinite(progress.percent)) message('Preparando conversão…');
      send({ type: 'progress', percent: progress.percent });
    }
  });
  await Promise.race([
    converter.initialize(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('O motor demorou demais para carregar. Confira a conexão e tente novamente.')), 300000))
  ]);
  if (stopped) return;
  booted = true;
  message('Preparação concluída. Aguardando seu documento…');
  send({ type: 'ready' });
  channel.onmessage = async ({ data }) => {
    if (data?.type === 'ping') { send({ type: 'pong', id: data.id, ready: Boolean(converter && !stopped) }); return; }
    if (data?.type === 'stop') { stop(); return; }
    if (data?.type === 'complete') { stop('complete'); window.close(); return; }
    if (data?.type !== 'convert' || stopped) return;
    if (busy) { send({ type: 'error', id: data.id, message: 'Aguarde a conversão atual terminar.' }); return; }
    const { id, bytes, extension, outputFormat } = data;
    if (!/^[a-f0-9]{24}$/.test(id || '') || !(bytes instanceof ArrayBuffer) || bytes.byteLength > 25 * 1024 * 1024 ||
      !['docx','doc','odt','xlsx','xls','ods','pptx','ppt','odp','rtf','txt','html','htm','csv'].includes(extension) || outputFormat !== 'pdf') {
      send({ type: 'error', id, message: 'Formato ou tamanho não permitido pelo motor local (máximo 25 MB).' });
      return;
    }
    busy = true;
    let timer;
    message('Convertendo localmente. Nenhum documento é enviado pela rede.');
    try {
      const result = await Promise.race([
        converter.convert(bytes, { outputFormat: 'pdf', pdf: { quality: 100 } }, `documento.${extension}`),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('O documento excedeu o tempo de conversão.')), 120000); })
      ]);
      if (stopped) return;
      const output = result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data);
      if (output.byteLength > 100 * 1024 * 1024) throw new Error('PDF maior que o limite de memória.');
      if (new TextDecoder().decode(output.slice(0, 5)) !== '%PDF-') throw new Error('O motor não gerou um PDF válido.');
      send({ type: 'result', id, bytes: output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) });
      message('Conversão concluída. O PDF está disponível no CentralPDF.');
    } catch (_) {
      // Do not relay library diagnostics, paths or document contents to the app.
      send({ type: 'error', id, message: 'Não foi possível converter este documento. Confira se está íntegro, sem senha e com fontes compatíveis.' });
      stop();
    } finally { clearTimeout(timer); busy = false; }
  };
}
start().catch(error => {
  if (stopped) return;
  message('Não foi possível preparar a conversão. Feche esta janela, recarregue o site e tente novamente.');
  send({ type: 'error', message: 'Não foi possível preparar a conversão. Recarregue o site e tente novamente.' });
  downloads.abort();
  converter?.destroy();
  scriptURLs.splice(0).forEach(url => URL.revokeObjectURL(url));
});
