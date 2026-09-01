const assert = require('assert');
const { PDFDocument } = require('../app/node_modules/pdf-lib');
const {
  PdfIngestError,
  inspectPdfBytes,
  inspectPdfFile,
  isPdfCandidate
} = require('../assets/js/pdf-ingest.js');

async function realPdfBytes() {
  const document = await PDFDocument.create();
  document.addPage([200, 300]);
  return (await document.save()).buffer;
}

(async () => {
  const validBytes = await realPdfBytes();
  assert.equal(isPdfCandidate({ name: 'mime-vazio.pdf', type: '' }), true);
  assert.equal(isPdfCandidate({ name: 'octet.pdf', type: 'application/octet-stream' }), true);
  assert.equal(isPdfCandidate({ name: 'sem-extensao', type: 'application/pdf' }), true);

  const parsed = await inspectPdfBytes(validBytes, {
    name: 'real.pdf',
    mimeType: '',
    parse: async bytes => ({ pageCount: (await PDFDocument.load(bytes)).getPageCount() })
  });
  assert.equal(parsed.status, 'valid');
  assert.equal(parsed.pageCount, 1);

  await assert.rejects(
    inspectPdfBytes(new TextEncoder().encode('nao e pdf').buffer, {
      name: 'falso.pdf', mimeType: 'application/pdf', parse: async () => ({ pageCount: 1 })
    }),
    error => error instanceof PdfIngestError && error.code === 'unsupported'
  );

  await assert.rejects(
    inspectPdfBytes(new ArrayBuffer(0), {
      name: 'vazio.pdf', mimeType: 'application/pdf', parse: async () => ({ pageCount: 1 })
    }),
    error => error instanceof PdfIngestError && error.code === 'empty'
  );

  await assert.rejects(
    inspectPdfBytes(validBytes, {
      name: 'protegido.pdf', mimeType: 'application/pdf',
      parse: async () => { const error = new Error('Password required'); error.name = 'PasswordException'; throw error; }
    }),
    error => error instanceof PdfIngestError && error.code === 'encrypted'
  );

  await assert.rejects(
    inspectPdfBytes(validBytes, {
      name: 'corrompido.pdf', mimeType: 'application/pdf',
      parse: async () => { const error = new Error('Invalid PDF structure'); error.name = 'InvalidPDFException'; throw error; }
    }),
    error => error instanceof PdfIngestError && error.code === 'corrupted'
  );

  const unreadable = { name: 'falha.pdf', type: 'application/pdf', size: 10, arrayBuffer: async () => { throw new Error('I/O'); } };
  await assert.rejects(
    inspectPdfFile(unreadable, { parse: async () => ({ pageCount: 1 }) }),
    error => error instanceof PdfIngestError && error.code === 'readFailure'
  );

  const original = new Uint8Array(validBytes).slice().buffer;
  await inspectPdfBytes(original, {
    name: 'ownership.pdf', mimeType: 'application/pdf',
    parse: async bytes => { structuredClone(bytes, { transfer: [bytes] }); return { pageCount: 1 }; }
  });
  assert.ok(original.byteLength > 0, 'o buffer proprietário não pode ser destacado pelo parser');

  const largeOwner = new ArrayBuffer(50 * 1024 * 1024);
  new Uint8Array(largeOwner).set([37, 80, 68, 70, 45]);
  await inspectPdfBytes(largeOwner, {
    name: 'grande-50mb.pdf', mimeType: 'application/octet-stream',
    parse: async bytes => { structuredClone(bytes, { transfer: [bytes] }); return { pageCount: 1 }; }
  });
  assert.equal(largeOwner.byteLength, 50 * 1024 * 1024, 'a ingestão grande deve preservar o buffer proprietário');

  console.log('pdf-ingest: passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
