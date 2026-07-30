# Roteiro de testes — Central PDF 0.14

## 1. Abertura e diagnóstico

1. Extraia o ZIP em uma nova pasta.
2. Execute `ABRIR_CENTRAL_PDF.bat`.
3. Confirme no cabeçalho: `Web local 0.14.0`.
4. Abra **Sistema**.
5. Confirme que o protocolo começa com `http:` e que o ambiente é reconhecido como servidor local.

## 2. Preparação offline

1. Feche o Central PDF.
2. Execute `PREPARAR_OFFLINE.bat` com internet disponível.
3. Confirme a criação de `pdf-lib.min.js`, `pdf.min.js`, `pdf.worker.min.js` e `libpdf-core.mjs` dentro de `vendor`.
4. Desconecte a internet, abra novamente por `ABRIR_CENTRAL_PDF.bat` e teste Organizar ou Juntar com cópias pequenas.

## 3. Central de processamento

1. Adicione dois PDFs pequenos em **Juntar PDFs**.
2. Clique em **Juntar PDFs**.
3. Abra **Processos** e confira ferramenta, progresso, horário e resultado.
4. Em uma tarefa longa, pressione **Cancelar tarefa ativa** e confirme que o cancelamento é solicitado.

## 4. Projeto manual

1. Abra Organizar, Juntar ou Editar PDF.
2. Faça alterações visíveis.
3. Abra **Projetos → Salvar projeto atual**.
4. Confirme o download `.cpdf`.
5. Reinicie a tarefa.
6. Abra o arquivo `.cpdf` em **Projetos → Escolher projeto**.
7. Confirme arquivos, páginas, ordem e ajustes.

## 5. Recuperação automática

1. Mantenha a opção ativa.
2. Faça alterações em um trabalho inferior a 80 MB.
3. Aguarde cinco segundos.
4. Recarregue a página.
5. Confirme o aviso de trabalho recuperável e restaure.

## 6. Regressão

Teste pelo menos:

- arrastar novos arquivos depois da primeira seleção;
- organização da união por documento e por página;
- união de lote grande;
- editor com texto, imagem, redimensionamento e rotação;
- dividir por intervalos;
- compressão e PDF para imagem;
- barra lateral recolhível e modo foco.
