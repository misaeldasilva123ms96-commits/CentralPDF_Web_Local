(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CentralPDFIngest = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PDF_HEADER_LIMIT = 1024;
  const messages = Object.freeze({
    empty: 'O arquivo está vazio.',
    readFailure: 'O navegador não conseguiu ler o arquivo selecionado. Tente selecionar o arquivo novamente.',
    unsupported: 'O conteúdo do arquivo não corresponde a um PDF.',
    encrypted: 'Este PDF é protegido por senha. Desbloqueie o documento antes de continuar.',
    unsupportedEncryption: 'A criptografia deste PDF não é suportada pelo mecanismo atual.',
    corrupted: 'Não foi possível interpretar a estrutura deste PDF. O arquivo pode estar corrompido ou incompleto.',
    worker: 'O mecanismo de visualização do PDF não iniciou corretamente.'
  });

  class PdfIngestError extends Error {
    constructor(code, options) {
      super(messages[code] || messages.corrupted, options?.cause ? { cause: options.cause } : undefined);
      this.name = 'PdfIngestError';
      this.code = code;
      this.stage = options?.stage || 'inspect';
      this.engine = options?.engine || '';
      this.technicalMessage = options?.technicalMessage || options?.cause?.message || '';
    }
  }

  function isPdfCandidate(file) {
    const name = String(file?.name || '').toLowerCase();
    const type = String(file?.type ?? file?.mimeType ?? '').toLowerCase();
    return name.endsWith('.pdf') || type === 'application/pdf' || type === 'application/octet-stream' || type === '';
  }

  function hasPdfSignature(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data || 0);
    const limit = Math.min(bytes.length, PDF_HEADER_LIMIT);
    for (let index = 0; index <= limit - 5; index += 1) {
      if (bytes[index] === 0x25 && bytes[index + 1] === 0x50 && bytes[index + 2] === 0x44 && bytes[index + 3] === 0x46 && bytes[index + 4] === 0x2d) return true;
    }
    return false;
  }

  function classifyParserError(error) {
    if (error instanceof PdfIngestError) return error;
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');
    const combined = `${name} ${message}`;
    const engine = String(error?.engine || 'pdfjs');
    if (/PasswordException|password|encrypted/i.test(combined)) {
      const unsupported = /unsupported|unknown encryption|not implemented/i.test(combined);
      return new PdfIngestError(unsupported ? 'unsupportedEncryption' : 'encrypted', { stage: 'parse', engine, cause: error });
    }
    if (/worker|fake worker|importScripts|dynamically imported module|blob:null/i.test(combined)) {
      return new PdfIngestError('worker', { stage: 'worker', engine: 'pdfjs', cause: error });
    }
    return new PdfIngestError('corrupted', { stage: 'parse', engine, cause: error });
  }

  async function inspectOwnedPdfBytes(data, metadata, parse) {
    if (!(data instanceof ArrayBuffer) || data.byteLength === 0) throw new PdfIngestError('empty', { stage: 'read' });
    if (!hasPdfSignature(data)) throw new PdfIngestError('unsupported', { stage: 'signature' });
    if (typeof parse !== 'function') throw new PdfIngestError('worker', { stage: 'engine', engine: 'pdfjs' });
    try {
      const parsed = await parse(data);
      const pageCount = Number(parsed?.pageCount || 0);
      if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error('PDF sem páginas legíveis.');
      return {
        status: 'valid',
        pageCount,
        name: String(metadata?.name || ''),
        size: data.byteLength,
        mimeType: String(metadata?.mimeType ?? metadata?.type ?? '')
      };
    } catch (error) {
      throw classifyParserError(error);
    }
  }

  async function inspectPdfBytes(data, options, parseArgument) {
    const parse = parseArgument || options?.parse;
    const owned = data instanceof ArrayBuffer ? data.slice(0) : data;
    return inspectOwnedPdfBytes(owned, options, parse);
  }

  async function inspectPdfFile(file, options) {
    if (!file || Number(file.size) === 0) throw new PdfIngestError('empty', { stage: 'read' });
    let bytes;
    try {
      bytes = await file.arrayBuffer();
    } catch (error) {
      throw new PdfIngestError('readFailure', { stage: 'read', cause: error });
    }
    return inspectOwnedPdfBytes(bytes, { name: file.name, mimeType: file.type }, options?.parse);
  }

  function describeError(error) {
    return error instanceof PdfIngestError ? error.message : messages.corrupted;
  }

  return { PdfIngestError, classifyParserError, describeError, hasPdfSignature, inspectPdfBytes, inspectPdfFile, isPdfCandidate };
});
