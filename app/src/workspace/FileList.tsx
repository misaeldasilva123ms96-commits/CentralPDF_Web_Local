import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useAppStore } from '../store/app-store';
import { formatBytes } from './format';
import type { FileContract, FileInput } from '../core/types';

interface FileListProps {
  contracts: FileContract[];
  generateId?: () => string;
}

export function FileList({ contracts, generateId = defaultId }: FileListProps) {
  const files = useAppStore((state) => state.files);
  const addFiles = useAppStore((state) => state.addFiles);
  const removeFile = useAppStore((state) => state.removeFile);
  const reorderFileTo = useAppStore((state) => state.reorderFileTo);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const multiple = contracts.some((contract) => contract.multiple);

  const accept = contracts.flatMap((contract) => contract.accept).join(',');

  async function ingest(reader: ArrayLike<File>): Promise<void> {
    const selected = Array.from(reader);
    if (selected.length === 0) return;
    const inputs = await Promise.all(
      selected.map(
        async (file): Promise<FileInput> => ({
          id: generateId(),
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          data: await readFileData(file),
          lastModified: file.lastModified
        })
      )
    );
    addFiles(inputs);
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    setDragging(false);
    void ingest(event.dataTransfer.files);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    if (event.target.files) void ingest(event.target.files);
    event.target.value = '';
  }

  return (
    <div className="cp-panel__body">
      <div
        className={`cp-dropzone${dragging ? ' is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={multiple ? 'Escolha ou arraste seus arquivos' : 'Escolha ou arraste um arquivo'}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p style={{ margin: 0 }}>
          <strong>{multiple ? 'Escolha seus arquivos' : 'Escolha um arquivo'}</strong>
        </p>
        <p style={{ margin: 0, fontSize: 'var(--cp-font-size-sm)' }}>
          Arraste para cá ou clique para selecionar
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          aria-hidden="true"
          onChange={onChange}
        />
      </div>

      {files.length > 0 && (
        <div className="cp-file-list" style={{ marginTop: 'var(--cp-space-3)' }}>
          {files.map((file, index) => (
            <div key={file.id} className="cp-file-item">
              <div className="cp-file-item__order" aria-hidden="true">
                {index + 1}
              </div>
              <span className="cp-file-item__icon" aria-hidden="true">
                {documentIcon(file.name)}
              </span>
              <div className="cp-file-item__meta">
                <div className="cp-file-item__name" title={file.name}>
                  {file.name}
                </div>
                <div className="cp-file-item__size">{formatBytes(file.size)}</div>
              </div>
              {multiple && (
                <span className="cp-file-item__move">
                  <button
                    type="button"
                    className="cp-btn cp-btn--ghost cp-btn--small"
                    aria-label={`Mover ${file.name} para cima`}
                    disabled={index === 0}
                    onClick={() => reorderFileTo(file.id, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="cp-btn cp-btn--ghost cp-btn--small"
                    aria-label={`Mover ${file.name} para baixo`}
                    disabled={index === files.length - 1}
                    onClick={() => reorderFileTo(file.id, index + 1)}
                  >
                    ↓
                  </button>
                </span>
              )}
              <button
                type="button"
                className="cp-btn cp-btn--ghost cp-btn--small"
                aria-label={`Remover ${file.name}`}
                onClick={() => removeFile(file.id)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function defaultId(): string {
  return crypto.randomUUID();
}

function readFileData(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function documentIcon(name: string): string {
  const normalized = (name.split('.').pop() ?? '').toLowerCase();
  if (normalized === 'pdf') return 'PDF';
  const imageTypes = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff', 'heic']);
  if (imageTypes.has(normalized)) return 'IMG';
  if (['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(normalized)) return 'OFF';
  return normalized.slice(0, 3).toUpperCase() || 'ARQ';
}