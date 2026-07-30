# Roteiro de teste - Central PDF Web Local 0.8

Use copias de PDFs pequenos. Nao substitua os arquivos originais durante os testes.

## 1. Juntar PDFs
- Adicione tres PDFs.
- Escolha "intervalos por arquivo".
- Informe `all;1-2;2,4`.
- Teste pagina em branco e pagina com nome entre documentos.
- Teste normalizacao A4.

## 2. Extrair ou remover paginas
Com um PDF de pelo menos 8 paginas:
- Extraia `5,1-3` para confirmar a ordem.
- Gere grupos `1-2;3-5;6,8`.
- Remova `2,4-5`.
- Gere pares e impares.

## 3. Girar paginas
- Gire apenas paginas pares.
- Gire apenas paginas em paisagem.
- Compare rotacao relativa e absoluta.
- Use 0 graus para remover a rotacao declarada.

## 4. Marca-d'agua
- Teste texto central e repetido.
- Altere cor, opacidade e rotacao.
- Teste um logotipo PNG.
- Aplique somente nas paginas impares.

## 5. Numeracao
- Ignore as duas primeiras paginas.
- Inicie em 1.
- Use `Folha {n} / {total}`.
- Teste rodape externo alternado.
- Teste fundo branco.

## 6. Imagens para PDF
- Crie um unico PDF com tres imagens.
- Teste A4, Carta e tamanho personalizado.
- Compare conter, preencher e esticar.
- Gere um PDF por imagem.

## 7. Compressao
- Compare estrutural, recomendada, extrema e personalizada.
- Na personalizada, use 150 DPI, 70% e tons de cinza.
- Rasterize apenas paginas `1-2`.
- Confira o relatorio antes/depois.

## 8. PDF para imagens
- Gere JPG, PNG e WEBP.
- Teste primeira pagina, pares e paginas informadas.
- Gere folha de contato com tres colunas.
- Teste tons de cinza.

## 9. Recortar PDF
- Remova 10 mm das bordas.
- Remova apenas o cabecalho de 25 mm.
- Teste percentual.
- Teste area central.
- Compare recorte visual e reconstruir pagina.

## Verificacao final
- Abra cada resultado em um leitor de PDF diferente.
- Confirme quantidade, ordem, orientacao e aparencia das paginas.
- Confirme que o original nao foi alterado.
