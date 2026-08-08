import { ToolRegistry } from './registry';
import type { JSONSchema, ToolCategory, ToolDefinition } from './types';
import { mergePdfsTool } from '../tools/merge-pdfs';
import { compressPdfTool } from '../tools/compress-pdf';

function plannedTool(
  id: string,
  category: ToolCategory,
  title: string,
  description: string,
  inputsSchema: JSONSchema = { type: 'object', properties: {} }
): ToolDefinition {
  return {
    id,
    version: '0.1.0',
    category,
    availability: 'planned',
    title,
    description,
    inputs: [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
    outputs: [{ kind: 'pdf', accept: ['application/pdf'], multiple: false, minFiles: 1 }],
    runtime: ['BROWSER_NATIVE'],
    parametersSchema: inputsSchema,
    validate: () => ({ ok: false, errors: ['Ferramenta planejada ainda não executa.'], warnings: [] }),
    estimate: () => ({}),
    execute: async () => {
      throw new Error('Ferramenta planejada ainda não implementada');
    },
    capabilities: { batch: false, cancellable: false, offline: true, workflow: false, preview: false }
  };
}

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(mergePdfsTool);
  registry.register(compressPdfTool);
  registry.register(
    plannedTool(
      'extract-text',
      'texto',
      'Extrair texto do PDF',
      'Extrai o texto de todas as páginas para um arquivo TXT.'
    )
  );
  registry.register(
    plannedTool(
      'ocr-pdf',
      'texto',
      'OCR e PDF pesquisável',
      'Reconhece texto em imagens e gera PDF pesquisável (planejado).'
    )
  );
  registry.register(
    plannedTool(
      'protect-pdf',
      'seguranca',
      'Proteger PDF',
      'Adiciona senha de abertura e restrições de uso ao PDF.'
    )
  );
  registry.register(
    plannedTool(
      'pdf-to-images',
      'conversao',
      'PDF para imagens',
      'Converte cada página do PDF em imagens PNG no navegador.'
    )
  );
  return registry;
}

export const centralCatalog: ToolRegistry = createDefaultRegistry();