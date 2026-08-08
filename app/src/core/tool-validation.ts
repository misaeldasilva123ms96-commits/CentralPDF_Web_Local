import type {
  FileContract,
  FileInput,
  JSONSchema,
  JSONSchemaProperty,
  ToolDefinition
} from './types';
import type { RuntimeDecision } from './runtime';

export interface ValidationIssue {
  code: string;
  message: string;
  field?: string;
  fileId?: string;
}

export interface ToolRequestValidation {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidateToolRequestOptions {
  tool: ToolDefinition;
  files: FileInput[];
  parameters: Record<string, unknown>;
  runtime: RuntimeDecision | null;
}

const MIME_FALLBACK = 'application/octet-stream';

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

const EXT_BY_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
  'application/zip': ['.zip'],
  'text/plain': ['.txt']
};

function acceptsFile(contract: FileContract, file: FileInput): boolean {
  if (contract.accept.length === 0) return true;
  const mime = file.mimeType || MIME_FALLBACK;
  const ext = extensionOf(file.name);
  const extOk = contract.accept.some((entry) => entry.startsWith('.') && entry === ext);
  if (ext && extOk) return true;
  if (contract.accept.some((entry) => entry === mime)) {
    const derived = EXT_BY_MIME[mime] ?? [];
    return derived.length === 0 || ext === '' || derived.includes(ext);
  }
  return false;
}

function headerStartsWith(data: ArrayBuffer, marker: string): boolean {
  const bytes = new Uint8Array(data.slice(0, marker.length));
  let head = '';
  for (const byte of bytes) head += String.fromCharCode(byte);
  return head === marker;
}

const MAGIC_BY_KIND: Partial<Record<FileContract['kind'], (data: ArrayBuffer) => boolean>> = {
  pdf: (data) => headerStartsWith(data, '%PDF-'),
  zip: (data) => headerStartsWith(data, 'PK\u0003\u0004') || headerStartsWith(data, 'PK\u0005\u0006')
};

function validateSchemaParameters(
  schema: JSONSchema,
  parameters: Record<string, unknown>
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];

  for (const key of schema.required ?? []) {
    const property = schema.properties?.[key];
    if (parameters[key] === undefined && property?.default === undefined) {
      errors.push({
        code: 'missing_parameter',
        message: `Parâmetro "${key}" é obrigatório.`,
        field: key
      });
    }
  }

  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    if (parameters[key] === undefined) continue;
    const value = parameters[key];
    if (property.enum && !property.enum.includes(value as string | number)) {
      errors.push({
        code: 'invalid_enum',
        message: `"${key}" deve ser um dos valores: ${property.enum.join(', ')}.`,
        field: key
      });
      continue;
    }
    const typeError = checkBasicType(property, value);
    if (typeError) errors.push(typeError);
    if (typeof value === 'number' && property.minimum !== undefined && value < property.minimum) {
      errors.push({
        code: 'below_minimum',
        message: `"${key}" deve ser maior ou igual a ${property.minimum}.`,
        field: key
      });
    }
    if (typeof value === 'number' && property.maximum !== undefined && value > property.maximum) {
      errors.push({
        code: 'above_maximum',
        message: `"${key}" deve ser menor ou igual a ${property.maximum}.`,
        field: key
      });
    }
  }
  return errors;
}

function checkBasicType(property: JSONSchemaProperty, value: unknown): ValidationIssue | null {
  switch (property.type) {
    case 'string':
      if (typeof value !== 'string') return { code: 'invalid_type', message: 'Valor deve ser texto.', field: property.title };
      break;
    case 'number':
      if (typeof value !== 'number') return { code: 'invalid_type', message: 'Valor deve ser numérico.', field: property.title };
      break;
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) return { code: 'invalid_type', message: 'Valor deve ser inteiro.', field: property.title };
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return { code: 'invalid_type', message: 'Valor deve ser booleano.', field: property.title };
      break;
    default:
      break;
  }
  return null;
}

export function validateToolRequest(
  options: ValidateToolRequestOptions
): ToolRequestValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { tool, files, parameters, runtime } = options;

  if (tool.availability === 'planned') {
    errors.push({ code: 'tool_planned', message: 'Esta ferramenta ainda não está disponível.' });
  } else if (tool.availability === 'disabled') {
    errors.push({ code: 'tool_disabled', message: 'Esta ferramenta está desabilitada.' });
  } else if (tool.availability === 'experimental') {
    warnings.push({
      code: 'experimental',
      message: 'Ferramenta experimental: use com cautela e confira o resultado.'
    });
  }

  if (runtime && !runtime.available) {
    errors.push({
      code: 'runtime_unavailable',
      message: 'Nenhum motor disponível para esta ferramenta no momento.'
    });
  }

  const matching = new Array<FileContract | undefined>(files.length);
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file.name || file.name.trim() === '') {
      errors.push({ code: 'empty_name', message: 'Arquivo sem nome.', fileId: file.id });
    }
    if (file.size === 0) {
      errors.push({ code: 'empty_file', message: `"${file.name}" está vazio.`, fileId: file.id });
    }
    matching[index] = undefined;
    for (const contract of tool.inputs) {
      if (acceptsFile(contract, file)) {
        matching[index] = contract;
        break;
      }
    }
    if (!matching[index]) {
      errors.push({
        code: 'file_type',
        message: `"${file.name}" não é aceito por esta ferramenta.`,
        fileId: file.id
      });
    }
  }

  for (const contract of tool.inputs) {
    const fileIds = files
      .map((file, index) => (matching[index] === contract ? file.id : null))
      .filter((id): id is string => id !== null);
    if (!contract.multiple && fileIds.length > 1) {
      errors.push({
        code: 'multiple',
        message: 'Esta ferramenta aceita apenas um arquivo por vez.'
      });
    }
    if (fileIds.length < contract.minFiles) {
      errors.push({
        code: 'min_files',
        message: `Envie pelo menos ${contract.minFiles} arquivo${contract.minFiles > 1 ? 's' : ''}.`,
        field: contract.kind
      });
    }
    if (contract.maxFiles !== undefined && fileIds.length > contract.maxFiles) {
      errors.push({
        code: 'max_files',
        message: `Envie no máximo ${contract.maxFiles} arquivos.`,
        field: contract.kind
      });
    }
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const contract = matching[index];
    if (!contract) continue;
    const magic = MAGIC_BY_KIND[contract.kind];
    if (magic && !magic(file.data)) {
      warnings.push({
        code: 'bad_signature',
        message: `"${file.name}" não parece ser um ${contract.kind.toUpperCase()} válido e pode ser ignorado.`,
        fileId: file.id
      });
    }
  }

  errors.push(...validateSchemaParameters(tool.parametersSchema, parameters));

  return { valid: errors.length === 0, errors, warnings };
}