import init from 'qpdf-wasm';
import wasmUrl from 'qpdf-wasm/qpdf.wasm?url';
import qpdfJsUrl from 'qpdf-wasm/qpdf.js?url';
import type { QpdfWorkerRequest, QpdfWorkerResponse } from './qpdf-types';

interface QpdfModule {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  callMain: (argv: string[]) => number;
  print: (text: string) => void;
  printErr: (text: string) => void;
}

const workerScope = self as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<QpdfWorkerRequest>) => void) => void;
  postMessage: (message: QpdfWorkerResponse, transfer?: Transferable[]) => void;
};

/**
 * Initializes the QPDF WebAssembly module with the bundled runtime assets.
 *
 * @param printErr - Callback that receives QPDF error output lines
 * @returns The initialized QPDF module
 */
async function loadQpdf(printErr: (line: string) => void): Promise<QpdfModule> {
  return (await init({
    locateFile: (file: string) => {
      if (file === 'qpdf.wasm') return wasmUrl;
      if (file === 'qpdf.js') return qpdfJsUrl;
      return file;
    },
    print: () => undefined,
    printErr
  })) as unknown as QpdfModule;
}

/**
 * Creates a filesystem-safe title for the input file.
 *
 * @param title - The requested file title
 * @returns The title with unsupported characters replaced by underscores, limited to 60 characters, or `entrada` when empty
 */
function sanitizeFileTitle(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'entrada';
}

workerScope.addEventListener('message', async (event: MessageEvent<QpdfWorkerRequest>) => {
  const request = event.data;
  const fileTitle = sanitizeFileTitle(request.fileTitle);
  const stderrLines: string[] = [];
  const printErr = (line: string): void => {
    stderrLines.push(line);
  };
  let module: QpdfModule | null = null;

  try {
    module = await loadQpdf(printErr);
    const input = new Uint8Array(request.input);
    module.FS.writeFile(`/${fileTitle}.in.pdf`, input);

    const exitCode = module.callMain([...request.argv, '--', `/${fileTitle}.in.pdf`, `/${fileTitle}.out.pdf`]);
    if (exitCode !== 0) {
      const response: QpdfWorkerResponse = {
        ok: false,
        stderr: stderrLines.join('\n')
      };
      workerScope.postMessage(response);
      return;
    }

    const output = module.FS.readFile(`/${fileTitle}.out.pdf`);
    module.FS.unlink(`/${fileTitle}.in.pdf`);
    module.FS.unlink(`/${fileTitle}.out.pdf`);

    const payload = output.slice().buffer as ArrayBuffer;
    workerScope.postMessage({ ok: true, output: payload }, [payload]);
  } catch (error) {
    const response: QpdfWorkerResponse = {
      ok: false,
      stderr: stderrLines.join('\n'),
      error: error instanceof Error ? error.message : 'erro desconhecido'
    };
    workerScope.postMessage(response);
  }
});

export {};
