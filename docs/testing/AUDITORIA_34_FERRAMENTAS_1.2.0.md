# Auditoria das 34 ferramentas — Central PDF & Imagem 1.2.0

## Resumo executivo

- 34 ferramentas presentes no catálogo, na página inicial e na barra lateral.
- 34 processadores registrados e expostos ao módulo de auditoria.
- Todas possuem entrada, saída, painel de ajustes e orientação de revisão mapeados.
- Foi adicionada pré-verificação comum, validação de arquivos vazios, alertas de memória, verificação de assinatura de saída e histórico local por ferramenta.
- O painel **Qualidade** passou a exibir a matriz individual das ferramentas, com busca, filtros e exportação JSON.

## Dimensões verificadas

1. Registro no catálogo e presença visual.
2. Atalho na barra lateral e processador associado.
3. Regras de entrada, quantidade de arquivos e motor necessário.
4. Formato de saída e verificação básica de assinatura do arquivo.
5. Profundidade funcional, processamento em lote e orientação de revisão.
6. Instrumentação local: duração, sucessos, falhas, avisos e tamanho da saída.

## Matriz das ferramentas

| # | Ferramenta | Categoria | Entrada | Saída | Motor | Profundidade | Auditoria estática |
|---:|---|---|---|---|---|---|---|
| 1 | Organizar PDF | Páginas | PDF | PDF | pdf-lib | Avançada | Aprovada |
| 2 | Editar PDF | Edição | PDF | PDF | pdf-lib + PDF.js | Avançada | Aprovada |
| 3 | Juntar PDFs | Páginas | 2+ PDFs | PDF | pdf-lib | Avançada | Aprovada |
| 4 | Dividir PDF | Páginas | PDF | ZIP/PDF | pdf-lib | Avançada | Aprovada |
| 5 | Extrair páginas | Páginas | PDF | PDF | pdf-lib | Intermediária | Aprovada |
| 6 | Girar páginas | Páginas | PDFs | PDF/ZIP | pdf-lib | Intermediária | Aprovada |
| 7 | Marca-d’água | Edição | PDFs | PDF/ZIP | pdf-lib | Avançada | Aprovada |
| 8 | Numerar páginas | Edição | PDFs | PDF/ZIP | pdf-lib | Avançada | Aprovada |
| 9 | Imagens para PDF | Conversão | Imagens | PDF | pdf-lib | Avançada | Aprovada |
| 10 | Converter imagens | Imagem | Imagens | Imagem/ZIP | Canvas + ZIP | Intermediária | Aprovada |
| 11 | Comprimir PDF | Otimização | PDFs | PDF/ZIP | pdf-lib + PDF.js | Avançada | Aprovada |
| 12 | PDF para JPG/PNG | Conversão | PDFs | Imagem/ZIP | PDF.js + ZIP | Avançada | Aprovada |
| 13 | Recortar PDF | Páginas | PDFs | PDF/ZIP | pdf-lib | Intermediária | Aprovada |
| 14 | Limpar metadados | Segurança | PDFs | PDF/ZIP | pdf-lib | Intermediária | Aprovada |
| 15 | Normalizar PDF | Otimização | PDFs | PDF/ZIP | pdf-lib | Intermediária | Aprovada |
| 16 | Extrair texto | Conversão | PDFs | TXT/ZIP | PDF.js | Avançada | Aprovada |
| 17 | OCR e PDF pesquisável | OCR | PDF/Imagem | PDF/TXT/ZIP | PDF.js + Tesseract | Profunda | Aprovada |
| 18 | PDF para Office | Conversão | PDFs | DOCX/XLSX/PPTX/ZIP | PDF.js + geradores Office | Profunda | Aprovada |
| 19 | Documentos para PDF | Conversão | Office/Imagem/TXT | PDF/ZIP | Parsers locais + pdf-lib | Profunda | Aprovada |
| 20 | Extrair imagens | Imagem | PDFs | Imagem/ZIP | PDF.js + ZIP | Avançada | Aprovada |
| 21 | Preparar para arquivamento | Arquivamento | PDFs | PDF/ZIP | pdf-lib + PDF.js | Avançada | Aprovada |
| 22 | Assistente documental | Inteligência | PDFs | HTML/JSON/ZIP | PDF.js + regras locais | Profunda | Aprovada |
| 23 | Extração estruturada | Inteligência | PDFs | CSV/JSON/ZIP | PDF.js + regras locais | Profunda | Aprovada |
| 24 | Auditoria documental | Inteligência | PDFs | HTML/CSV/JSON/ZIP | PDF.js + regras locais | Profunda | Aprovada |
| 25 | Classificar e renomear | Inteligência | PDFs | ZIP/CSV/JSON | PDF.js + regras locais | Profunda | Aprovada |
| 26 | Comparar PDFs | Auditoria | 2 PDFs | HTML/JSON/ZIP | PDF.js + Canvas | Profunda | Aprovada |
| 27 | Censura definitiva | Segurança | PDF | PDF/JSON | PDF.js + pdf-lib | Profunda | Aprovada |
| 28 | Criar formulário | Formulários | PDF | PDF | pdf-lib | Profunda | Aprovada |
| 29 | Assinar e rubricar | Assinatura visual | PDF | PDF | pdf-lib + Canvas | Avançada | Aprovada |
| 30 | Proteger PDF | Segurança | PDFs | PDF/ZIP | LibPDF | Profunda | Aprovada |
| 31 | Remover senha | Segurança | PDFs protegidos | PDF/ZIP | LibPDF | Avançada | Aprovada |
| 32 | Diagnosticar PDF | Diagnóstico | PDFs | TXT/JSON/ZIP | LibPDF | Profunda | Aprovada |
| 33 | Recuperar PDF | Recuperação | PDFs | PDF/ZIP | LibPDF | Profunda | Aprovada |
| 34 | Fixar formulários | Formulários | PDFs | PDF/ZIP | LibPDF | Avançada | Aprovada |

## Melhorias transversais aplicadas

- **Pré-verificação por ferramenta:** informa entrada, saída, motor, lote, recursos avançados e revisão recomendada.
- **Proteção de entrada:** arquivos com zero bytes são ignorados; lotes acima de 600 MB por arquivo ou 1,2 GB no total recebem alerta.
- **Validação de saída:** PDF, ZIP/Office, PNG, JPEG, WebP e JSON recebem checagem básica de integridade.
- **Histórico local:** cada ferramenta registra execuções, duração média, sucessos, falhas, avisos e saídas.
- **Diagnóstico integrado:** a auditoria completa passa a fazer parte do relatório baixado pelo item Qualidade.
- **Erros aprofundados:** Worker, buffer desanexado e falta de memória recebem mensagens com orientação prática.

## Testes executados

- Integridade estática dos 34 cards, 34 atalhos e 34 módulos.
- Carregamento do `app.js` em ambiente isolado.
- Planejadores, editor, compressão, OCR, conversões, formulários, assinaturas, inteligência documental e ferramentas profissionais.
- Qualidade, logs, tema escuro, modais, layout e regressões do Worker/buffers PDF.

## Limite da auditoria

A auditoria estrutural e os testes automatizados não substituem uma bateria de arquivos reais de diferentes origens. OCR, Office, PDFs criptografados, PDFs corrompidos, formulários e assinaturas devem continuar sendo validados com amostras reais no computador do usuário. O novo histórico local foi criado para acumular essas evidências durante o uso.
