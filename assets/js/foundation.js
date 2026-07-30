(() => {
  'use strict';

  const APP_VERSION = '1.2.0';
  const DB_NAME = 'centralpdf-foundation';
  const DB_VERSION = 1;
  const STORE = 'recovery';
  const RECOVERY_KEY = 'latest';
  const RECOVERY_LIMIT = 80 * 1024 * 1024;
  const OFFLINE_URLS = [
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core.wasm.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd.wasm.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/tesseract-core-simd-lstm.wasm.js',
    'https://tessdata.projectnaptha.com/4.0.0/por.traineddata.gz',
    'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'
  ];

  const foundation = {
    tasks: [],
    activeTask: null,
    cancellationRequested: false,
    recoveryTimer: null,
    recoverySaving: false,
    lastRecoveryHash: '',
    recoveryRecord: null,
    serviceWorkerRegistration: null,
    diagnostics: null
  };

  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const formatBytes = bytes => {
    if (!Number(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  };
  const dateTime = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  const safeName = value => String(value || 'arquivo').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();

  function storageGet(key, fallback = null) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : value; }
    catch (_) { return fallback; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (_) { return false; }
  }

  function createTopButtons() {
    const actions = document.querySelector('.top-actions');
    const privacy = document.querySelector('.privacy-indicator');
    if (!actions || $('#foundationProjectsButton')) return;
    const holder = document.createElement('div');
    holder.className = 'foundation-top-actions';
    holder.innerHTML = `
      <button id="foundationProjectsButton" class="foundation-top-button" type="button" title="Projetos e recuperação">
        <svg><use href="#i-file"/></svg><span class="label">Projetos</span>
      </button>
      <button id="foundationQueueButton" class="foundation-top-button" type="button" title="Central de processamento">
        <svg><use href="#i-download"/></svg><span class="label">Processos</span><span id="foundationQueueBadge" class="foundation-badge">0</span>
      </button>
      <button id="foundationDiagnosticsButton" class="foundation-top-button" type="button" title="Diagnóstico do sistema">
        <svg><use href="#i-info"/></svg><span class="label">Sistema</span>
      </button>`;
    actions.insertBefore(holder, privacy || actions.firstChild);
  }

  function createDialogs() {
    if ($('#foundationQueueDialog')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <dialog id="foundationQueueDialog" class="foundation-dialog">
        <div class="foundation-dialog-shell">
          <div class="foundation-dialog-head"><div><small>Central de processamento</small><h2>Tarefas da sessão</h2><p>Acompanhe operações longas e consulte o histórico recente.</p></div><button class="foundation-dialog-close" data-close-dialog="foundationQueueDialog" type="button">×</button></div>
          <div class="foundation-dialog-body"><div id="foundationQueueList"></div></div>
          <div class="foundation-dialog-actions"><button id="foundationClearTasks" class="foundation-button" type="button">Limpar concluídas</button><button id="foundationCancelTask" class="foundation-button danger" type="button" disabled>Cancelar tarefa ativa</button></div>
        </div>
      </dialog>
      <dialog id="foundationProjectsDialog" class="foundation-dialog">
        <div class="foundation-dialog-shell">
          <div class="foundation-dialog-head"><div><small>Projetos locais</small><h2>Salvar e continuar depois</h2><p>O projeto guarda arquivos, configurações, ordem de páginas e edições compatíveis.</p></div><button class="foundation-dialog-close" data-close-dialog="foundationProjectsDialog" type="button">×</button></div>
          <div class="foundation-dialog-body">
            <div id="foundationRecoverySlot"></div>
            <div class="foundation-grid">
              <div class="foundation-card"><div class="foundation-card-head"><div><h3>Salvar projeto</h3><p>Cria um arquivo <strong>.cpdf</strong> com os documentos e o estado atual.</p></div><span class="foundation-status-pill ok">Local</span></div><button id="foundationSaveProject" class="foundation-button primary" type="button" style="margin-top:12px;width:100%">Salvar projeto atual</button></div>
              <div class="foundation-card"><div class="foundation-card-head"><div><h3>Abrir projeto</h3><p>Continue um trabalho salvo anteriormente nesta ferramenta.</p></div><span class="foundation-status-pill">.cpdf</span></div><input id="foundationProjectInput" type="file" accept=".cpdf,application/zip" hidden /><button id="foundationOpenProject" class="foundation-button" type="button" style="margin-top:12px;width:100%">Escolher projeto</button></div>
              <div class="foundation-card full">
                <div class="foundation-toggle-row"><span><strong>Recuperação automática</strong><small>Salva uma cópia local do trabalho após alterações. Para arquivos acima de 80 MB, apenas o projeto manual é recomendado.</small></span><input id="foundationRecoveryToggle" type="checkbox" checked /></div>
                <div class="foundation-toggle-row"><span><strong>Excluir recuperação atual</strong><small>Remove somente a cópia automática salva neste navegador.</small></span><button id="foundationDeleteRecovery" class="foundation-button danger" type="button">Excluir</button></div>
              </div>
            </div>
            <div id="foundationProjectStatus" class="status-box" style="margin-top:12px">Pronto para salvar ou abrir um projeto.</div>
          </div>
        </div>
      </dialog>
      <dialog id="foundationDiagnosticsDialog" class="foundation-dialog">
        <div class="foundation-dialog-shell">
          <div class="foundation-dialog-head"><div><small>Diagnóstico</small><h2>Compatibilidade e modo offline</h2><p>Confira os motores, armazenamento e forma de abertura da aplicação.</p></div><button class="foundation-dialog-close" data-close-dialog="foundationDiagnosticsDialog" type="button">×</button></div>
          <div class="foundation-dialog-body"><div id="foundationDiagnosticsContent"></div></div>
          <div class="foundation-dialog-actions"><button id="foundationPrepareOffline" class="foundation-button primary" type="button">Preparar uso offline</button><button id="foundationRefreshDiagnostics" class="foundation-button" type="button">Verificar novamente</button></div>
        </div>
      </dialog>
      <div id="foundationRecoveryToast" class="foundation-recovery-toast hidden"><div class="copy"><strong>Há um trabalho recuperável</strong><small id="foundationRecoveryToastText">Uma sessão anterior foi encontrada.</small></div><button id="foundationRestoreToast" class="foundation-button primary" type="button">Restaurar</button><button id="foundationDismissToast" class="foundation-button" type="button">Agora não</button></div>`;
    document.body.appendChild(wrapper);
  }

  function bindUI() {
    $('#foundationProjectsButton')?.addEventListener('click', () => { renderRecoverySlot(); $('#foundationProjectsDialog').showModal(); });
    $('#foundationQueueButton')?.addEventListener('click', () => { renderQueue(); $('#foundationQueueDialog').showModal(); });
    $('#foundationDiagnosticsButton')?.addEventListener('click', async () => { await refreshDiagnostics(); $('#foundationDiagnosticsDialog').showModal(); });
    document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.closeDialog}`)?.close()));
    $('#foundationClearTasks')?.addEventListener('click', () => { foundation.tasks = foundation.tasks.filter(task => task.status === 'running' || task.status === 'pending'); renderQueue(); });
    $('#foundationCancelTask')?.addEventListener('click', cancelActiveTask);
    $('#foundationSaveProject')?.addEventListener('click', () => saveProject(false));
    $('#foundationOpenProject')?.addEventListener('click', () => $('#foundationProjectInput').click());
    $('#foundationProjectInput')?.addEventListener('change', event => { const file = event.target.files?.[0]; if (file) openProject(file); event.target.value = ''; });
    $('#foundationRecoveryToggle')?.addEventListener('change', event => { storageSet('centralpdf-recovery-enabled', event.target.checked ? '1' : '0'); if (!event.target.checked) clearTimeout(foundation.recoveryTimer); });
    $('#foundationDeleteRecovery')?.addEventListener('click', deleteRecovery);
    $('#foundationRefreshDiagnostics')?.addEventListener('click', refreshDiagnostics);
    $('#foundationPrepareOffline')?.addEventListener('click', prepareOffline);
    $('#foundationRestoreToast')?.addEventListener('click', async () => { $('#foundationRecoveryToast').classList.add('hidden'); await restoreRecovery(); });
    $('#foundationDismissToast')?.addEventListener('click', () => $('#foundationRecoveryToast').classList.add('hidden'));
    document.addEventListener('input', scheduleRecovery, true);
    document.addEventListener('change', scheduleRecovery, true);
    document.addEventListener('drop', scheduleRecovery, true);
    document.addEventListener('click', event => {
      if (event.target.closest('.page-action,.icon-button,.small-button,.remove-button,.file-card-remove,.merge-source-remove')) scheduleRecovery();
    }, true);
    window.addEventListener('centralpdf-progress', event => updateTaskProgress(Number(event.detail || 0)));
    window.addEventListener('centralpdf-status', event => updateTaskMessage(event.detail?.message || ''));
    window.addEventListener('centralpdf-result', event => attachTaskResult(event.detail));
  }

  function taskTitle() {
    return window.CentralPDFApp?.getActiveToolTitle?.() || document.querySelector('#operationTitle')?.textContent || 'Processamento de PDF';
  }

  async function runTask(execute) {
    if (foundation.activeTask) {
      document.querySelector('#statusBox').textContent = 'Já existe uma tarefa em processamento. Aguarde ou cancele pela Central de processamento.';
      document.querySelector('#statusBox').className = 'status-box error';
      return { ok: false, error: new Error('Já existe uma tarefa ativa.') };
    }
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: taskTitle(),
      tool: window.CentralPDFApp?.getActiveTool?.() || '',
      status: 'running',
      progress: 0,
      message: 'Preparando tarefa...',
      startedAt: Date.now(),
      finishedAt: null,
      result: null
    };
    foundation.tasks.unshift(task);
    foundation.activeTask = task;
    foundation.cancellationRequested = false;
    document.body.classList.add('foundation-processing');
    renderQueueBadge();
    renderQueue();
    try {
      const outcome = await execute();
      if (foundation.cancellationRequested) {
        task.status = 'cancelled';
        task.message = 'Operação cancelada pelo usuário.';
      } else if (outcome?.ok === false) {
        task.status = 'failed';
        task.message = outcome.error?.message || 'A operação não foi concluída.';
      } else {
        task.status = 'completed';
        task.progress = 100;
        task.message = outcome?.result?.message || 'Operação concluída.';
      }
      return outcome;
    } catch (error) {
      task.status = foundation.cancellationRequested ? 'cancelled' : 'failed';
      task.message = error.message || String(error);
      return { ok: false, error };
    } finally {
      task.finishedAt = Date.now();
      foundation.activeTask = null;
      foundation.cancellationRequested = false;
      document.body.classList.remove('foundation-processing');
      renderQueueBadge();
      renderQueue();
      scheduleRecovery();
    }
  }

  function cancelActiveTask() {
    if (!foundation.activeTask) return;
    foundation.cancellationRequested = true;
    foundation.activeTask.message = 'Cancelamento solicitado. Finalizando a etapa atual...';
    renderQueue();
  }

  function isCancellationRequested() { return foundation.cancellationRequested; }
  function updateTaskProgress(progress) {
    if (!foundation.activeTask) return;
    foundation.activeTask.progress = Math.max(0, Math.min(100, progress));
    renderQueue();
  }
  function updateTaskMessage(message) {
    if (!foundation.activeTask || !message) return;
    foundation.activeTask.message = message;
    renderQueue();
  }
  function attachTaskResult(result) {
    if (!foundation.activeTask || !result) return;
    foundation.activeTask.result = { filename: result.filename, size: result.size, type: result.type };
  }

  function renderQueueBadge() {
    const button = $('#foundationQueueButton');
    const badge = $('#foundationQueueBadge');
    if (!button || !badge) return;
    const active = foundation.tasks.filter(task => task.status === 'running' || task.status === 'pending').length;
    badge.textContent = String(active);
    button.classList.toggle('has-badge', active > 0);
  }

  function renderQueue() {
    const list = $('#foundationQueueList');
    if (!list) return;
    const cancel = $('#foundationCancelTask');
    if (cancel) cancel.disabled = !foundation.activeTask;
    if (!foundation.tasks.length) {
      list.innerHTML = '<div class="foundation-empty">Nenhuma tarefa foi executada nesta sessão.</div>';
      return;
    }
    list.innerHTML = `<div class="foundation-list">${foundation.tasks.map(task => {
      const icon = task.status === 'completed' ? '✓' : task.status === 'failed' ? '!' : task.status === 'cancelled' ? '×' : '…';
      const time = task.finishedAt ? `${dateTime(task.startedAt)} · ${Math.max(1, Math.round((task.finishedAt-task.startedAt)/1000))} s` : dateTime(task.startedAt);
      return `<div class="foundation-list-row foundation-task ${task.status}"><span class="icon">${icon}</span><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.message)} · ${escapeHtml(time)}</small>${task.status === 'running' ? `<div class="foundation-progress"><div style="width:${task.progress}%"></div></div>` : ''}${task.result ? `<small>Resultado: ${escapeHtml(task.result.filename)} · ${formatBytes(task.result.size)}</small>` : ''}</div><span class="foundation-status-pill ${task.status === 'completed' ? 'ok' : task.status === 'failed' ? 'error' : task.status === 'running' ? 'warn' : ''}">${task.status === 'running' ? `${Math.round(task.progress)}%` : task.status === 'completed' ? 'Concluída' : task.status === 'failed' ? 'Falhou' : 'Cancelada'}</span></div>`;
    }).join('')}</div>`;
  }

  async function createProjectBlob(options = {}) {
    if (!window.JSZip) throw new Error('O componente de projetos não carregou.');
    if (!window.CentralPDFApp?.exportProjectState) throw new Error('A aplicação ainda não terminou de inicializar.');
    const exported = await window.CentralPDFApp.exportProjectState();
    if (!exported?.snapshot) throw new Error('Não há um projeto ativo para salvar.');
    const totalBytes = exported.files.reduce((sum, item) => sum + Number(item.file?.size || 0), 0);
    if (options.maxBytes && totalBytes > options.maxBytes) throw new Error(`A recuperação automática foi ignorada porque os arquivos somam ${formatBytes(totalBytes)}.`);
    const zip = new JSZip();
    const manifest = {
      format: 'centralpdf-project',
      formatVersion: 1,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      snapshot: exported.snapshot,
      files: []
    };
    for (let index = 0; index < exported.files.length; index++) {
      const item = exported.files[index];
      const extension = item.file.name.includes('.') ? `.${item.file.name.split('.').pop()}` : '';
      const path = `files/${String(index + 1).padStart(4, '0')}_${safeName(item.id)}${extension}`;
      zip.file(path, item.file);
      manifest.files.push({ id: item.id, path, name: item.file.name, type: item.file.type, lastModified: item.file.lastModified, size: item.file.size });
    }
    zip.file('project.json', JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: options.recovery ? 1 : 4 } }, metadata => {
      if (!options.recovery) setProjectStatus(`Salvando projeto... ${Math.round(metadata.percent)}%`, 'processing');
    });
    return { blob, manifest, totalBytes };
  }

  async function saveProject(recovery = false) {
    try {
      if (!recovery) setProjectStatus('Preparando arquivos e configurações...', 'processing');
      const result = await createProjectBlob({ recovery, maxBytes: recovery ? RECOVERY_LIMIT : 0 });
      if (recovery) return result;
      const base = safeName(window.CentralPDFApp?.getProjectName?.() || 'Projeto_CentralPDF').replace(/\.cpdf$/i, '');
      downloadBlob(result.blob, `${base}.cpdf`);
      setProjectStatus(`Projeto salvo com ${result.manifest.files.length} arquivo(s) e ${formatBytes(result.totalBytes)}.`, 'success');
      return result;
    } catch (error) {
      if (!recovery) setProjectStatus(error.message || String(error), 'error');
      throw error;
    }
  }

  async function openProject(file) {
    try {
      setProjectStatus('Abrindo e validando o projeto...', 'processing');
      const zip = await JSZip.loadAsync(file);
      const manifestEntry = zip.file('project.json');
      if (!manifestEntry) throw new Error('O arquivo não contém um projeto Central PDF válido.');
      const manifest = JSON.parse(await manifestEntry.async('text'));
      if (manifest.format !== 'centralpdf-project') throw new Error('Formato de projeto não reconhecido.');
      const files = new Map();
      for (const entry of manifest.files || []) {
        const zipEntry = zip.file(entry.path);
        if (!zipEntry) throw new Error(`O arquivo ${entry.name} não foi encontrado dentro do projeto.`);
        const blob = await zipEntry.async('blob');
        files.set(entry.id, new File([blob], entry.name, { type: entry.type || blob.type, lastModified: entry.lastModified || Date.now() }));
      }
      await window.CentralPDFApp.importProjectState(manifest.snapshot, files);
      setProjectStatus(`Projeto aberto: ${manifest.files.length} arquivo(s) restaurado(s).`, 'success');
      $('#foundationProjectsDialog')?.close();
      scheduleRecovery();
    } catch (error) {
      setProjectStatus(error.message || String(error), 'error');
    }
  }

  function setProjectStatus(message, type = '') {
    const status = $('#foundationProjectStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `status-box${type ? ` ${type}` : ''}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  function recoveryEnabled() { return storageGet('centralpdf-recovery-enabled', '1') !== '0'; }
  function scheduleRecovery() {
    if (!recoveryEnabled() || foundation.activeTask || foundation.recoverySaving) return;
    clearTimeout(foundation.recoveryTimer);
    foundation.recoveryTimer = setTimeout(saveRecovery, 4200);
  }

  async function saveRecovery() {
    if (!recoveryEnabled() || !window.CentralPDFApp?.hasProject?.()) return;
    foundation.recoverySaving = true;
    try {
      const summary = window.CentralPDFApp.getRecoverySummary?.() || {};
      const hash = JSON.stringify(summary);
      if (hash === foundation.lastRecoveryHash) return;
      const result = await saveProject(true);
      const record = { key: RECOVERY_KEY, blob: result.blob, savedAt: Date.now(), summary, appVersion: APP_VERSION };
      await idbPut(record);
      foundation.recoveryRecord = record;
      foundation.lastRecoveryHash = hash;
      renderRecoverySlot();
    } catch (error) {
      console.warn('Recuperação automática não salva:', error.message || error);
    } finally {
      foundation.recoverySaving = false;
    }
  }

  async function restoreRecovery() {
    const record = foundation.recoveryRecord || await idbGet(RECOVERY_KEY);
    if (!record?.blob) return;
    const file = new File([record.blob], `Recuperacao_${new Date(record.savedAt).toISOString().slice(0,10)}.cpdf`, { type: 'application/zip' });
    await openProject(file);
  }

  async function deleteRecovery() {
    await idbDelete(RECOVERY_KEY);
    foundation.recoveryRecord = null;
    foundation.lastRecoveryHash = '';
    $('#foundationRecoveryToast')?.classList.add('hidden');
    renderRecoverySlot();
    setProjectStatus('A recuperação automática foi excluída deste navegador.', 'success');
  }

  function renderRecoverySlot() {
    const slot = $('#foundationRecoverySlot');
    if (!slot) return;
    const record = foundation.recoveryRecord;
    if (!record) { slot.innerHTML = ''; return; }
    const summary = record.summary || {};
    slot.innerHTML = `<div class="foundation-recovery-card"><div><strong>Trabalho recuperável de ${escapeHtml(dateTime(record.savedAt))}</strong><p>${escapeHtml(summary.toolTitle || 'Ferramenta')} · ${summary.fileCount || 0} arquivo(s) · ${summary.pageCount || 0} página(s)</p></div><button id="foundationRestoreRecovery" class="foundation-button primary" type="button">Restaurar</button></div>`;
    $('#foundationRestoreRecovery')?.addEventListener('click', restoreRecovery);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function idbPut(value) { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
  async function idbGet(key) { const db = await openDb(); return new Promise((resolve, reject) => { const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  async function idbDelete(key) { const db = await openDb(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !['http:', 'https:'].includes(location.protocol)) return null;
    try {
      foundation.serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js');
      return foundation.serviceWorkerRegistration;
    } catch (error) {
      console.warn('Service worker não registrado:', error);
      return null;
    }
  }

  async function prepareOffline() {
    const button = $('#foundationPrepareOffline');
    const remoteEngines = window.CentralPDFRemoteEngines;
    if (remoteEngines && !remoteEngines.isAllowed()) {
      const allowed = window.confirm('Para preparar o modo offline, o Central PDF precisa baixar motores públicos de terceiros (PDF.js, pdf-lib, LibPDF e Tesseract). Nenhum documento pessoal será enviado. Deseja continuar?');
      if (!allowed) return;
      if (!remoteEngines.setAllowed(true)) {
        alert('Não foi possível salvar a autorização neste navegador.');
        return;
      }
    }
    if (button) { button.disabled = true; button.textContent = 'Preparando...'; }
    try {
      if (!['http:', 'https:'].includes(location.protocol)) throw new Error('Abra pelo ABRIR_CENTRAL_PDF.bat para habilitar o cache offline.');
      const registration = foundation.serviceWorkerRegistration || await registerServiceWorker();
      if (!registration) throw new Error('O serviço offline não está disponível neste navegador.');
      await navigator.serviceWorker.ready;
      const worker = navigator.serviceWorker.controller || registration.active || registration.waiting;
      if (!worker) throw new Error('Atualize a página e tente novamente para ativar o serviço offline.');
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Tempo excedido ao preparar o cache offline.')), 300000);
        const listener = event => {
          if (event.data?.type !== 'CACHE_URLS_RESULT') return;
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', listener);
          resolve(event.data.results || []);
        };
        navigator.serviceWorker.addEventListener('message', listener);
        worker.postMessage({ type: 'CACHE_URLS', urls: OFFLINE_URLS });
      });
      const failed = result.filter(item => !item.ok);
      if (failed.length) throw new Error(`${failed.length} motor(es) não puderam ser armazenados. Verifique a internet e tente novamente.`);
      storageSet('centralpdf-offline-prepared', new Date().toISOString());
      await refreshDiagnostics();
      alert('Modo offline preparado. Atualize a página uma vez para confirmar que os motores estão disponíveis pelo cache.');
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Preparar uso offline'; }
    }
  }

  async function refreshDiagnostics() {
    await Promise.race([window.CentralPDFEnginesReady || Promise.resolve(), new Promise(resolve => setTimeout(resolve, 6000))]);
    const engine = window.CentralPDFEngineStatus || {};
    const estimate = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => ({})) : {};
    const localServer = ['http:', 'https:'].includes(location.protocol);
    const swReady = Boolean(navigator.serviceWorker?.controller || foundation.serviceWorkerRegistration?.active);
    const recoveryAvailable = 'indexedDB' in window;
    const preparedAt = storageGet('centralpdf-offline-prepared');
    const diagnostics = {
      localServer,
      swReady,
      pdfLib: Boolean(window.PDFLib?.PDFDocument),
      pdfJs: Boolean(window.pdfjsLib?.getDocument),
      ocr: window.CentralPDFOCR?.getStatus?.() || { mainReady: false, engineSource: 'sob demanda' },
      jsZip: Boolean(window.JSZip),
      recoveryAvailable,
      storageUsage: estimate.usage || 0,
      storageQuota: estimate.quota || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || '—',
      deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Não informado',
      preparedAt,
      engine
    };
    foundation.diagnostics = diagnostics;
    renderDiagnostics(diagnostics);
    updateSystemButton(diagnostics);
    return diagnostics;
  }

  function renderDiagnostics(data) {
    const target = $('#foundationDiagnosticsContent');
    if (!target) return;
    const engineReady = data.pdfLib && data.pdfJs && data.jsZip;
    const offlineReady = Boolean(data.preparedAt && data.swReady);
    const protocolText = data.localServer ? 'Servidor local seguro' : 'Arquivo aberto diretamente';
    target.innerHTML = `
      <div class="foundation-offline-banner ${offlineReady ? 'ready' : ''}"><span class="dot"></span><div><strong>${offlineReady ? 'Uso offline preparado' : 'Uso offline ainda não preparado'}</strong><small>${offlineReady ? `Cache atualizado em ${escapeHtml(dateTime(data.preparedAt))}.` : data.localServer ? 'Clique em Preparar uso offline enquanto estiver conectado.' : 'Abra pelo arquivo ABRIR_CENTRAL_PDF.bat para habilitar cache e recuperação avançada.'}</small></div></div>
      <div class="foundation-grid">
        <div class="foundation-card"><div class="foundation-card-head"><div><h3>Motores principais</h3><p>Componentes utilizados para leitura, geração e empacotamento.</p></div><span class="foundation-status-pill ${engineReady ? 'ok' : 'error'}">${engineReady ? 'Prontos' : 'Incompletos'}</span></div><div class="foundation-list">
          ${diagnosticRow('P', 'pdf-lib', data.pdfLib, data.engine?.engines?.pdfLib?.source || '—')}
          ${diagnosticRow('V', 'PDF.js', data.pdfJs, data.engine?.engines?.pdfJs?.source || '—')}
          ${diagnosticRow('Z', 'JSZip', data.jsZip, 'local')}
          ${diagnosticRow('O', 'OCR Tesseract.js', data.ocr?.mainReady ? true : null, data.ocr?.engineSource || 'carrega sob demanda')}
        </div></div>
        <div class="foundation-card"><div class="foundation-card-head"><div><h3>Ambiente</h3><p>Recursos disponíveis na forma atual de abertura.</p></div><span class="foundation-status-pill ${data.localServer ? 'ok' : 'warn'}">${escapeHtml(protocolText)}</span></div><div class="foundation-metric-row"><div class="foundation-metric"><small>Service worker</small><strong>${data.swReady ? 'Ativo' : 'Inativo'}</strong></div><div class="foundation-metric"><small>Recuperação</small><strong>${data.recoveryAvailable ? 'Disponível' : 'Indisponível'}</strong></div><div class="foundation-metric"><small>Protocolo</small><strong>${escapeHtml(location.protocol)}</strong></div></div></div>
        <div class="foundation-card full"><div class="foundation-card-head"><div><h3>Capacidade estimada</h3><p>Informações aproximadas fornecidas pelo navegador. Arquivos com muitas imagens podem exigir mais memória.</p></div></div><div class="foundation-metric-row"><div class="foundation-metric"><small>Processadores lógicos</small><strong>${escapeHtml(data.hardwareConcurrency)}</strong></div><div class="foundation-metric"><small>Memória informada</small><strong>${escapeHtml(data.deviceMemory)}</strong></div><div class="foundation-metric"><small>Armazenamento local</small><strong>${formatBytes(data.storageUsage)} / ${formatBytes(data.storageQuota)}</strong></div></div></div>
      </div>`;
  }

  function diagnosticRow(icon, title, ok, detail) {
    const state = ok === null ? 'warn' : ok ? 'ok' : 'error';
    const label = ok === null ? 'Sob demanda' : ok ? 'Pronto' : 'Falhou';
    return `<div class="foundation-list-row"><span class="icon">${icon}</span><div><strong>${escapeHtml(title)}</strong><small>Origem: ${escapeHtml(detail)}</small></div><span class="foundation-status-pill ${state}">${label}</span></div>`;
  }

  function updateSystemButton(data) {
    const button = $('#foundationDiagnosticsButton');
    if (!button) return;
    const ready = data.pdfLib && data.pdfJs && data.jsZip;
    button.style.color = ready ? 'var(--foundation-success)' : 'var(--foundation-danger)';
    button.title = ready ? 'Sistema pronto — abrir diagnóstico' : 'Há componentes indisponíveis — abrir diagnóstico';
  }

  async function loadRecoveryOnStart() {
    try {
      foundation.recoveryRecord = await idbGet(RECOVERY_KEY);
      renderRecoverySlot();
      if (foundation.recoveryRecord?.blob) {
        const toast = $('#foundationRecoveryToast');
        $('#foundationRecoveryToastText').textContent = `${foundation.recoveryRecord.summary?.toolTitle || 'Trabalho'} salvo em ${dateTime(foundation.recoveryRecord.savedAt)}.`;
        toast?.classList.remove('hidden');
      }
    } catch (error) {
      console.warn('Não foi possível consultar a recuperação:', error);
    }
  }

  async function initialize() {
    createTopButtons();
    createDialogs();
    bindUI();
    const toggle = $('#foundationRecoveryToggle');
    if (toggle) toggle.checked = recoveryEnabled();
    await registerServiceWorker();
    await loadRecoveryOnStart();
    await refreshDiagnostics();
  }

  window.CentralPDFFoundation = {
    runTask,
    cancelActiveTask,
    isCancellationRequested,
    scheduleRecovery,
    refreshDiagnostics,
    saveProject: () => saveProject(false),
    openProject,
    getTasks: () => foundation.tasks.map(item => ({ ...item }))
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();
