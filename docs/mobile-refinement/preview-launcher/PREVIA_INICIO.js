(() => {
 'use strict';
 try {
  localStorage.setItem('centralpdf-usage-consent-v1','false');
  localStorage.setItem('centralpdf-diagnostics-consent-v1','false');
  localStorage.setItem('centralpdf-tracing-consent-v1','false');
  location.replace('./index.html');
 } catch (_) {
  document.getElementById('previewState').textContent='Não foi possível preparar o armazenamento desta prévia. Abra um perfil de navegador que permita armazenamento local.';
 }
})();
