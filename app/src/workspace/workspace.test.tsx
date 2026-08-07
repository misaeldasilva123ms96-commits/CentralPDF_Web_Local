import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFDocument } from 'pdf-lib';
import { useAppStore } from '../store/app-store';
import { App } from '../App';

beforeEach(() => {
  useAppStore.setState({
    tools: new Map(),
    activeToolId: null,
    favorites: [],
    files: [],
    parameters: {},
    currentStep: 'select',
    task: null
  });
});

async function openTool(name: string): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name }));
  return user;
}

async function addPdf(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  const doc = await PDFDocument.create();
  doc.setTitle('Contrato de teste');
  doc.addPage([300, 400]);
  const bytes = await doc.save();
  const pdf = new File([bytes.slice().buffer], 'contrato.pdf', { type: 'application/pdf' });
  await user.upload(input!, pdf);
}

describe('Workspace (fluxo da ferramenta)', () => {
  it('valida a ausência de arquivos e desabilita o botão de processar', async () => {
    await openTool('Juntar PDFs');
    expect(await screen.findByText(/Envie pelo menos 1 arquiv/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).toBeDisabled();
  });

  it('adicionar arquivo habilita o processamento e atualiza a validação', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user);
    expect(await screen.findByText('Pronto para processar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juntar PDFs' })).not.toBeDisabled();
  });

  it('executa a ferramenta real e apresenta o ResultCard com métricas e download', async () => {
    const user = await openTool('Juntar PDFs');
    await addPdf(user);
    await user.click(screen.getByRole('button', { name: 'Juntar PDFs' }));

    expect(await screen.findByText('Resultado concluído')).toBeInTheDocument();
    const download = screen.getByRole('link', { name: 'Baixar PDF_unido.pdf' });
    expect(download).toHaveAttribute('href', 'blob:mock');
    expect(screen.getByText('Páginas')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Arquivo original')).toBeInTheDocument();
  });

  it('permite cancelar durante a execução', async () => {
    const user = await openTool('OCR e PDF pesquisável');
    await addPdf(user);
    await user.click(screen.getByRole('button', { name: 'OCR e PDF pesquisável' }));
    const cancel = await screen.findByRole('button', { name: 'Cancelar' });
    await user.click(cancel);
    expect(await screen.findByText(/Cancelado/)).toBeInTheDocument();
    expect(screen.getByText('Configurar')).toBeInTheDocument();
  });
});