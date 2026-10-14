# Modernização UX e editor — entrega para revisão

## Base e escopo

Implementação na branch `feat/centralpdf-ux-editor-v2`, criada de `main` em `d495ec1`. Os PRs #49, #50 e #51 já estão integrados nessa base. Nenhum merge, release ou publicação foi realizado.

O produto publicado e o pacote local Windows usam `index.html`, `assets/` e `vendor/`, servidos estaticamente. O workflow Pages copia essas pastas; o servidor local Windows serve a mesma interface. `app/` é a migração React/Vite, ainda separada do produto publicado. As melhorias foram feitas no aplicativo estático, mantendo as 34 ferramentas e o processamento dos documentos no navegador.

## Análise dos fluxos atuais

Capturas locais foram conferidas em Chromium, em 1440×1000 e 390×844, com documentos sintéticos. Não foi usado plugin Browser: ele não está disponível nesta sessão; foi usado Playwright, já adotado pelo projeto.

| Etapa auditada | Situação inicial | Resultado implementado |
| --- | --- | --- |
| 1. Home → adicionar documentos | O arraste era limitado ao workspace; a Home não orientava a entrada por arquivo. | Botão Abrir arquivos, destaque durante o arraste e diálogo para escolher ferramentas compatíveis com os formatos e quantidade. |
| 2. Ferramenta → adicionar arquivos | Algumas ferramentas de arquivo único substituíam o documento carregado. | O documento existente é mantido; o usuário recebe orientação para remover o anterior ou iniciar nova operação. PDFs novos continuam sendo adicionados no editor/organizador. |
| 3. Editor → navegar e organizar | Miniaturas renderizadas sequencialmente para todo o PDF; navegação por clique e botões de página. | Controles criados imediatamente, miniaturas nítidas sob demanda, seleção em lote, arraste e teclado, rotação e exclusão reversíveis. |
| 4. Editor → modificar texto/imagem | Edição nativa, prévia, histórico e imagens compactas já existiam. | Seletores vazios de texto foram eliminados, campo nativo permanece ancorado sem rolagem suave intermediária, imagens entram de forma transacional e miniaturas mostram os objetos exportados. |
| 5. Editor → substituir página | Não havia fluxo para substituir uma página por uma página escolhida de outro documento. | Diálogo com arquivo PDF/PNG/JPEG, escolha da página, prévia e confirmação. A posição na sequência e as demais páginas são preservadas; Desfazer/Refazer restauram os estados. |
| 6. Editor no celular | O painel de propriedades fixo podia encobrir o documento. | Painel depois do documento, entrada compacta depois de carregar o PDF, atalhos Propriedades e Voltar à página, controles novos com contraste em tema escuro. |
| 7. Processar → exportar | Porcentagem inicial fixa e ausência de cancelamento próximo ao botão principal. | Estado indeterminado na preparação/gravação; contagem real por página na exportação do editor; botão Cancelar; bloqueio de duplicação e de mutações durante a operação. |

A auditoria visual não comprova conformidade integral de acessibilidade. Os testes exercitam teclado, foco, nomes acessíveis, estado de progresso e layout móvel; faltam avaliações manuais com leitores de tela.

## Critérios de aceitação e comportamento

- Arrastar arquivos sobre a Home abre a escolha de ferramenta; arrastar sobre o workspace usa a validação existente. Sobre cabeçalho e regiões externas ao workspace, os arquivos chegam à ferramenta ativa. Navegação acidental do navegador é impedida. Arrastes de páginas continuam internos; modais e processamento bloqueiam novas importações.
- A entrada pela Home também funciona com teclado/picker, aceita múltiplos arquivos e informa combinações incompatíveis. Nomes importados são tratados como texto, sem HTML.
- Miniaturas visíveis do editor possuem backing canvas de 216×288 e fila de renderização serial; páginas fora da área preparada mantêm apenas placeholders de 3×4 pixels, sem alocar o bitmap completo. Um PDF sintético de 80 páginas cria os 80 controles, renderizando inicialmente menos de 25 miniaturas no viewport testado. Isso demonstra renderização sob demanda; não é um benchmark geral de tempo/memória.
- Arrastar uma miniatura reordena páginas. Alt+setas reordena pelo teclado; setas sem Alt navegam. As ações não movem nem giram inadvertidamente objetos selecionados.
- Caixas de seleção permitem girar ou excluir várias páginas. O documento precisa manter ao menos uma página. Desfazer/Refazer restauram conteúdo, ordem e seleção.
- A substituição prepara a página sem alterar o documento; erro, página inexistente ou fechamento do diálogo não confirmam a operação. A confirmação altera apenas o slot selecionado. PDFs restritos seguem a política de compatibilidade já existente.
- A assinatura usada pela recuperação automática inclui a origem da página, geometria e propriedades dos objetos, sem duplicar os dados de imagens na assinatura. Substituições de mesmo tamanho e ações por teclado/arraste também sinalizam alterações para recuperação.
- Inclusão de PDFs/imagens é transacional: um erro não confirma parte da operação nem adiciona histórico fictício. Renderers, documentos de origem sem referências no histórico e candidatos descartados são liberados; fontes necessárias ao Desfazer continuam disponíveis.
- O tamanho compacto das imagens do PR #49 foi preservado: limites iniciais de 180×90 pontos e proporção da página. A imagem mantém proporções; o redimensionamento continua disponível. A interface distingue assinatura visual de assinatura digital com certificado.
- O mecanismo CID do PR #50 permanece intacto. Texto original continua sendo reescrito em operadores PDF, sem cobertura branca. Fontes compatíveis são preservadas e o fallback/rejeição de Unicode mantém a política existente.
- “Só capas” continua padrão na união; capas e páginas totais são contadas separadamente. O teste exporta dois documentos com 3 e 2 páginas, produzindo um PDF válido de 5 páginas mesmo com apenas 2 capas visíveis.
- O cancelamento é cooperativo. O editor verifica cada etapa e impede novo download se o cancelamento for solicitado durante `save()`. Bibliotecas sem cancelamento nativo terminam a etapa atual. Downloads já iniciados em ferramentas de lote não são revogados.
- O Service Worker foi atualizado para `pages-32`, com URLs novas para scripts alterados e cache dos módulos novos. Migração dos motores externos e fallback HTTP 404/500 do PR #51 foram preservados.

## Módulos alterados

| Arquivo | Responsabilidade |
| --- | --- |
| `assets/js/workspace-modernization.js` | Entrada global de arquivos, diálogo de escolha, proteção de destinos. |
| `assets/css/workspace-modernization.css` | Importação, seleção de páginas, progresso, diálogo de substituição, navegação móvel e contraste. |
| `assets/js/app.js` | Proteção do documento carregado, execução única, status por etapa, cancelamento no limite do download e bloqueio de edição durante exportação. |
| `assets/js/foundation.js` | Tarefas com progresso indeterminado, sem apresentar 0% fictício na preparação. |
| `assets/js/pdf-editor.js` | Miniaturas, ações de páginas, substituição com prévia, transações, histórico, ancoragem nativa e liberação de fontes/renderers. |
| `index.html` | Entradas acessíveis, controles do editor, diálogos e carregamento dos módulos. |
| `sw.js` | Cache e atualização dos recursos, mantendo a migração offline existente. |
| `tests/ux-editor-modernization.test.py` | Integração com PDFs, imagens e motores reais no Chromium. |
| Testes existentes de entrega/cache/versão | Expectativas atualizadas para os recursos e cache novos. |

## Validação

Base inicial, após instalar o Chromium compatível com os requisitos do projeto: **81 suítes legadas passaram**, mais **240 testes Vitest em 22 arquivos**. A primeira tentativa encontrou browsers ausentes no ambiente; isso foi corrigido antes da implementação.

Comandos reproduzíveis:

```bash
python -m pip install -r requirements-test.txt
python -m playwright install chromium
find tests -maxdepth 1 -name '*.js' -print0 | sort -z | xargs -0 -n1 node
find tests -maxdepth 1 -name '*.test.py' -print0 | sort -z | xargs -0 -n1 python
python tests/static_integrity.py
find assets/js -maxdepth 1 -name '*.js' -print0 | sort -z | xargs -0 -n1 node --check
node --check sw.js
node scripts/extract-tool-catalog.mjs
git diff --exit-code -- docs/architecture/_CATALOGO_RAW.md
npm --prefix app test -- --reporter=dot
npm --prefix app run typecheck
npm --prefix app run build
sha256sum -c checksums.sha256
git diff --check
```

Resultados finais: **82 suítes legadas/integração passaram**, **240 testes Vitest passaram**, `typecheck`, `build`, validação de sintaxe, integridade do executável, sincronização do catálogo gerado de 34 ferramentas e `git diff --check` passaram. O build manteve o aviso existente sobre chunks maiores que 500 kB. As evidências estão também registradas na descrição do PR Draft. A integração nova verifica upload global, formatos, nomes com acentos/espaços, PDF inválido, capas versus exportação completa, documento de 80 páginas, seleção em lote, histórico, arraste/teclado, substituição PDF/imagem, posicionamento real da imagem exportada, cancelamento, bloqueio de duplicação e edição nativa após recarga offline. A suíte existente cobre CID, fontes incorporadas, restrições, orientação, imagens, nomes de downloads, ingestão, recuperação, cache e as demais ferramentas.

Não foram alterados backend, dependências de produção, distribuição Windows, mecanismo de censura definitiva ou código da migração React. Nenhum documento privado ou captura de documento real integra os commits.

## Limites e próxima etapa

- Não há recomposição automática de parágrafos, edição nativa dentro de Form XObjects, fontes verticais/Type3 ou Unicode irrestrito. Essas estruturas seguem a limitação explícita existente. OCR não transforma letras de uma imagem em texto visual nativamente editável.
- A fila de miniaturas do organizador já existente foi mantida; o recorte desta entrega amplia o comportamento sob demanda principalmente no editor. Virtualização integral de listas, com remoção de todos os controles fora do viewport, não foi implementada.
- Não foi adicionado Worker novo: PDF.js já usa seu Worker. A exportação pdf-lib ganhou processamento incremental por página e liberação da interface entre etapas. Serialização final ainda usa a biblioteca existente.
- As porcentagens/etapas das outras ferramentas foram preservadas, além do estado inicial indeterminado e da proteção central. A padronização detalhada de todas as operações é recomendada em etapa posterior.
- Não há medição universal de memória nem benchmark de PDFs extremos. O teste de 80 páginas e a fila serial são evidência funcional, não garantia para qualquer tamanho de arquivo.
- Safari, Firefox, leitores de tela e execução nativa do pacote no Windows não foram validados nesta sessão Linux. A compatibilidade estática e a integridade do executável foram verificadas; o CI existente continua responsável pelos testes/build do servidor.
- Próximos passos recomendados: QA manual no Windows e com leitores de tela; medições de PDFs maiores; progresso uniforme nas ferramentas de lote; ampliar formatos de fonte nativa somente com corpus e testes específicos.
