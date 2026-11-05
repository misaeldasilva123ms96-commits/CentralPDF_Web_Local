/* Open PDFs with an empty opening password without confusing permissions with authentication. */
(() => {
  'use strict';
  const error = code => new window.CentralPDFIngest.PdfIngestError(code, { stage: 'parse', engine: 'qpdf' });
  function decryptEmpty(bytes) {
    return new Promise((resolve, reject) => {
      let worker, timer;
      const finish = (failure, value) => {
        clearTimeout(timer);
        worker?.terminate();
        if (failure) reject(error(failure)); else resolve(value);
      };
      try {
        worker = new Worker(new URL('assets/js/pdf-open-access-worker.js?v=1', document.baseURI));
        timer = setTimeout(() => finish('worker'), 60000);
        worker.onerror = () => finish('worker');
        worker.onmessage = ({ data }) => {
          if (data?.ok && data.bytes instanceof ArrayBuffer && window.CentralPDFIngest.hasPdfSignature(data.bytes)) finish(null, data.bytes);
          else finish(['encrypted', 'corrupted', 'unsupportedEncryption'].includes(data?.code) ? data.code : 'worker');
        };
        const owned = bytes.slice(0);
        worker.postMessage({ bytes: owned }, [owned]);
      } catch (_) { finish('worker'); }
    });
  }
  window.CentralPDFOpenAccess = Object.freeze({ decryptEmpty });
})();
