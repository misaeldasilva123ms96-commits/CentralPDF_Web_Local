import type {
  FileContract,
  RuntimeMode,
  ToolAvailability,
  ToolCategory,
  ToolDefinition
} from './types';

export const TOOL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
export const TOOL_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export const RUNTIMES: readonly RuntimeMode[] = ['BROWSER_NATIVE', 'BROWSER_WASM'];

const AVAILABILITIES: ToolAvailability[] = ['available', 'experimental', 'planned', 'disabled'];
const CATEGORIES: ToolCategory[] = [
  'organizacao',
  'conversao',
  'conteudo',
  'texto',
  'inteligencia',
  'seguranca',
  'higiene'
];

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): this {
    this.assertValid(tool);
    if (this.tools.has(tool.id)) {
      throw new RegistryError(`Ferramenta "${tool.id}" já registrada`);
    }
    this.tools.set(tool.id, tool);
    return this;
  }

  get(id: string): ToolDefinition {
    const tool = this.tools.get(id);
    if (!tool) throw new RegistryError(`Ferramenta "${id}" não registrada`);
    return tool;
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  listByCategory(category: ToolCategory): ToolDefinition[] {
    return this.list().filter((tool) => tool.category === category);
  }

  listByAvailability(availability: ToolAvailability): ToolDefinition[] {
    return this.list().filter((tool) => tool.availability === availability);
  }

  count(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }

  private assertValid(tool: ToolDefinition): void {
    if (!TOOL_ID_PATTERN.test(tool.id)) {
      throw new RegistryError(
        `Id de ferramenta inválido "${tool.id}": use minúsculas, dígitos e hífens`
      );
    }
    if (!tool.title?.trim()) throw new RegistryError(`Ferramenta "${tool.id}" sem título`);
    if (!TOOL_VERSION_PATTERN.test(tool.version ?? '')) {
      throw new RegistryError(`Ferramenta "${tool.id}" com versão inválida "${tool.version}"`);
    }
    if (!CATEGORIES.includes(tool.category)) {
      throw new RegistryError(`Ferramenta "${tool.id}" com categoria inválida`);
    }
    if (!AVAILABILITIES.includes(tool.availability)) {
      throw new RegistryError(`Ferramenta "${tool.id}" com estado de disponibilidade inválido`);
    }
if (!Array.isArray(tool.runtime) || tool.runtime.length === 0) {
      throw new RegistryError(`Ferramenta "${tool.id}" sem runtime suportado`);
    }
    if (!tool.runtime.every((mode) => RUNTIMES.includes(mode))) {
      throw new RegistryError(`Ferramenta "${tool.id}" com runtime inválido`);
    }
    if (!Array.isArray(tool.inputs) || tool.inputs.length === 0 || !tool.inputs.every(isValidContract)) {
      throw new RegistryError(`Ferramenta "${tool.id}" sem contrato de entrada válido`);
    }
    if (!Array.isArray(tool.outputs) || tool.outputs.length === 0 || !tool.outputs.every(isValidContract)) {
      throw new RegistryError(`Ferramenta "${tool.id}" sem contrato de saída válido`);
    }
    if (
      !tool.capabilities ||
      typeof tool.capabilities.batch !== 'boolean' ||
      typeof tool.capabilities.cancellable !== 'boolean' ||
      typeof tool.capabilities.offline !== 'boolean' ||
      typeof tool.capabilities.workflow !== 'boolean' ||
      typeof tool.capabilities.preview !== 'boolean'
    ) {
      throw new RegistryError(`Ferramenta "${tool.id}" sem capacidades válidas`);
    }
    if (
      typeof tool.validate !== 'function' ||
      typeof tool.estimate !== 'function' ||
      typeof tool.execute !== 'function'
    ) {
      throw new RegistryError(`Ferramenta "${tool.id}" sem validate/estimate/execute`);
    }
  }
}

function isValidContract(contract: unknown): contract is FileContract {
  if (!contract || typeof contract !== 'object') return false;
  const candidate = contract as Partial<FileContract>;
  if (!['pdf', 'image', 'document', 'office', 'archive', 'text', 'zip', 'any'].includes(candidate.kind as string)) {
    return false;
  }
  if (!Array.isArray(candidate.accept)) return false;
  if (typeof candidate.multiple !== 'boolean') return false;
  if (typeof candidate.minFiles !== 'number' || candidate.minFiles < 0) return false;
  if (
    candidate.maxFiles !== undefined &&
    (typeof candidate.maxFiles !== 'number' || candidate.maxFiles < candidate.minFiles)
  ) {
    return false;
  }
  return true;
}
export const toolRegistry = new ToolRegistry();
