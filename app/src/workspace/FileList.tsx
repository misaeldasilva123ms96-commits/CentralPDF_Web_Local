import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useAppStore } from '../store/app-store';
import { formatBytes } from './format';
import type { FileContract, FileInput } from '../core/types';

interface FileListProps {
  contracts: FileContract[];
  generateId?: () => string;
  disabled?: boolean;
}

/**
 * Provides a file drop zone and file list with support for selection, removal, and reordering.
 *
 * @param contracts - File selection contracts that define accepted formats and whether multiple files are allowed.
 * @param generateId - Generates an identifier for each added file.
 */
export function FileList({ contracts, generateId = defaultId, disabled = false }: FileListProps) {
  const files = useAppStore((state) => state.files);
  const addFiles = useAppStore((state) => state.addFiles);
  const removeFile = useAppStore((state) => state.removeFile);
  const reorderFileTo = useAppStore((state) => state.reorderFileTo);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const commitChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    if (!mountedRef.current) return;
    commitChainRef.current = commitChainRef.current.then(() => {
      if (mountedRef.current) addFiles(inputs);
    });
    await commitChainRef.current;
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    void ingest(event.dataTransfer.files);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    if (event.target.files && !disabled) void ingest(event.target.files);
    event.target.value = '';
  }

  return (
    <div className="cp-panel__body">
      <div
        className={`cp-dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={multiple ? 'Escolha ou arraste seus arquivos' : 'Escolha ou arraste um arquivo'}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          if (disabled) return;
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
                    disabled={disabled || index === 0}
                    onClick={() => reorderFileTo(file.id, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="cp-btn cp-btn--ghost cp-btn--small"
                    aria-label={`Mover ${file.name} para baixo`}
                    disabled={disabled || index === files.length - 1}
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
                disabled={disabled}
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

/**
 * Generates a unique identifier.
 *
 * @returns A randomly generated UUID
 */
function defaultId(): string {
  return crypto.randomUUID();
}

/**
 * Reads a file's contents as an array buffer.
 *
 * @param file - The file to read
 * @returns The file contents
 */
function readFileData(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Determines the display label for a document based on its file extension.
 *
 * @param name - The document filename
 * @returns `PDF` for PDF files, `IMG` for image files, `OFF` for Office files, the first three characters of other extensions, or `ARQ` when no extension is present.
 */
function documentIcon(name: string): string {
  const normalized = (name.split('.').pop() ?? '').toLowerCase();
  if (normalized === 'pdf') return 'PDF';
  const imageTypes = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff', 'heic']);
  if (imageTypes.has(normalized)) return 'IMG';
  if (['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(normalized)) return 'OFF';
  return normalized.slice(0, 3).toUpperCase() || 'ARQ';
}