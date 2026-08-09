import type { QpdfWorkerRequest, QpdfWorkerResponse } from './qpdf-types';

export interface QpdfJobResult {
  output: ArrayBuffer;
  warnings: string[];
}

export class QpdfUnavailableError extends Error {
  constructor() {
    super('A proteção de PDFs exige um navegador com suporte a WebAssembly e Web Workers.');
    this.name = 'QpdfUnavailableError';
  }
}

export class QpdfCommandError extends Error {
  readonly exitCode: number;
  readonly stderr: string;

  constructor(exitCode: number, stderr: string) {
    super(`qpdf encerrou com o código ${exitCode}.`);
    this.name = 'QpdfCommandError';
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

const WORKER_PROTOCOL_ERROR = 'Resposta inválida do worker de proteção.';

/**
 * Creates a module worker for processing qpdf jobs.
 *
 * @returns The created qpdf worker
 * @throws QpdfUnavailableError if Web Worker support is unavailable
 */
function createWorker(): Worker {
  if (typeof Worker === 'undefined') {
    throw new QpdfUnavailableError();
  }
  return new Worker(new URL('./qpdf-worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Executes a QPDF request in a Web Worker.
 *
 * @param request - The QPDF operation and input data to process
 * @param signal - Optional signal used to cancel processing
 * @returns The processed PDF output and any warnings
 */
export async function runQpdfJob(
  request: QpdfWorkerRequest,
  signal?: AbortSignal
): Promise<QpdfJobResult> {
  const worker = createWorker();

  if (signal?.aborted) {
    worker.terminate();
    throw new DOMException('Aborted', 'AbortError');
  }

  return new Promise<QpdfJobResult>((resolve, reject) => {
    let settled = false;

    const finish = (result: QpdfJobResult): void => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(result);
    };

    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(error);
    };

    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      worker.removeEventListener('message', onMessage);
      worker.terminate();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const onMessage = (event: MessageEvent<QpdfWorkerResponse>): void => {
      const message = event.data;
      if (!message || typeof message.ok !== 'boolean') {
        fail(new Error(WORKER_PROTOCOL_ERROR));
        return;
      }
      if (!message.ok) {
        fail(new QpdfCommandError(-1, message.stderr ?? message.error ?? ''));
        return;
      }
      if (!(message.output instanceof ArrayBuffer)) {
        fail(new Error(WORKER_PROTOCOL_ERROR));
        return;
      }
      finish({ output: message.output, warnings: [] });
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (event) => fail(event.error ?? new Error(event.message)));
    signal?.addEventListener('abort', onAbort, { once: true });

    const input = request.input.slice(0);
    worker.postMessage({ ...request, input }, [input]);
  });
}