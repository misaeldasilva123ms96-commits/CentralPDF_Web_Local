export interface QpdfWorkerRequest {
  input: ArrayBuffer;
  fileTitle: string;
  argv: string[];
}

export interface QpdfWorkerResponse {
  ok: boolean;
  output?: ArrayBuffer;
  stderr?: string;
  error?: string;
}