import type { ToolCategory, ToolDefinition } from './types';

export const TOOL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

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
    if (!tool.version) throw new RegistryError(`Ferramenta "${tool.id}" sem versão`);
    if (!tool.runtime || tool.runtime.length === 0) {
      throw new RegistryError(`Ferramenta "${tool.id}" sem runtime suportado`);
    }
    if (typeof tool.validate !== 'function' || typeof tool.execute !== 'function') {
      throw new RegistryError(`Ferramenta "${tool.id}" sem validate/execute`);
    }
  }
}

export const toolRegistry = new ToolRegistry();