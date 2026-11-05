# Exemplos de telas e roteiros assertivos — Central PDF 3.0

**Referência visual executável:** [protótipo HTML final](./prototipo-centralpdf-3.html).  
**Natureza dos exemplos:** roteiros de **aceitação futura**; não substituem validação de motores da aplicação real.

## Design compartilhado pelos exemplos

As três telas seguem exatamente a mesma composição básica da Home:
- Cabeçalho com logo e nome **Central PDF**, atalhos, menus com setas e ícones, ajuda, sol/lua e configurações.
- Título `h1` com **degradê aplicado ao comprimento do texto** (tom de texto → violeta → roxo), preservado em tema claro/escuro. Não deixar o degradê ocupar a largura inteira do contêiner.
- Três estados de passo: **Arquivos → Ajustes → Baixar**, indicadores de **Entrada / Você poderá / Resultado**, explicação contextual e conteúdo central.
- Área de entrada com arrastar/soltar, botão escolher arquivos, estados vazio/ocupado/progresso/erro, painel de opções à direita e saída conferível.
- Cores/tokens, bordas, radius, sombra, ícones e hover consistentes; layouts desktop, tablet e celular. A sidebar pode recolher, mas não pode esconder opções sem um modo de reabri-la.
- O nome e ícone do atalho selecionado devem continuar consistentes na barra superior, no cartão, no histórico e na tela final.

## Exemplo A — Juntar PDFs

**Acesso:** cartão “Juntar PDFs”, botão “Juntar PDF” do topo ou item correspondente em Todas as ferramentas.

**Entrada sintética:** `A.pdf` com 2 páginas numeradas `A1, A2`; `B.pdf` com 3 páginas `B1, B2, B3`.

**Experiência planejada:**
1. Abrir a tela: apresentar “Juntar PDFs”, ajuda contextual, resumo, dropzone, sidebar.
2. Importar `A.pdf` e `B.pdf` por clique ou arrastar. O programa real carrega, identifica origem, páginas e limites.
3. Mostrar ambos os documentos e miniaturas; arrastar `B.pdf` à frente de `A.pdf`.
4. Manter o **modo Só capas** como no produto atual: cada capa representa **o documento inteiro**, não apenas a primeira página. Contagem da lista por documentos/capas quando esse modo estiver ativo, sem esconder a contagem de páginas do PDF final.
5. Alternar para modo de todas as páginas, confirmar ordem e nome final `uniao_teste.pdf`.
6. Executar processamento real, acompanhar progresso e baixar.

**Resultado esperado verificável:** 1 PDF com **5 páginas** na ordem `B1, B2, B3, A1, A2`, todas legíveis. Hash da saída registrado, tamanho/páginas inspecionados com biblioteca PDF. Original não modificado.

**Negativos:** menos de 2 PDFs (ação final inativa), arquivo inválido, cancelamento, duplicidade/ordem, PDF com proteção. Nenhum PDF é enviado para serviço remoto.

**Fonte dos testes:** `tests/merge-cover-default.test.py`, `tests/merge-source-order.test.py`, `tests/merge-dragdrop.test.py`.

## Exemplo B — Dividir PDF

**Acesso:** cartão “Dividir PDF”, botão “Dividir PDF” do topo ou Todas as ferramentas.

**Entrada sintética:** `seis_paginas.pdf`, 6 páginas com identificadores `P1` a `P6`.

**Experiência planejada:**
1. Selecionar o PDF real; renderizar prévia e total exato de páginas.
2. Exibir o seletor dos modos suportados pelo motor atual (a prévia indica **6 modos**, mas suas regras/controles reais são a referência).
3. No modo de intervalos, preparar saídas que cubram as páginas `1–2`, `3–4`, `5–6`, conforme opções reais do aplicativo.
4. Mostrar o plano de divisão, quantidade e miniaturas antes do processamento.
5. Executar e baixar PDFs separados e/ou ZIP **conforme formato selecionado**, com nomes válidos e sem sobreposição/omissão não solicitada.

**Resultado esperado:** três partes com exatamente as páginas `[P1,P2]`, `[P3,P4]` e `[P5,P6]`; abrir cada PDF/ZIP exportado e verificar contagem e conteúdo.

**Negativos:** intervalos fora do total, vazio, repetido indevidamente, PDF corrompido, cancelamento, arquivo com senha; mensagens úteis e nenhum arquivo final falso.

**Fonte dos testes:** `tests/split-interactive-ui.test.py`, `tests/tool-regression-real.py`.

## Exemplo C — Organizar PDF

**Acesso:** cartão “Organizar PDF”, botão “Organizar PDF” do topo ou Todas as ferramentas.

**Entrada sintética:** `quatro_paginas.pdf`, páginas `1, 2, 3, 4` visualmente diferentes.

**Experiência planejada:**
1. Importar PDF, mostrar miniaturas e ações reais.
2. Mover a página original 4 para primeiro lugar.
3. Girar a página original 2 em 90° e comprovar rotação na prévia.
4. Duplicar a página original 1, excluir a original 3 e inserir uma página em branco.
5. Conferir a ordenação final, alertas, nome de saída `organizado_teste.pdf`, e salvar em nova cópia.

**Resultado esperado:** PDF **com 5 páginas** (4 originais − 1 removida + 1 duplicada + 1 em branco); primeira página tem conteúdo da 4 original; orientação da 2 está correta; a página 3 excluída não reaparece; página em branco inserida; original intacto.

**Negativos:** apagar todas as páginas, clicar fora da miniatura, reordenar em mobile/touch, perder foco, desfazer/refazer, trocar de tela com alteração não salva.

**Fonte dos testes:** `tests/organizer-planner.test.js`, `tests/ux-editor-modernization.test.py`, `tests/workspace-completion-actions-2.0.6.test.py`.

## Exemplo D — Componentes comuns e continuidade

| Verificação | Procedimento | Esperado |
| --- | --- | --- |
| Título | Alternar tema nas 3 telas | Transição de cor forte ao longo das letras, como hero da Home |
| Topo | Abrir Converter PDF e Todas as ferramentas | Chevron, ícones, item correto, fechamento por `Esc`/clique fora |
| Configurações | Abrir pela engrenagem | Personalização, Projetos/tarefas, Sistema/suporte funcionais, sem duplicar tema |
| Ajuda | Abrir pelo ícone “?” | Orientação real; acessível por teclado |
| Voltar | Clicar marca/atalho Home | Retornar sem perder arquivos/projetos inadvertidamente |
| Tema | Lua no claro, sol no escuro | Persistência sem resetar estado do workspace |
| Offline | Desconectar rede após preparação | A ferramenta suportada continua funcionando localmente |
| Móvel | 360–430 px e tablet | Texto, menu, importação, ação e sidebar alcançáveis; sem overflow horizontal inesperado |
| Acessibilidade | Teclado e zoom 200% | Todos os controles relevantes navegáveis e legíveis |

## O que o protótipo comprova e o que não comprova

**Inspecionado localmente no HTML de referência (05/11/2026):** 39 cartões, abertura de Juntar/Dividir/Organizar pelo topo, retorno à Home, troca para tema escuro, abertura de Todas as ferramentas com 39 links e ausência de erro JavaScript durante essas ações. Os três títulos apresentam o mesmo `linear-gradient(120deg, ...) ` da Home.

**Não comprovado pelo protótipo:** upload real, arrastar arquivos, renderização de PDF, processamento, ajustes, exportação, projetos, OCR, Office, PWA e ferramentas restantes. Esses comportamentos existem no **aplicativo original** e terão de ser reconectados, auditados e testados na futura implementação 3.0. Os arquivos/cenários acima são **sintéticos e propostos**, não outputs comprovadamente gerados agora.

## Próximo passo técnico

Implementar primeiro o shell/tema sobre a aplicação real, depois uma única ferramenta ponta a ponta, mantendo a lógica vigente; em seguida escalar para as outras duas e para as demais ferramentas, conforme [plano](./PLANO_MIGRACAO.md) e [matriz](./MATRIZ_PARIDADE_E_TESTES.md).
