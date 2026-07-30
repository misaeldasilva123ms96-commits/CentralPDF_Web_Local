const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const bundleUrl = pathToFileURL(path.resolve(__dirname, '..', 'vendor', 'libpdf-core.mjs')).href;
  const libpdf = await import(bundleUrl);
  assert.equal(typeof libpdf.PDF, 'function');
  console.log('libpdf-offline-runtime: passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
