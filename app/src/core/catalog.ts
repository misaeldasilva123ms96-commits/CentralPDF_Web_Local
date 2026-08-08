import { ToolRegistry } from './registry';
import type { FileContract, JSONSchema, ToolCategory, ToolDefinition } from './types';
import { mergePdfsTool } from '../tools/merge-pdfs';
import { compressPdfTool } from '../tools/compress-pdf';
import { extractTextTool } from '../tools/extract-text';
import { pdfToImagesTool } from '../tools/pdf-to-images';
import { protectPdfTool } from '../tools/protect-pdf';

interface PlannedToolOptions {
  id: string;
  category: ToolCategory;
  title: string;
  description: string;
  inputs?: FileContract[];
  outputs: FileContract[];
  parametersSchema?: JSONSchema;
}

function plannedTool({
  id,
  category,
  title,
  description,
  inputs,
  outputs,
  parametersSchema = { type: 'object', properties: {} }
}: PlannedToolOptions): ToolDefinition {
  return {
    id,
    version: '0.1.0',
    category,
    availability: 'planned',
    title,
    description,
    inputs: inputs ?? [{ kind: 'pdf', accept: ['application/pdf', '.pdf'], multiple: false, minFiles: 1 }],
    outputs,
    runtime: ['BROWSER_NATIVE'],
    parametersSchema,
    validate: () => ({ ok: false, errors: ['Ferramenta planejada ainda não executa.'], warnings: [] }),
    estimate: () => ({}),
    execute: async () => {
      throw new Error('Ferramenta planejada ainda não implementada');
    },
    capabilities: { batch: false, cancellable: false, offline: true, workflow: false, preview: false }
  };
}

const PDF_INPUT: FileContract = {
  kind: 'pdf',
  accept: ['application/pdf', '.pdf'],
  multiple: false,
  minFiles: 1
};

const PDF_OUTPUT: FileContract = {
  kind: 'pdf',
  accept: ['application/pdf'],
  multiple: false,
  minFiles: 1
};

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(mergePdfsTool);
  registry.register(compressPdfTool);
  registry.register(extractTextTool);
  registry.register(protectPdfTool);
  registry.register(pdfToImagesTool);
  registry.register(
    plannedTool({
      id: 'ocr-pdf',
      category: 'texto',
      title: 'OCR e PDF pesquisável',
      description: 'Reconhece texto em imagens e gera PDF pesquisável (planejado).',
      inputs: [PDF_INPUT],
      outputs: [PDF_OUTPUT]
    })
  );
  return registry;
}

export const centralCatalog: ToolRegistry = createDefaultRegistry();