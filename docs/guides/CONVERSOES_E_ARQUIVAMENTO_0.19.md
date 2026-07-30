# Conversões e arquivamento — versão 0.19

## PDF para Office

### Word DOCX

- Texto editável simplificado: prioriza edição.
- Aparência como imagem: prioriza fidelidade visual.
- Híbrido: inclui imagem da página e o texto extraído em seguida.

### Excel XLSX

O texto do PDF é agrupado por posição horizontal e vertical. O resultado pode ser criado em uma planilha por página ou em uma planilha por documento. Tabelas sem linhas claras podem exigir ajustes manuais.

### PowerPoint PPTX

Cada página vira um slide no formato widescreen. A aparência é preservada como imagem; o texto extraído é incluído nas notas do slide quando disponível.

## Documentos para PDF

DOCX, XLSX e PPTX são lidos como pacotes OOXML. A ferramenta extrai o texto e gera um PDF novo. Não executa macros e não preserva necessariamente gráficos, fórmulas, caixas flutuantes ou paginação original.

HTML, TXT, CSV e Markdown são convertidos em texto paginado. Imagens comuns, HEIC e TIFF podem ser colocadas em páginas ajustadas ou A4.

## Extrair imagens do PDF

- Imagens internas: tenta recuperar recursos rasterizados armazenados no PDF.
- Páginas completas: renderiza a aparência completa.
- Ambas: inclui os dois tipos.

O manifesto JSON informa arquivo, página, dimensões e nome de saída.

## Preparar para arquivamento

- Normalizar: regrava a estrutura preservando texto e links quando possível.
- Rasterizar: reconstrói visualmente as páginas e remove recursos interativos.
- Manifesto: registra tamanhos, hashes e sinais encontrados no arquivo.

O resultado não recebe certificação PDF/A. Para processos que exigem conformidade normativa, valide o arquivo em uma ferramenta certificadora independente.
