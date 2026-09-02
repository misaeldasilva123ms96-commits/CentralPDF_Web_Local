import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pdfLib from '../app/node_modules/pdf-lib/cjs/index.js';

const { PDFDocument, StandardFonts, degrees, rgb } = pdfLib;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(projectRoot, 'tests', 'pdf-corpus', 'cache', 'generated');
const fixedDate = new Date('2020-01-01T00:00:00.000Z');

await mkdir(outputDirectory, { recursive: true });

async function save(name, document) {
  const bytes = await document.save({ useObjectStreams: true });
  await writeFile(path.join(outputDirectory, name), bytes);
  return bytes;
}

async function basicDocument(text = 'CentralPDF Compatibility Gate 1.0') {
  const document = await PDFDocument.create();
  document.setProducer('CentralPDF deterministic compatibility fixture');
  document.setCreationDate(fixedDate);
  document.setModificationDate(fixedDate);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([595, 842]);
  page.drawText(text, { x: 48, y: 780, size: 18, font, color: rgb(0.1, 0.2, 0.4) });
  return document;
}

await save('basic.pdf', await basicDocument());

const unicode = await basicDocument('Compatibilidade: acentos e metadados');
unicode.setTitle('CentralPDF — português, 日本語 e العربية');
unicode.setSubject('Unicode metadata compatibility');
await save('unicode.pdf', unicode);

const multipage = await PDFDocument.create();
multipage.setCreationDate(fixedDate);
multipage.setModificationDate(fixedDate);
const font = await multipage.embedFont(StandardFonts.Helvetica);
for (let index = 0; index < 8; index += 1) {
  const page = multipage.addPage(index % 2 ? [842, 595] : [595, 842]);
  if (index % 3 === 1) page.setRotation(degrees(90));
  page.drawText(`Page ${index + 1}`, { x: 40, y: 500, size: 20, font });
}
await save('multipage.pdf', multipage);

const manyPages = await PDFDocument.create();
manyPages.setCreationDate(fixedDate);
manyPages.setModificationDate(fixedDate);
for (let index = 0; index < 600; index += 1) {
  manyPages.addPage([200 + (index % 4), 300 + (index % 7)]);
}
await save('large-page-count.pdf', manyPages);

const large = await basicDocument('50 MiB deterministic attachment');
const targetBytes = 50 * 1024 * 1024;
const payload = new Uint8Array(targetBytes);
let offset = 0;
let counter = 0;
while (offset < payload.length) {
  const block = createHash('sha256').update(`centralpdf-compat-${counter}`).digest();
  payload.set(block.subarray(0, Math.min(block.length, payload.length - offset)), offset);
  offset += block.length;
  counter += 1;
}
await large.attach(payload, 'deterministic-50mb.bin', {
  mimeType: 'application/octet-stream',
  description: 'Deterministic stress payload'
});
await save('large-size-50mb.pdf', large);

await writeFile(path.join(outputDirectory, 'fake-extension.pdf'), 'This file is intentionally not a PDF.\n');
const basicBytes = await readFile(path.join(outputDirectory, 'basic.pdf'));
await writeFile(path.join(outputDirectory, 'truncated.pdf'), basicBytes.subarray(0, Math.min(96, basicBytes.length)));

console.log('Generated 7 controlled PDF compatibility fixtures.');
