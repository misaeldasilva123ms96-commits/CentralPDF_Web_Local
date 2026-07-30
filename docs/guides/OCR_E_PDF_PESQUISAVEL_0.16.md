# OCR e PDF pesquisável — versão 0.16

## Objetivo

O módulo transforma digitalizações e imagens em documentos pesquisáveis. O reconhecimento ocorre no navegador com Tesseract.js; páginas PDF são renderizadas pelo PDF.js antes do OCR.

## Preparação recomendada

1. Extraia completamente o pacote.
2. Execute `PREPARAR_OFFLINE.bat` com internet disponível.
3. Aguarde o download dos motores e idiomas português/inglês.
4. Abra pelo `ABRIR_CENTRAL_PDF.bat`.

Sem preparação local, o aplicativo pode tentar carregar o motor OCR pela internet.

## Modos de resultado

- **PDF pesquisável:** mantém a aparência rasterizada das páginas reconhecidas e adiciona uma camada textual invisível.
- **PDF pesquisável + TXT:** entrega o PDF e o texto extraído.
- **Somente TXT:** reconhece e exporta o texto, sem gerar PDF.
- **Auditoria:** entrega PDF, TXT e relatório JSON detalhado.

Quando mais de um arquivo é produzido, os resultados são agrupados em ZIP.

## Reconhecimento automático

No modo automático, o aplicativo inspeciona a camada textual de cada página. Quando encontra texto suficiente e a opção de preservação está marcada, mantém a página original. Páginas sem texto recebem OCR.

Use **Forçar OCR** quando a camada existente estiver incorreta, incompleta ou tiver sido criada com reconhecimento ruim.

## Qualidade

- **150 DPI:** rápido, adequado para documentos nítidos e letras grandes.
- **200 DPI:** equilíbrio recomendado.
- **300 DPI:** melhor para texto pequeno, porém exige mais memória e tempo.

A melhoria visual inclui tons de cinza, contraste e limiar preto e branco. O limiar pode prejudicar documentos com fundos coloridos, carimbos ou fotografias.

## Revisão

O relatório informa confiança média e páginas abaixo do limite configurado. A revisão é obrigatória para nomes, valores, códigos, CNPJ, CPF, datas, documentos manuscritos e páginas desfocadas.

A detecção de padrões serve como apoio e não valida matematicamente CPF, CNPJ, datas ou valores.

## Privacidade

O aplicativo não possui rota própria de upload. Para documentos sigilosos, prepare o modo offline antes do uso e abra pelo servidor local. O texto reconhecido permanece na sessão do navegador e pode integrar Resultados e Fluxos da versão 0.15.

## Limites conhecidos

- OCR pode errar ou omitir caracteres.
- Manuscritos e tabelas complexas possuem precisão inferior.
- PDF pesquisável produzido por OCR rasteriza as páginas reconhecidas; links, formulários e assinaturas dessas páginas podem não ser preservados.
- Páginas digitais preservadas continuam com a estrutura original.
- Arquivos grandes podem consumir muita memória; processe intervalos menores quando necessário.
