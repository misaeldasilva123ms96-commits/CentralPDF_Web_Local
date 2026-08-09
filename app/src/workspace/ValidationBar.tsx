import type { FileInput, ToolDefinition } from '../core/types';
import type { RuntimeDecision } from '../core/runtime';
import { validateToolRequest, type ToolRequestValidation } from '../core/tool-validation';

interface ValidationBarProps {
  tool: ToolDefinition;
  files: FileInput[];
  parameters: Record<string, unknown>;
  runtime: RuntimeDecision | null;
}

/**
 * Displays validation errors, warnings, or a ready-to-process status for a tool request.
 *
 * @returns The validation status interface for the tool request.
 */
export function ValidationBar({ tool, files, parameters, runtime }: ValidationBarProps) {
  const result: ToolRequestValidation = validateToolRequest({
    tool,
    files,
    parameters,
    runtime
  });

  if (result.errors.length > 0) {
    return (
      <div className="cp-validation" role="status" aria-live="polite">
        {result.errors.map((issue) => (
          <span key={`${issue.code}-${issue.fileId ?? issue.field ?? issue.message}`} className="cp-validation__error">
            {issue.message}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="cp-validation" role="status" aria-live="polite">
      <span className="cp-validation--ok">Pronto para processar</span>
      {result.warnings.map((issue) => (
        <span key={`${issue.code}-${issue.fileId ?? issue.field ?? issue.message}`} className="cp-validation__warning">
          {issue.message}
        </span>
      ))}
    </div>
  );
}