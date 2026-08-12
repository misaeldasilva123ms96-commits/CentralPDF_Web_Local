import { useCallback, useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useAppStore } from '../store/app-store';
import { formatBytes } from './format';
import type { FileContract, FileInput } from '../core/types';
import { Icon } from '../ui/Icon';
import { PdfThumbnail } from './PdfThumbnail';

interface FileListProps {
  contracts: FileContract[];
  generateId?: () => string;
  disabled?: boolean;
}

export function FileList({ contracts, generateId = defaultId, disabled = false }: FileListProps) {
  const files = useAppStore((state) => state.files);
  const addFiles = useAppStore((state) => state.addFiles);
  const removeFile = useAppStore((state) => state.removeFile);
  const reorderFileTo = useAppStore((state) => state.reorderFileTo);
  const [dragging, setDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [readErrors, setReadErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const disabledRef = useRef(disabled);
  const ingestChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  const multiple = contracts.some((contract) => contract.multiple);
  const accept = contracts.flatMap((contract) => contract.accept).join(',');
  const previewFile = files.find((file) => file.id === previewId);

  useEffect(() => {
    if (!previewFile) return undefined;
    closeButtonRef.current?.focus();
    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePreview();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = closeButtonRef.current?.closest<HTMLElement>('[role="dialog"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled')) : [];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onDialogKeyDown);
    return () => document.removeEventListener('keydown', onDialogKeyDown);
  }, [previewFile]);

  function enqueueIngest(reader: ArrayLike<File>): void {
    const selected = Array.from(reader);
    if (selected.length === 0 || disabledRef.current || !mountedRef.current) return;
    ingestChainRef.current = ingestChainRef.current.catch(() => undefined).then(async () => {
      if (!mountedRef.current || disabledRef.current) return;
      const inputs: FileInput[] = [];
      const failures: string[] = [];
      for (const file of selected) {
        try {
          inputs.push({
            id: generateId(), name: file.name, size: file.size,
            mimeType: file.type || 'application/octet-stream',
            data: await readFileData(file), lastModified: file.lastModified
          });
        } catch (error) {
          failures.push(file.name);
          console.error(`Não foi possível ler ${file.name}.`, error);
        }
      }
      if (mountedRef.current && !disabledRef.current) {
        if (failures.length > 0) {
          setReadErrors((current) => [...new Set([...current, ...failures])]);
        }
        if (inputs.length > 0) addFiles(inputs);
      }
    });
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    setDragging(false);
    if (!disabled) enqueueIngest(event.dataTransfer.files);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    if (event.target.files && !disabled) enqueueIngest(event.target.files);
    event.target.value = '';
  }

  const rememberPages = useCallback((id: string, pages: number) => {
    setPageCounts((current) => current[id] === pages ? current : { ...current, [id]: pages });
  }, []);

  function openPreview(fileId: string, trigger: HTMLButtonElement): void {
    previewTriggerRef.current = trigger;
    setPreviewId(fileId);
  }

  function closePreview(): void {
    setPreviewId(null);
    window.setTimeout(() => previewTriggerRef.current?.focus(), 0);
  }

  const dropzone = (
    <div
      className={`cp-dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}${files.length > 0 ? ' is-compact' : ''}`}
      role="button" tabIndex={disabled ? -1 : 0}
      aria-label={multiple ? 'Escolha ou arraste seus arquivos' : 'Escolha ou arraste um arquivo'}
      aria-disabled={disabled}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          if (event.key === ' ') event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => { if (!disabled) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)} onDrop={onDrop}
    >
      <span className="cp-dropzone__icon"><Icon name={files.length > 0 ? 'add' : 'upload'} size={files.length > 0 ? 22 : 28} /></span>
      {files.length === 0 ? <><strong>Adicionar arquivos</strong><span>Arraste seus documentos aqui ou selecione no dispositivo</span><span className="cp-dropzone__button">Selecionar arquivos</span></> : <><strong>Adicionar mais</strong><span>ou solte aqui</span></>}
    </div>
  );

  return (
    <div className={files.length === 0 ? 'cp-empty-workspace' : 'cp-files-workspace'}>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden aria-hidden="true" onChange={onChange} />
      {readErrors.length > 0 && (
        <div className="cp-ingest-errors" role="alert">
          Não foi possível ler: {readErrors.join(', ')}.
        </div>
      )}
      {files.length === 0 ? <>
        <div className="cp-empty-workspace__copy"><h2>Seus documentos, prontos para trabalhar</h2><p>O processamento acontece localmente. Nada é enviado para servidores.</p></div>
        {dropzone}
        <div className="cp-empty-workspace__trust"><Icon name="lock" size={16} /> Seguro, privado e sem limites de upload</div>
      </> : <>
      <div className="cp-file-list" aria-label="Arquivos selecionados">
        {files.map((file, index) => (
          <article
            key={file.id}
            className={`cp-file-item${draggedId === file.id ? ' is-dragging' : ''}`}
            draggable={!disabled && multiple}
            onDragStart={(event) => { setDraggedId(file.id); event.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => {
              if (!disabled && draggedId && draggedId !== file.id) {
                event.preventDefault();
                if (files.findIndex((entry) => entry.id === draggedId) !== index) {
                  reorderFileTo(draggedId, index);
                }
              }
            }}
          >
            <span className="cp-file-item__order">{index + 1}</span>
            <button type="button" className="cp-file-item__preview" aria-label={`Abrir prévia de ${file.name}`} onClick={(event) => openPreview(file.id, event.currentTarget)}>
              {isPdf(file) ? (
                <PdfThumbnail data={file.data} name={file.name} fileId={file.id} onPageCount={rememberPages} />
              ) : <span className="cp-file-item__document"><Icon name="file" size={36} />{documentIcon(file.name)}</span>}
            </button>
            <div className="cp-file-item__meta">
              <div className="cp-file-item__name" title={file.name}>{file.name}</div>
              <div className="cp-file-item__size">
                {pageCounts[file.id] ? `${pageCounts[file.id]} ${pageCounts[file.id] === 1 ? 'página' : 'páginas'} · ` : ''}{formatBytes(file.size)}
              </div>
            </div>
            <div className="cp-file-item__actions">
              <button type="button" className="cp-icon-btn" aria-label={`Visualizar ${file.name}`} title="Visualizar" onClick={(event) => openPreview(file.id, event.currentTarget)}><Icon name="preview" size={18} /></button>
              {multiple && <span className="cp-file-item__move">
                <button type="button" className="cp-icon-btn" aria-label={`Mover ${file.name} para cima`} title="Mover para cima" disabled={disabled || index === 0} onClick={() => reorderFileTo(file.id, index - 1)}><Icon name="arrow-left" size={17} /></button>
                <button type="button" className="cp-icon-btn" aria-label={`Mover ${file.name} para baixo`} title="Mover para baixo" disabled={disabled || index === files.length - 1} onClick={() => reorderFileTo(file.id, index + 1)}><Icon name="arrow-right" size={17} /></button>
              </span>}
              <button type="button" className="cp-icon-btn cp-icon-btn--danger" aria-label={`Remover ${file.name}`} title="Remover" disabled={disabled} onClick={() => removeFile(file.id)}><Icon name="trash" size={17} /></button>
            </div>
          </article>
        ))}
        <div className="cp-file-add-card">{dropzone}</div>
      </div>
      <div className="cp-files-summary"><Icon name="check" size={17} /><strong>{files.length} {files.length === 1 ? 'arquivo adicionado' : 'arquivos adicionados'}</strong><span>Pronto para configurar e processar.</span></div>
      </>}

      {previewFile && (
        <div className="cp-preview-dialog" role="dialog" aria-modal="true" aria-label={`Visualização de ${previewFile.name}`} onClick={closePreview}>
          <div className="cp-preview-dialog__content" onClick={(event) => event.stopPropagation()}>
            <div className="cp-preview-dialog__header"><div><strong>{previewFile.name}</strong><span>{formatBytes(previewFile.size)}</span></div><button ref={closeButtonRef} type="button" className="cp-icon-btn" aria-label="Fechar visualização" onClick={closePreview}>×</button></div>
            {isPdf(previewFile) ? (
              <PdfThumbnail data={previewFile.data} name={previewFile.name} />
            ) : (
              <div className="cp-pdf-thumbnail"><span className="cp-file-item__document"><Icon name="file" size={64} />{documentIcon(previewFile.name)}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function defaultId(): string { return crypto.randomUUID(); }
function readFileData(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(file); });
}
function documentIcon(name: string): string {
  if (!name.includes('.')) return 'ARQ';
  const extension = (name.split('.').pop() ?? '').toUpperCase();
  return extension.slice(0, 4) || 'ARQ';
}

function isPdf(file: Pick<FileInput, 'name' | 'mimeType'>): boolean {
  return file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
