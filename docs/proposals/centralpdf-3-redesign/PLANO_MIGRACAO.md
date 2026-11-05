# Plano de atualização visual — Central PDF 3.0

**Situação:** proposta de interface e plano de implantação, **sem aplicação do redesign ao produto**.  
**Referência funcional:** `main` em `f7e1986c8ea8746c201ce8af46fab5ccc7e4591e` (05/11/2026).  
**Origem visual aprovada:** [protótipo HTML](./prototipo-centralpdf-3.html).  
**Evidências e testes:** [matriz de paridade](./MATRIZ_PARIDADE_E_TESTES.md) e [exemplos de fluxos](./EXEMPLOS_TELAS.md).

## 1. Objetivo e restrições

Modernizar **todas as telas** do Central PDF usando a mesma linguagem da Home e dos workspaces prototipados (cores e degradês, bordas por ferramenta, ícones vetoriais coloridos, tipografia, logo Central PDF, painel de configurações e tema claro/escuro), sem perder **nenhuma função já existente**.

Regras inegociáveis:
- Não trocar a aplicação da raiz por `app/`, nem substituir `index.html` pelo protótipo. A aplicação entregue no site e no Windows é `index.html`, `assets/`, `vendor/`; `app/` é uma migração React parcial e separada.
- Não apagar nem reimplementar motores de PDF, importação, processamento, workers, cache, projetos, resultados, fluxo de tarefas, editor, atalhos ou telemetria por motivos puramente visuais.
- A mudança deve ser progressiva, isolada e reversível, com pequenas PRs e **sem merge automático**. A `main`, GitHub Pages, releases e executável não são alterados nesta proposta.
- O protótipo isolado é uma **referência de UX, não um produto funcional**. Contém telas de exemplo para Juntar, Dividir e Organizar e pode conter comandos/estados demonstrativos; ele **não** substitui a execução real no aplicativo.
- Dados de arquivos continuam no dispositivo, respeitando a política atual de telemetria/consentimento, permissões e limites. Não subir PDFs de usuários, diagnósticos brutos ou nomes reais em evidências.

## 2. Mapa da aplicação real

| Superfície | Responsabilidade | Proteção durante a mudança |
| --- | --- | --- |
| `index.html` | DOM da aplicação publicada, entradas, painéis, cartões e menus | Preservar IDs, `data-tool`, eventos, ARIA e ordem de carga |
| `assets/css/` | CSS histórico e tema | Introduzir tokens/tela 3.0 **escopados**, com precedência auditada e fallback |
| `assets/js/app.js` | `toolConfig`, workspace, processamento e exportação | Manter a fonte de verdade funcional, sem trocar por código mockado |
| `assets/js/product-redesign-2.0.js` | Cartões, navegação e ações da interface publicada | Integrar novos estilos sem duplicar eventos |
| `assets/js/header-settings-1.0.3.js` e componentes relacionados | Configurações atuais | Reutilizar ações reais; retirar apenas a UI redundante de seleção de tema após validar o atalho global |
| `assets/js/pdf-editor.js` e `pdf-native-text.js` | Editor original e avançado | Preservar seleção, texto original, prévia, histórico e exportação |
| `assets/js/foundation.js`, `experience-0.15.js` | Projetos, recuperação, fluxos, resultados e predefinições | Garantir continuidade e interoperabilidade |
| `vendor/`, `sw.js` e `manifest.webmanifest` | Motores offline, worker, cache e PWA | Não mudar versões sem necessidade; testar offline e estratégia de atualização |
| `app/` | Migração React ainda parcial | Não usar como substituto da app publicada nesta etapa |

**Contagem de ferramentas:** o catálogo publicado documentado contém **34 ferramentas funcionais**. A Home usa **39 atalhos/cartões visuais** ao decompor parte das conversões Office e similares. O design deve manter os 39 atalhos onde cabíveis, mapeando cada um para as operações reais do catálogo (por exemplo, Word/Excel/PowerPoint para PDF e PDF para Word/Excel/PowerPoint), sem fabricar cinco motores novos. Conferir sempre `toolConfig` e inventário gerado.

## 3. Linguagem visual aprovada

- Marca: **Central PDF** com símbolo vetorial próprio e contraste adequado em tema claro e escuro. O nome visual não muda automaticamente a versão/identidade de distribuição em documentos legais ou release.
- Home: hero central com título em degradê **do tom escuro de texto para violeta/roxo**; busca, filtros, cartões com borda correlata ao ícone; espaçamento e acessibilidade.
- Cabeçalho: Juntar PDF, Dividir PDF, Comprimir PDF, Organizar PDF, Editar PDF, **Converter PDF ⌄**, **Todas as ferramentas ⌄**. Menus de conversões/todas com mini-ícones à esquerda. Ajuda somente “?”, tema no topo com sol/lua; configurações na engrenagem.
- Configurações: painel com **Personalização**, **Projetos e tarefas**, **Sistema e suporte**, ícones coloridos. A escolha de tema **não** se repete nesse painel, mas todas as funções de ajustes permanecem acessíveis.
- Ferramentas: títulos em degradê **local ao texto**, igual ao hero; progresso Arquivos/Ajustes/Baixar; descrição, indicadores de entrada/ações/resultado; ajuda contextual; importação; painel lateral próprio; aviso contextual; estados vazios/carregando/erro/sucesso.
- Todas as cores e elevações vêm de tokens compartilhados para os dois temas; foco visível, contraste e modo reduzido de animação devem ser preservados. Layout responsivo por largura real da janela; evitar esconder navegação funcional no celular.

## 4. Etapas de implementação

### Fase 0 — Linha de base e segurança
1. Criar branch de implementação **separada** da branch documental; registrar SHA de base, catálogo real, capturas claro/escuro e comportamento das 34 ferramentas.
2. Inventariar cada `data-tool`, campo e dependência de DOM/JS, inclusive acessibilidade, PWA, armazenamento e operações de exportação. Criar matriz de paridade rastreável.
3. Registrar testes de referência e exemplos sintéticos de PDF, imagens, OCR e Office. Guardar SHA-256 das saídas relevantes; nunca usar arquivos privados.

### Fase 1 — Fundação do design 3.0
4. Extrair tokens de fundo/superfície/borda/texto/degradê/cores sem copiar o CSS monolítico do protótipo; aplicar em arquivos do `assets/css/` existentes ou camada 3.0 **escopada** e com versão controlada.
5. Reutilizar sprite de ícones do produto (`scripts/data/tool-icons.json` e `scripts/sync-tool-icons.py`); assegurar que nomes, símbolos e ícones dos 39 atalhos correspondam às ferramentas.
6. Implementar componentes visuais reutilizáveis (cabeçalho, card, modal, painéis, etapas, dropzone, mensagens, toolbar, visualização de páginas), sem duplicar lógica de negócio.

### Fase 2 — Home, menus e configurações
7. Migrar Home, cartões, busca, filtros, navegação principal, menus suspensos, logo, ajuda e configurações com **os mesmos handlers reais**.
8. Verificar menu mobile, `Ctrl+K`, `F9`, `Esc`, foco/teclado, clique fora, scroll, leitores de tela e tema persistido; não mudar IDs/contratos quebrando outros módulos.
9. Em Configurações, preservar painéis, predefinições, projetos, resultados, fila, fluxos, sistema e diagnósticos; remover apenas o seletor de aparência redundante **depois de** comprovar que a ação global é equivalente.

### Fase 3 — Primeiro lote: Juntar, Dividir, Organizar
10. **Juntar PDFs:** conectar a nova vista ao upload e compositor reais. Preservar documentos inteiros, reordenação por miniaturas, modo **Só capas** (incluindo contagem por capas), exclusão, nome final, exportação, feedback e histórico.
11. **Dividir PDF:** preservar todos os modos existentes, intervalos, confirmação de páginas incluídas/omitidas, prévia dos arquivos, ZIP/PDF, nomeação e mensagens de erro.
12. **Organizar PDF:** preservar miniaturas, arraste, giro, duplicar, excluir, inserir páginas e imagens, histórico, revisão e resultado. O painel de opções não pode tomar o lugar de ações necessárias por página.
13. Em todas as três, alternar estado vazio → arquivos importados → ajustes → processamento → resultado real; desabilitar ações inválidas; confirmar a saída gerada e os fluxos de retorno. **Não publicar** se o HTML apenas simular importação.

### Fase 4 — Restante das ferramentas
14. Aplicar os mesmos componentes, sem padronizar à força os formulários específicos: edição básica/avançada e texto original; compressão; OCR; imagens e Office; comparação; censura definitiva; assinatura; formulários; segurança; recuperação; diagnósticos; inteligência documental.
15. Conservar avisos de risco de cada ferramenta: assinatura visual ≠ assinatura digital ICP-Brasil; arquivamento ≠ certificação PDF/A; cobrir texto ≠ censura definitiva; compatibilidade e limitações de OCR/Office.
16. Validar casos especiais: envio de formatos, orientações, capas, qualidade, tamanho de imagem/assinatura, camadas, foco após edição, download, retomada de projeto, cancelamento e erros/limites.

### Fase 5 — Homologação e liberação controlada
17. Executar regressão automatizada de raiz/JS/Playwright, React (para detectar efeitos colaterais), Go, PDF real, suíte de 34 ferramentas, integridade, checks de catálogo e testes visual/accessibility em desktop e celular.
18. Comparar saídas com linha de base, registrar diffs, limitações e testes não executados. Manter checks obrigatórios `test` e `build` do repositório.
19. Abrir PR(s) de implementação para revisão visual/funcional; só integrar depois de aceite, CI verde, check de privacidade e plano de rollback. Release Windows, cache SW e Pages terão validação e aprovação **em etapas próprias**.

## 5. Critérios de aceite / bloqueios

**Aprovável somente se:**
- Todos os 34 módulos funcionais + 39 atalhos esperados continuam acionando a lógica **real** do catálogo, mantendo entradas, opções e saídas.
- Todos os workspaces funcionam com tema claro/escuro e viewport móvel, sem elementos inacessíveis, sobreposição ou corte.
- 3 workspaces-modelo passam casos reais com PDFs de teste: juntar preserva páginas e ordem; dividir entrega partes corretas; organizar salva exatamente as alterações pedidas.
- Projetos, resultados, predefinições, fluxos, recuperação, atalhos, ajuda, configurações, logs, segurança, navegação e offline mantêm paridade.
- Testes de privacidade e segurança permanecem válidos; nenhuma nova transmissão de arquivos ou telemetria.
- Evidências de teste e revisão são anexadas; nenhum bloqueio da CI ou regressão é ignorado.

**Falha bloqueante:** um botão visual sem ligação com processamento, perda silenciosa de página, saída com conteúdo alterado, perda de projeto, regressão de proteção/censura ou quebra de cache/offline.

## 6. Próximas decisões

Este commit apenas salva o material e o plano. **Não realiza migração**, não aprova a versão 3.0 e não representa certificação de equivalência. Implementação deverá usar branch própria e worktrees somente conforme `AGENTS.md` (no Windows, `D:\\Dev\\Worktrees`). PRs de código devem ser pequenas e sem merge automático.

## 7. Fontes internas

- [Estrutura atual](../../reference/ESTRUTURA_DO_PROJETO.md), [catálogo](../../reference/MODULES.md), [auditoria de 34 módulos](../../audits/2026-10-25/TOOLS.md).
- [README do produto](../../../README.md), [README da migração React](../../../app/README.md), [instruções de contribuição](../../../CONTRIBUTING.md), [governança](../../github-governance.md).
- Testes existentes: `tests/product-redesign-functional-parity-2.0.test.py`, `tests/tool-regression-real.py`, `tests/merge-cover-default.test.py`, `tests/split-interactive-ui.test.py`, `tests/settings-theme-toggle.test.py`, `tests/workspace-completion-actions-2.0.6.test.py`, `tests/ux-editor-modernization.test.py`.
