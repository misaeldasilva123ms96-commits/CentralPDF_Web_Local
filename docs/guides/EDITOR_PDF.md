# Editor PDF

Guia da aplicação publicada, revisado em **21/10/2026**. [Documentação](../README.md) · [Guia do usuário](GUIA_DO_USUARIO_1.0.md)

## Abrir e conferir

1. Escolha **Editar PDF** e adicione um documento.
2. Use as miniaturas para navegar. O editor prepara as miniaturas conforme necessário, sem exigir a renderização completa para começar.
3. Escolha **Simples** para textos, imagens e anotações; use **Avançado** para recursos como texto original e carimbos.
4. Salve o trabalho em um projeto `.cpdf` se precisar continuar depois.

As alterações são exportadas para uma nova cópia; o arquivo original não é sobrescrito automaticamente. Modificações podem invalidar assinaturas digitais existentes.

## Adicionar texto

Escolha **Texto** e clique na página. A caixa inicial é compacta. A barra contextual oferece conteúdo, fonte, tamanho, cor, opacidade, negrito, itálico e alinhamento junto à área de trabalho. Não é necessário procurar esses ajustes na barra lateral direita.

Mova a caixa e ajuste suas alças. Para valores exatos, expanda **Posição, tamanho e camadas**. Os valores de geometria são pontos do PDF, não pixels da tela. Use **Concluir** para sair da seleção.

## Substituir texto original

No modo **Avançado**, escolha **Texto original** e selecione um trecho destacado. Confira a prévia enquanto digita e use **Aplicar substituição** ou `Ctrl+Enter`. O campo fecha após aplicação bem-sucedida; falhas mantêm a mensagem disponível para correção. `Esc` ou × descarta a prévia ainda não aplicada.

O editor reescreve operadores compatíveis, preservando a fonte quando possível. Se os novos caracteres não forem suportados, pode usar Helvetica naquele trecho, com aviso; caracteres também incompatíveis com essa alternativa são recusados. Não há recomposição automática de parágrafos.

Digitalizações, texto em Form XObjects e algumas codificações/fontes não permitem essa edição. OCR adiciona reconhecimento, sem tornar as letras da imagem visualmente editáveis. Consulte a [matriz de compatibilidade de texto original](../editor-native-text.md).

## Inserir e ajustar imagens

Use **＋ Imagem**. A inserção começa com tamanho compacto e proporção preservada.

- Arraste para posicionar; use as oito alças para redimensionar e a alça superior para girar.
- Para ações por botão, abra **Ações da imagem selecionada**, acima da página. A seção é recolhível, ocupa espaço no fluxo do documento e não fica suspensa sobre a imagem.
- **Duplicar** e **Excluir selecionado** funcionam por toque, sem teclado.
- Em **Posição, tamanho e camadas**, ajuste coordenadas, largura, altura, rotação, proporção, alinhamento na página e ordem das camadas.
- **Restaurar proporção original da imagem** corrige uma deformação de proporção.

Texto e desenho continuam usando suas barras contextuais. Imagens de assinatura são marcas visuais; não criam assinatura digital com certificado.

## Organizar e substituir páginas

Use as miniaturas para reordenar por arraste. Com o foco em uma miniatura, as setas navegam e `Alt+setas` reordena. As caixas de seleção permitem girar ou excluir páginas em lote; o documento precisa manter ao menos uma página.

**Substituir página** aceita uma página de outro PDF ou uma imagem PNG/JPEG. Escolha o arquivo e, no PDF, a página de origem; confira a prévia antes de confirmar. A confirmação substitui somente a posição selecionada. Fechar o diálogo não confirma a troca. **Desfazer/Refazer** permite revisar o resultado.

## Conferir e exportar

1. Use **Original e resultado** para comparar a origem com a página processada pelo exportador. No celular, as prévias ficam uma abaixo da outra.
2. Confira cortes, orientação, caracteres, posição de imagens e possíveis sobreposições.
3. Edite o **Nome do arquivo final**. Espaços e acentos são preservados; caracteres inválidos para arquivos são tratados.
4. Clique em **Salvar PDF editado** e revise o arquivo baixado em um leitor de PDF.

O cancelamento aguarda pontos seguros da operação. Não feche a aba ou o servidor antes de concluir o download. Em PDFs abertos por compatibilidade raster, a página-base pode ser achatada e a edição de texto original fica indisponível.

## Atalhos e limites

| Atalho | Ação |
| --- | --- |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |
| `Ctrl+D` | Duplicar objeto selecionado |
| `Delete` | Excluir objeto selecionado |
| Setas / `Shift+setas` | Mover objeto em passos de 1 / 10 pontos |
| `Alt+setas` com objeto selecionado | Girar objeto |
| `Esc` | Sair da seleção ou fechar a edição corrente, conforme o foco |

Atalhos de objeto não atuam durante a digitação em campos. As ações por toque continuam disponíveis na interface. Cobrir visualmente uma área não remove necessariamente o conteúdo interno: para remoção confidencial, use **Censura definitiva** e valide a saída. Veja [Limitações conhecidas](../reference/LIMITACOES_CONHECIDAS_1.0.md).
