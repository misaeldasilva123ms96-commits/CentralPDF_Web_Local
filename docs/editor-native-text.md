# Texto original no editor Avançado

1. Abra um PDF em **Editar PDF** e escolha **Avançado**.
2. Clique em **Texto original** na barra. A página destaca os trechos editáveis: clique diretamente no texto para abrir seus controles. O painel também lista os trechos; use a busca para localizar um nome, valor ou descrição.
3. Escolha um trecho, altere o conteúdo e clique em **Aplicar substituição**. Confira se o texto cabe no espaço disponível.
4. Use **Restaurar trecho**, **Desfazer** ou **Refazer** quando necessário. Finalize em **Salvar PDF editado**.

A substituição reescreve os operadores de texto da página. Mantém a fonte, o tamanho, a cor e o ponto inicial, compensando a largura para preservar a posição dos operadores seguintes. Não usa um retângulo para esconder o texto. A prévia e as miniaturas renderizam o conteúdo reescrito. As mudanças fazem parte do histórico e do projeto salvo; páginas duplicadas podem ser alteradas independentemente.

## Compatibilidade

- Textos horizontais em operadores `Tj`, `TJ`, `'` e `"`, com fontes simples ou CID `Identity-H`, após conferir os códigos dos caracteres com o PDF.js.
- Fontes padrão com codificação reconhecida permitem os caracteres de sua codificação. Fontes incorporadas permitem os caracteres identificados na página e aqueles declarados no mapa Unicode da fonte com larguras explícitas compatíveis; caracteres ausentes são rejeitados antes da alteração.
- A edição funciona por trecho, sem recomposição automática de parágrafos. Um PDF pode dividir uma frase em vários trechos.
- Digitalizações sem camada de texto precisam de OCR. Form XObjects com texto, fontes verticais/Type3, imagens inline, máscaras de texto e determinadas estruturas ou codificações são recusadas explicitamente. PDFs abertos no modo de compatibilidade raster não permitem esta operação.
- Esta é uma ferramenta de edição, não de sanitização confidencial: metadados, anotações, campos e outros conteúdos do documento não são removidos por ela.

O Avançado também oferece carimbos **Conferido**, **Revisado**, **Rascunho** e **Aprovado** como objetos de texto ajustáveis. Eles podem ser movidos, girados, duplicados e formatados nos controles existentes.

## Validação

`tests/editor-native-text.test.py` usa PDF.js e pdf-lib reais no Chromium para verificar texto exportado, posições vizinhas, exclusão com espaçamento, histórico, páginas duplicadas, caracteres incompatíveis, restauração, carimbos, rotação e layout responsivo.
