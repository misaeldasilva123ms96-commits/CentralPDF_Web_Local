export type ToolCategory =
  | 'organizacao'
  | 'conversao'
  | 'conteudo'
  | 'texto'
  | 'inteligencia'
  | 'seguranca'
  | 'higiene';

export type RuntimeMode = 'BROWSER_NATIVE' | 'BROWSER_WASM';

export type ToolAvailability = 'available' | 'experimental' | 'planned' | 'disabled';

export interface FileContract {
  kind: 'pdf' | 'image' | 'document' | 'office' | 'archive' | 'text' | 'zip' | 'any';
  accept: string[];
  multiple: boolean;
  minFiles: number;
  maxFiles?: number;
}

export interface ToolContext {
  inputs: FileInput[];
  parameters: Record<string, unknown>;
  signal?: AbortSignal;
  progress?: (percent: number, stage: string) => void;
}

export interface FileInput {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  data: ArrayBuffer;
  lastModified?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface TaskEstimate {
  expectedRuntimeMs?: number;
  memoryMb?: number;
  pages?: number;
  bytesIn?: number;
  bytesOut?: number;
}

export interface ToolResult {
  ok: boolean;
  outputs: FileOutput[];
  warnings: string[];
  metrics?: {
    durationMs: number;
    bytesIn: number;
    bytesOut: number;
    pages?: number;
    imagesRecompressed?: number;
    filesProcessed?: number;
    filesIgnored?: number;
  };
}

export interface FileOutput {
  name: string;
  mimeType: string;
  data: ArrayBuffer;
  kind: 'file' | 'zip' | 'pdf' | 'image' | 'text' | 'office';
}

export interface ToolCapabilities {
  batch: boolean;
  cancellable: boolean;
  offline: boolean;
  workflow: boolean;
  preview: boolean;
}

export interface ToolDefinition {
  id: string;
  version: string;
  category: ToolCategory;
  availability: ToolAvailability;

  title: string;
  description: string;

  inputs: FileContract[];
  outputs: FileContract[];

  runtime: RuntimeMode[];
  parametersSchema: JSONSchema;

  validate: (context: ToolContext) => ValidationResult;
  estimate: (context: ToolContext) => TaskEstimate;
  execute: (context: ToolContext) => Promise<ToolResult>;

  capabilities: ToolCapabilities;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  title?: string;
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
}