# Roteiro de testes — OCR 0.16

## Preparação

- Use cópias de documentos sem dados sensíveis.
- Execute `PREPARAR_OFFLINE.bat`.
- Confirme no topo: `Web local 0.16`.

## Cenário 1 — imagem para TXT

1. Abra **OCR pesquisável**.
2. Adicione uma imagem nítida com texto em português.
3. Escolha **Somente texto TXT** e 200 DPI.
4. Execute e confira o texto.

Esperado: TXT baixado, relatório de confiança disponível e ausência de envio externo pelo aplicativo.

## Cenário 2 — PDF escaneado pesquisável

1. Adicione um PDF escaneado de duas ou três páginas.
2. Escolha **PDF pesquisável**.
3. Mantenha português, modo automático e 200 DPI.
4. Execute, abra o resultado e pesquise uma palavra conhecida.

Esperado: texto localizável e aparência semelhante à digitalização.

## Cenário 3 — PDF misto

Use um PDF com uma página digital e outra escaneada. Mantenha **Preservar páginas que já possuem texto**.

Esperado: página digital preservada e OCR aplicado somente na digitalização.

## Cenário 4 — páginas selecionadas

Informe `1-2,5`. Confirme que as demais páginas permanecem no PDF sem OCR e que o relatório lista somente as processadas.

## Cenário 5 — lote

Adicione dois PDFs e uma imagem. Escolha PDF + TXT.

Esperado: ZIP com resultados identificados por arquivo e `RESUMO_OCR.txt`.

## Cenário 6 — qualidade baixa

Use uma foto inclinada ou pouco nítida. Ative rotação automática, contraste e 300 DPI.

Esperado: página sinalizada para revisão quando ficar abaixo da confiança configurada.

## Cenário 7 — cancelamento

Inicie um documento com várias páginas e solicite cancelamento pela Central de Processamento.

Esperado: operação interrompida entre páginas e nenhum resultado parcial apresentado como concluído.
