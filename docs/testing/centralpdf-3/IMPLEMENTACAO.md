# Central PDF 3.0 — implementação em revisão

Base: `1dc49d820a719f065ddd6ce807eedeb1e77c0c45` (PR #79).
Referência: prompt mestre do ZIP fornecido pelo responsável e documentos de `docs/proposals/centralpdf-3-redesign/`.

**Entrega em rascunho. Sem merge, publicação, release, deploy ou alteração de banco.**
O número 3.0 identifica o sistema visual; as versões técnicas permanecem 2.0.1 (site/React) e 0.3.0 (Admin).

## Checkpoints e superfícies

| Etapa | Alteração | Contrato preservado |
| --- | --- | --- |
| 0 | Inventário 34 módulos / 39 atalhos, capturas antes, exportações sintéticas de referência | Base #79, callbacks, parâmetros e handlers |
| 1 | `design-3.css`, SVG local, hero, cartões, navegação e configurações; tema no topo | IDs, eventos, preferência de tema e oito ações reais |
| 2 | Juntar, Dividir e Organizar usam a camada visual e os motores existentes | Capas completas, seis modos de divisão, edição e exportação |
| 3 | Camada comum em todos os workspaces, editor, diálogos, projetos, resultados e mensagens | Geometria dos documentos/canvases e lógica de execução intactas |
| 4 | Admin: estilos comuns, marca e alternância de tema em acesso e páginas privadas | Auth/PKCE/MFA, rotas, API, RLS e storage independente |
| 5 | React parcial: identidade e tema próprio nos componentes existentes | Catálogo parcial, ferramentas experimentais/planejadas e bundle separado |

CSS novo é carregado por último e escopado no site por `data-design="3"`. Não há cópia do HTML demonstrativo nem troca pela migração React. Ícones das ferramentas continuam vindo do sprite real. Novos assets não dependem de rede externa. A revisão de cache do site passa para `pages-50`.

## Linha de base e falhas de preparação

- Capturas em `evidence/before/` foram realizadas antes de editar a apresentação.
- A primeira tentativa dos 34 módulos parou porque o checkout não estava preparado para uso offline. Foi repetida sobre um snapshot estático do SHA de base, com os motores fixados e hashes verificados conforme `prepare-offline.ps1`.
- A primeira tentativa do Admin encontrou build local antigo (`pages-48`), incompatível com a referência do código (`pages-49`). Um build local da base corrigiu o ambiente. Nenhum deploy foi executado.
- Durante a implementação foram corrigidas a navegação móvel herdada com posição fixa e a interceptação do tema global pelo backdrop de Configurações.
- O novo teste dos três exemplos inicialmente não carregava JSZip no harness de teste; isso foi corrigido no harness, preservando a execução real.

## Evidências e verificação

Os JSON em `evidence/` registram resultados realmente executados, sem documentos privados. Os PDFs, imagens e nomes de teste são sintéticos. Hashes individuais não significam igualdade byte a byte entre execuções: metadados temporais podem variar.

Resultados finais e comandos serão registrados ao completar as suítes. Ausência de um resultado não significa aprovação.

## Limites de validação e revisão pendente

- Capturas e automação não substituem avaliação manual com leitor de tela, toque em aparelho físico e zoom do navegador em 200%.
- SQL/RLS remoto, autenticação pessoal e entrega real de e-mail não são executados; o painel é testado com fixtures locais.
- Motores Office/OCR mantêm suas limitações anteriores. Não se promete fidelidade irrestrita.
- Nenhuma atualização deve ser integrada enquanto houver checks falhando ou telas/ações sem revisão.

## Rollback

Reverter cada commit de apresentação e seu ajuste de cache/URLs como unidade; não apagar localStorage/IndexedDB, projetos, dados ou migrations. Admin e React têm seus próprios estilos e SVGs; podem ser revertidos independentemente. Não há transformação de dados ou credenciais.
