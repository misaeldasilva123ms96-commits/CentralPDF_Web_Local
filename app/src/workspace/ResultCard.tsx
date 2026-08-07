import type { ToolResult } from '../core/types';
import { formatBytes, formatDuration, percentReduction } from './format';

interface ResultCardProps {
  result: ToolResult;
  toolName: string;
  onContinue: () => void;
}

export function ResultCard({ result, toolName, onContinue }: ResultCardProps) {
  const metrics = result.metrics;
  const reduction =
    metrics && metrics.bytesIn > 0 ? percentReduction(metrics.bytesIn, metrics.bytesOut) : null;

  const downloads = result.outputs.map((output) => ({
    name: output.name,
    bytes: output.data.byteLength,
    url: URL.createObjectURL(
      new Blob([output.data], { type: output.mimeType || 'application/octet-stream' })
    )
  }));

  return (
    <div className="cp-result">
      <h3 style={{ margin: 0 }}>Resultado concluído</h3>
      <div className="cp-result__summary">
        {metrics && (
          <>
            <div className="cp-result__stat">
              <div className="cp-result__stat-value">{formatBytes(metrics.bytesIn)}</div>
              <div className="cp-result__stat-label">Arquivo original</div>
            </div>
            <div className="cp-result__stat">
              <div className="cp-result__stat-value">{formatBytes(metrics.bytesOut)}</div>
              <div className="cp-result__stat-label">Arquivo final</div>
            </div>
            {metrics.pages !== undefined && (
              <div className="cp-result__stat">
                <div className="cp-result__stat-value">{metrics.pages}</div>
                <div className="cp-result__stat-label">Páginas</div>
              </div>
            )}
            <div className="cp-result__stat">
              <div className="cp-result__stat-value">{formatDuration(metrics.durationMs)}</div>
              <div className="cp-result__stat-label">Tempo</div>
            </div>
            {reduction !== null && reduction > 0 && (
              <div className="cp-result__stat">
                <div className="cp-result__stat-value">-{reduction}%</div>
                <div className="cp-result__stat-label">Redução</div>
              </div>
            )}
          </>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div className="cp-validation">
          {result.warnings.map((warning) => (
            <span key={warning} className="cp-validation__warning">
              {warning}
            </span>
          ))}
        </div>
      )}

      <div className="cp-result__actions">
        {downloads.map((download) => (
          <a
            key={download.name}
            className="cp-btn cp-btn--primary"
            href={download.url}
            download={download.name}
          >
            Baixar {download.name}
          </a>
        ))}
        <button type="button" className="cp-btn" onClick={onContinue}>
          Enviar para outra ferramenta ({toolName})
        </button>
      </div>
    </div>
  );
}