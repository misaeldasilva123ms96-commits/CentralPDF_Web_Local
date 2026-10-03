# Texto original no editor Avançado

1. Abra um PDF em **Editar PDF** e escolha **Avançado**.
2. Clique em **Texto original** na barra. A página destaca os trechos editáveis: clique diretamente no texto para abrir o campo sobre o trecho selecionado. O painel também lista os trechos; use a busca para localizar um nome, valor ou descrição.
3. Escolha um trecho, altere o conteúdo e clique em **Aplicar substituição** (ou Ctrl+Enter). A página mostra uma prévia enquanto você digita, usando a mesma política de fontes do arquivo exportado. A prévia só é confirmada ao aplicar; fechar o campo ou escolher outro trecho descarta a digitação não aplicada. Após aplicar com sucesso, o campo fecha automaticamente e devolve o foco ao trecho na página para continuar a edição pelo teclado. Em caso de erro, continua aberto com o aviso. Esc ou × fecha o campo para conferir a página. Confira se o texto cabe no espaço disponível.
4. Use **Restaurar trecho**, **Desfazer** ou **Refazer** quando necessário. Finalize em **Salvar PDF editado**.

**Original e resultado** mostra a página de origem ao lado da página processada pelo mesmo exportador de Salvar, incluindo textos adicionados, imagens, recorte e rotação. A lista abaixo destaca as substituições de texto original. No celular, as duas páginas ficam uma abaixo da outra. A conferência não altera o histórico nem baixa arquivos. Textos maiores não são reorganizados automaticamente: confira possíveis sobreposições.

A substituição reescreve os operadores de texto da página. Mantém a fonte quando ela permite os caracteres digitados, o tamanho, a cor e o ponto inicial, compensando a largura para preservar a posição dos operadores seguintes. Não usa um retângulo para esconder o texto. A prévia e as miniaturas renderizam o conteúdo reescrito. As mudanças fazem parte do histórico e do projeto salvo; páginas duplicadas podem ser alteradas independentemente.

## Compatibilidade

- Textos horizontais em operadores `Tj`, `TJ`, `'` e `"`, com fontes simples ou CID `Identity-H`, após conferir os códigos dos caracteres com o PDF.js.
- Fontes padrão com codificação reconhecida permitem os caracteres de sua codificação. Fontes incorporadas permitem os caracteres identificados na página e aqueles declarados no mapa Unicode da fonte com larguras explícitas compatíveis. Quando o mapa original não permite os novos caracteres, somente o trecho substituído usa Helvetica; o editor informa a mudança. Caracteres também ausentes em Helvetica continuam rejeitados antes da alteração. A fonte e a posição dos textos seguintes são preservadas.
- A edição funciona por trecho, sem recomposição automática de parágrafos. Um PDF pode dividir uma frase em vários trechos.
- Conteúdo marcado (`BDC`/`EMC`) com dicionários de metadados, como identificadores de acessibilidade, é aceito. Páginas com `ActualText` ainda são recusadas com uma mensagem específica, pois esse texto alternativo também precisaria ser atualizado.
- Digitalizações não permitem editar as letras da imagem por esta ferramenta; OCR pode criar uma camada pesquisável, mas não transforma automaticamente essas letras em texto visual editável. Form XObjects com texto, fontes verticais/Type3, imagens inline, máscaras de texto e determinadas estruturas ou codificações são recusadas explicitamente. PDFs abertos no modo de compatibilidade raster não permitem esta operação.
- Esta é uma ferramenta de edição, não de sanitização confidencial: metadados, anotações, campos e outros conteúdos do documento não são removidos por ela.

O Avançado também oferece carimbos **Conferido**, **Revisado**, **Rascunho** e **Aprovado** como objetos de texto ajustáveis. Eles podem ser movidos, girados, duplicados e formatados nos controles existentes.

## Validação

`tests/editor-native-text.test.py` usa PDF.js e pdf-lib reais no Chromium para verificar texto exportado, posições vizinhas, exclusão com espaçamento, histórico, páginas duplicadas, caracteres incompatíveis, restauração, carimbos, rotação e layout responsivo.
