export type PdfIngestErrorCode =
  | 'empty'
  | 'readFailure'
  | 'unsupported'
  | 'encrypted'
  | 'unsupportedEncryption'
  | 'corrupted'
  | 'worker';

const MESSAGES: Record<PdfIngestErrorCode, string> = {
  empty: 'O arquivo está vazio.',
  readFailure: 'O navegador não conseguiu ler o arquivo selecionado. Tente selecionar o arquivo novamente.',
  unsupported: 'O conteúdo do arquivo não corresponde a um PDF.',
  encrypted: 'Este PDF é protegido por senha. Desbloqueie o documento antes de continuar.',
  unsupportedEncryption: 'A criptografia deste PDF não é suportada pelo mecanismo atual.',
  corrupted: 'Não foi possível interpretar a estrutura deste PDF. O arquivo pode estar corrompido ou incompleto.',
  worker: 'O mecanismo de visualização do PDF não iniciou corretamente.'
};

export class PdfIngestError extends Error {
  readonly code: PdfIngestErrorCode;
  readonly stage: string;
  readonly engine: string;
  readonly technicalMessage: string;

  constructor(code: PdfIngestErrorCode, options: { stage?: string; engine?: string; cause?: unknown } = {}) {
    super(MESSAGES[code], { cause: options.cause });
    this.name = 'PdfIngestError';
    this.code = code;
    this.stage = options.stage ?? 'inspect';
    this.engine = options.engine ?? '';
    this.technicalMessage = options.cause instanceof Error ? options.cause.message : String(options.cause ?? '');
  }
}

interface PdfCandidate {
  name: string;
  mimeType?: string;
  type?: string;
}

export interface PdfInspection {
  status: 'valid';
  pageCount: number;
  name: string;
  size: number;
  mimeType: string;
}

export type PdfParser = (ownedBytes: ArrayBuffer) => Promise<{ pageCount: number }>;

export function isPdfCandidate(file: PdfCandidate): boolean {
  const type = (file.mimeType ?? file.type ?? '').toLowerCase();
  return file.name.toLowerCase().endsWith('.pdf')
    || type === 'application/pdf'
    || type === 'application/octet-stream'
    || type === '';
}

export function hasPdfSignature(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data);
  const limit = Math.min(bytes.length, 1024);
  for (let index = 0; index <= limit - 5; index += 1) {
    if (bytes[index] === 0x25 && bytes[index + 1] === 0x50 && bytes[index + 2] === 0x44 && bytes[index + 3] === 0x46 && bytes[index + 4] === 0x2d) return true;
  }
  return false;
}

function classifyParserError(error: unknown): PdfIngestError {
  if (error instanceof PdfIngestError) return error;
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  const combined = `${name} ${message}`;
  if (/PasswordException|password|encrypted/i.test(combined)) {
    const unsupported = /unsupported|unknown encryption|not implemented/i.test(combined);
    return new PdfIngestError(unsupported ? 'unsupportedEncryption' : 'encrypted', { stage: 'parse', engine: 'pdfjs', cause: error });
  }
  if (/worker|fake worker|importScripts|dynamically imported module|blob:null/i.test(combined)) {
    return new PdfIngestError('worker', { stage: 'worker', engine: 'pdfjs', cause: error });
  }
  return new PdfIngestError('corrupted', { stage: 'parse', engine: 'pdfjs', cause: error });
}

export async function inspectPdfBytes(data: ArrayBuffer, metadata: PdfCandidate, parse: PdfParser): Promise<PdfInspection> {
  if (data.byteLength === 0) throw new PdfIngestError('empty', { stage: 'read' });
  if (!hasPdfSignature(data)) throw new PdfIngestError('unsupported', { stage: 'signature' });
  try {
    const parsed = await parse(data.slice(0));
    if (!Number.isInteger(parsed.pageCount) || parsed.pageCount < 1) throw new Error('PDF sem páginas legíveis.');
    return {
      status: 'valid',
      pageCount: parsed.pageCount,
      name: metadata.name,
      size: data.byteLength,
      mimeType: metadata.mimeType ?? metadata.type ?? ''
    };
  } catch (error) {
    throw classifyParserError(error);
  }
}

export function describePdfIngestError(error: unknown): string {
  return error instanceof PdfIngestError ? error.message : MESSAGES.corrupted;
}
