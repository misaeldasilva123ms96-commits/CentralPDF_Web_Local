/* One isolated, single-thread QPDF job. Only an empty password is attempted. */
self.onmessage = async ({ data }) => {
  let module;
  const diagnostics = [];
  // This pinned runtime writes directly to console instead of printErr. Keep
  // diagnostics inside the worker; only a classified error code leaves it.
  console.log = () => {};
  console.error = console.warn = line => { if (diagnostics.length < 40) diagnostics.push(String(line).slice(0, 512)); };
  try {
    if (!(data?.bytes instanceof ArrayBuffer)) throw new Error('input');
    importScripts('../../vendor/qpdf/qpdf.js');
    module = await Module({
      noInitialRun: true,
      noExitRuntime: true,
      locateFile: () => new URL('../../vendor/qpdf/qpdf.wasm', self.location.href).href,
      print: () => {},
      printErr: line => { if (diagnostics.length < 40) diagnostics.push(String(line).slice(0, 512)); }
    });
    module.FS.writeFile('/input.pdf', new Uint8Array(data.bytes));
    const status = module.callMain(['--password=', '--decrypt', '/input.pdf', '/output.pdf']);
    if (status !== 0 && status !== 3) {
      const text = diagnostics.join('\n');
      const code = /invalid password/i.test(text) ? 'encrypted'
        : /unsupported.*encrypt|unknown.*encrypt/i.test(text) ? 'unsupportedEncryption' : 'corrupted';
      self.postMessage({ ok: false, code });
      return;
    }
    const bytes = module.FS.readFile('/output.pdf').slice().buffer;
    self.postMessage({ ok: true, bytes }, [bytes]);
  } catch (_) {
    // Never relay filenames, paths or document content from the native engine.
    self.postMessage({ ok: false, code: 'worker' });
  } finally {
    for (const path of ['/input.pdf', '/output.pdf']) {
      try { module?.FS.unlink(path); } catch (_) { /* A failed job may not create output. */ }
    }
  }
};
