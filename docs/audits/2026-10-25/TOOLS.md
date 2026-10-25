# Matriz funcional — 34 ferramentas

Execução com motores reais preparados, Chromium no Linux e documentos sintéticos. Uma configuração válida por ferramenta; não é certificação de todos os modos ou de documentos arbitrários. Tempo é a duração de `processCurrentTool`, sem incluir ingestão e preparação do navegador. Saídas são validadas e recebem SHA-256, sem dados reais de usuários.

| Ferramenta | Motor | Entrada | Esperado | Obtido / validação | Tempo (ms) | Erros / estado |
| --- | --- | --- | --- | --- | --- | --- |
| Organizar PDF | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 61.1 | Nenhum / aprovado |
| Editar PDF | pdf-lib + PDF.js | pdf | Saída PDF válida | 3 pág.; texto lido | 141.9 | Nenhum / aprovado |
| Juntar PDFs | pdf-lib | pdf, pdf | 5 páginas (3+2), preservando documentos completos | 5 pág.; texto lido | 13.5 | Nenhum / aprovado |
| Dividir PDF | pdf-lib | pdf | Saída ZIP válida | ZIP reaberto; 3 entradas | 10.3 | Nenhum / aprovado |
| Extrair ou remover páginas | pdf-lib | pdf | 2 páginas selecionadas (1,3) | 2 pág.; texto lido | 13.5 | Nenhum / aprovado |
| Girar páginas | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 9.5 | Nenhum / aprovado |
| Marca-d’água avançada | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 23.1 | Nenhum / aprovado |
| Numerar páginas avançado | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 16.3 | Nenhum / aprovado |
| Imagens para PDF avançado | pdf-lib | png | Saída PDF válida | 1 pág.; texto lido | 85 | Nenhum / aprovado |
| Converter imagens | Canvas + ZIP | png | Saída JPG válida | 1200×600 | 49.2 | Nenhum / aprovado |
| Comprimir PDF avançado | pdf-lib + PDF.js | pdf | PDF escaneado menor, dentro de ZIP válido | ZIP reaberto; 2 entradas | 496.1 | Nenhum / aprovado |
| PDF para imagens avançado | PDF.js + ZIP | pdf | Saída ZIP válida | ZIP reaberto; 3 entradas | 169.6 | Nenhum / aprovado |
| Recortar PDF avançado | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 8.5 | Nenhum / aprovado |
| Limpar metadados | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 12.5 | Nenhum / aprovado |
| Normalizar PDF | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 10.7 | Nenhum / aprovado |
| Extrair texto do PDF | PDF.js | pdf | Saída TXT válida | texto lido | 138.3 | Nenhum / aprovado |
| OCR e PDF pesquisável | PDF.js + Tesseract | png | Saída PDF válida | 1 pág.; texto lido; OCR reconheceu CONTRATO e 1250 | 912.6 | Nenhum / aprovado |
| Comparar PDFs | PDF.js + Canvas | pdf, pdf | Saída ZIP válida | ZIP reaberto; 13 entradas | 425.3 | Nenhum / aprovado |
| Censura definitiva | PDF.js + pdf-lib | pdf | PDF reconstruído, texto de origem ausente | 3 pág.; texto lido | 64.6 | Nenhum / aprovado |
| Criar formulário preenchível | pdf-lib | pdf | Saída PDF válida | 3 pág.; texto lido | 24.7 | Nenhum / aprovado |
| Assinar e rubricar PDF | pdf-lib + Canvas | pdf | Saída PDF válida | 3 pág.; texto lido | 83.3 | Nenhum / aprovado |
| PDF para Office | PDF.js + geradores Office | pdf | Saída DOCX válida | ZIP reaberto; 11 entradas | 119.8 | Nenhum / aprovado |
| Documentos para PDF | Parsers locais + pdf-lib | vnd.openxmlformats-officedocument.wordprocessingml.document | Saída PDF válida | 1 pág.; texto lido | 11.3 | Nenhum / aprovado |
| Extrair imagens do PDF | PDF.js + ZIP | pdf | Saída ZIP válida | ZIP reaberto; 3 entradas | 119.4 | Nenhum / aprovado |
| Preparar para arquivamento | pdf-lib + PDF.js | pdf | Saída ZIP válida | ZIP reaberto; 3 entradas | 21 | Nenhum / aprovado |
| Assistente documental | PDF.js + regras locais | pdf | Saída ZIP válida | ZIP reaberto; 4 entradas | 116.8 | Nenhum / aprovado |
| Extração estruturada | PDF.js + regras locais | pdf | Saída ZIP válida | ZIP reaberto; 4 entradas | 18 | Nenhum / aprovado |
| Auditoria documental | PDF.js + regras locais | pdf | Saída ZIP válida | ZIP reaberto; 4 entradas | 49.7 | Nenhum / aprovado |
| Classificar e renomear | PDF.js + regras locais | pdf | Saída ZIP válida | ZIP reaberto; 6 entradas | 107.6 | Nenhum / aprovado |
| Proteger PDF | LibPDF | pdf | Saída PDF válida | 3 pág.; criptografia e senha conferidas | 137.6 | Nenhum / aprovado |
| Remover senha | LibPDF | pdf | Saída PDF válida | 3 pág.; texto lido | 54.5 | Nenhum / aprovado |
| Diagnosticar PDF | LibPDF | pdf | Saída ZIP válida | ZIP reaberto; 2 entradas | 31.5 | Nenhum / aprovado |
| Recuperar PDF | LibPDF | pdf | Saída PDF válida | 3 pág.; texto lido | 9.6 | Nenhum / aprovado |
| Fixar formulários | LibPDF | pdf | PDF sem campos editáveis | 1 pág.; texto lido | 11.6 | Nenhum / aprovado |

## Reprodutibilidade e escopo

- [JSON integral](tool-matrix.json): nomes sintéticos, tamanhos, metadados, texto de teste e hashes das saídas.
- [Harness](../../../tests/tool-regression-real.py): chama as APIs reais de entrada/processamento e lê PDFs com PDF.js/pdf-lib, ZIP/Office com JSZip e imagens com decodificação do navegador. Não substitui os motores. A interceptação de `anchor.click` apenas evita salvar dezenas de arquivos no runner; os Blobs gerados continuam sendo lidos e validados.
- OCR real em português gerou camada pesquisável. Caso adicional com rotação PDF 90° e correção manual 270°: [evidência](rotated-ocr.json). Isso não comprova correção automática de toda orientação ou reconhecimento perfeito de acentos.
- A rodada exploratória teve duas recusas esperadas: extração sem intervalo e remoção com senha de usuário sem permissão de proprietário. O teste válido informa as páginas e a senha administrativa criada no próprio caso; a proteção não foi contornada.
- Os testes especializados complementares cobrem CID/fontes, edição nativa, exportação, histórico, seleção por capas, substituição de páginas, entradas vazias/inválidas, formulários e criptografia. Testes antigos com mocks são tratados como unidade/contrato, não como evidência da execução dos motores.
- Arquivo com assinatura CMS sintética: teste de detecção/aviso, integridade local e hash do original preservado; sem validação de cadeia ICP-Brasil.
- Limites: configuração e corpus sintéticos finitos; sem Windows físico, WebKit funcional, leitor de tela ou documentos privados.

Casos adicionais do harness: compressão preserva texto e um caminho vetorial nativos; quando o caso estabiliza sem redução, os bytes são mantidos. O JSON registra os tamanhos de cada tentativa. OCR em PDF girado é validado com correção manual explícita.
