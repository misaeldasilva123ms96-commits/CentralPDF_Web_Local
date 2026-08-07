import type { FileContract, JSONSchema } from '../core/types';
import type { RuntimeDecision } from '../core/runtime';

interface ValidationBarProps {
  files: { name: string }[];
  contracts: FileContract[];
  schema: JSONSchema;
  runtime: RuntimeDecision | null;
}

export function ValidationBar({ files, contracts, schema, runtime }: ValidationBarProps) {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const contract of contracts) {
    if (files.length < contract.minFiles) {
      errors.push(
        `Envie pelo menos ${contract.minFiles} arquivo${contract.minFiles > 1 ? 's' : ''}${contract.multiple ? '' : ' deste tipo'}`
      );
    }
  }

  if (files.length === 0) {
    warnings.push('Nenhum arquivo selecionado ainda.');
  }

  const required = schema.required ?? [];
  if (required.length > 0) {
    for (const key of required) {
      const property = schema.properties?.[key];
      const hasDefault = property?.default !== undefined;
      if (!hasDefault) warnings.push(`Parâmetro "${key}" é necessário.`);
    }
  }

  if (runtime && runtime.reason === 'unavailable') {
    errors.push('Nenhum motor disponível para esta ferramenta no momento.');
  }

  if (errors.length > 0) {
    return (
      <div className="cp-validation" role="status" aria-live="polite">
        {errors.map((error) => (
          <span key={error} className="cp-validation__error">
            {error}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="cp-validation" role="status" aria-live="polite">
      <span className="cp-validation--ok">Pronto para processar</span>
      {warnings.map((warning) => (
        <span key={warning} className="cp-validation__warning">
          {warning}
        </span>
      ))}
    </div>
  );
}