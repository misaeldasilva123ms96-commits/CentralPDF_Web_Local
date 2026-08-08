declare module 'qpdf-wasm' {
  interface QpdfModuleOptions {
    locateFile?: (file: string) => string;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    [key: string]: unknown;
  }

  interface QpdfModule {
    FS: {
      writeFile: (path: string, data: Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
      unlink: (path: string) => void;
    };
    callMain: (argv: string[]) => number;
    print: (text: string) => void;
    printErr: (text: string) => void;
    ENV: Record<string, string>;
  }

  export default function init(options?: QpdfModuleOptions): Promise<QpdfModule>;
}