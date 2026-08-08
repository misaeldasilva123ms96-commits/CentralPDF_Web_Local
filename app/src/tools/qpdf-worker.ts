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
let stderrLines: string[] = [];

const printErr = (line: string): void => {
  stderrLines.push(line);
};

async function loadQpdf(): Promise<QpdfModule> {
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

workerScope.addEventListener('message', async (event: MessageEvent<QpdfWorkerRequest>) => {
  const request = event.data;
  let module: QpdfModule | null = null;

  try {
    stderrLines = [];
    module = await loadQpdf();
    const input = new Uint8Array(request.input);
    module.FS.writeFile(`/${request.fileTitle}.in.pdf`, input);

    const exitCode = module.callMain([...request.argv, `/${request.fileTitle}.in.pdf`, `/${request.fileTitle}.out.pdf`]);
    if (exitCode !== 0) {
      const response: QpdfWorkerResponse = {
        ok: false,
        stderr: stderrLines.join('\n')
      };
      workerScope.postMessage(response);
      return;
    }

    const output = module.FS.readFile(`/${request.fileTitle}.out.pdf`);
    module.FS.unlink(`/${request.fileTitle}.in.pdf`);
    module.FS.unlink(`/${request.fileTitle}.out.pdf`);

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
