import { useEffect, useState } from 'react';
import type { ToolResult } from '../core/types';
import type { TaskStatus } from '../core/task-engine';
import { formatBytes, formatDuration, percentReduction } from './format';

interface DownloadItem {
  name: string;
  bytes: number;
  url: string;
}

interface ResultCardProps {
  status: TaskStatus;
  result?: ToolResult;
  error?: string;
  toolName: string;
  onReprocess: () => void;
}

/**
 * Displays processing results, warnings, downloadable output files, or failure and cancellation messages.
 *
 * @param status - The current processing status
 * @param result - The processing result and output files, when available
 * @param error - The failure message to display for failed processing
 * @param toolName - The name of the tool that produced the result
 * @param onReprocess - Called when the user requests processing new files
 * @returns The result card element
 */
export function ResultCard({ status, result, error, toolName, onReprocess }: ResultCardProps) {
  const succeeded = status === 'succeeded' && Boolean(result);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    if (!succeeded || !result || result.outputs.length === 0) {
      setDownloads([]);
      return undefined;
    }

    const created = result.outputs.map((output) => ({
      name: output.name,
      bytes: output.data.byteLength,
      url: URL.createObjectURL(
        new Blob([output.data], { type: output.mimeType || 'application/octet-stream' })
      )
    }));

    setDownloads(created);

    return () => {
      for (const download of created) {
        URL.revokeObjectURL(download.url);
      }
    };
  }, [succeeded, result]);

  if (!succeeded) {
    const heading = status === 'cancelled' ? 'Processamento cancelado' : 'Falha ao processar';
    return (
      <div className="cp-result" role="alert">
        <h3 style={{ margin: 0 }}>{heading}</h3>
        {status === 'failed' && error && (
          <div className="cp-validation__error">{error}</div>
        )}
        <div className="cp-result__actions">
          <button type="button" className="cp-btn" onClick={onReprocess}>
            Processar novos arquivos
          </button>
        </div>
      </div>
    );
  }

  const metrics = result!.metrics;
  const reduction =
    metrics && metrics.bytesIn > 0 ? percentReduction(metrics.bytesIn, metrics.bytesOut) : null;

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

      {result!.warnings.length > 0 && (
        <div className="cp-validation">
          {result!.warnings.map((warning) => (
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
        <button type="button" className="cp-btn" onClick={onReprocess}>
          Processar novos arquivos
        </button>
      </div>
      <p className="muted" style={{ fontSize: 'var(--cp-font-size-sm)', marginBottom: 0 }}>
        {toolName} · pronto para revisão
      </p>
    </div>
  );
}