# Central PDF 3.0 — proposta visual com preservação funcional

> **STATUS: PLANO + REFERÊNCIA VISUAL, NÃO IMPLEMENTAÇÃO.** Esta pasta guarda a versão de HTML aprovada em conversa e os roteiros para migrá-la sobre o **produto funcional original**. Nenhum `index.html`, JS, CSS, worker, motor, executável, versão, cache ou release foi alterado para o redesign nesta branch.

## Materiais

| Arquivo | Para que serve |
| --- | --- |
| [Protótipo completo HTML](prototipo-centralpdf-3.html) | Último modelo 3.0 (Home, menus, configurações, logo, modo claro/escuro e exemplos de Juntar/Dividir/Organizar com títulos em degradê corrigidos) |
| [Plano de migração](PLANO_MIGRACAO.md) | Arquitetura, fases, preservação das funcionalidades, critérios de aceite e rollback |
| [Matriz de paridade](MATRIZ_PARIDADE_E_TESTES.md) | Todas as 34 ferramentas funcionais, 39 atalhos e suíte/checklist de regressões |
| [Exemplos de telas](EXEMPLOS_TELAS.md) | Roteiros precisos de entrada, interação e saída para Juntar, Dividir, Organizar e interfaces comuns |
| [SVG da marca](centralpdf-logo-referencia.svg) | Referência vetorial da logomarca original, para adaptação responsiva e contraste |

**Base funcional analisada:** `main` em `f7e1986c8ea8746c201ce8af46fab5ccc7e4591e` (05/11/2026). Não se trata de promessa de que o produto já usa o redesign 3.0.

## Como abrir a prévia

1. Clone/baixe **esta branch**, sem substituir a aplicação principal.
2. A partir da raiz do repositório, use `python -m http.server 8765 --bind 127.0.0.1`.
3. Abra `http://127.0.0.1:8765/docs/proposals/centralpdf-3-redesign/prototipo-centralpdf-3.html`.
4. Alterne tema, abra os menus e clique nos botões/cartões **Juntar**, **Dividir** e **Organizar**. Use o logo para voltar à Home.

O navegador renderiza uma **prévia de design**: não use como substituta para PDFs reais, não julgue o processamento pelas ações demonstrativas e não confunda screenshots com comprovantes funcionais.

## Regras para a futura implementação

- Aplicar visualmente em `index.html` e `assets/`, **preservando** `toolConfig` e todos os manipuladores reais. **Não** substituir pela migração parcial `app/`.
- Preservar todos os 34 módulos funcionais e os 39 atalhos/variantes, além de projetos, resultados, predefinições, fluxos, editor, segurança, ajuda, configurações, acessibilidade, offline/PWA, telemetria e integridade.
- Validar exportações com documentos **sintéticos**, como descrito nos exemplos, e executar as suites CI reais antes de qualquer merge.
- Trabalhar em branch de implementação própria; **sem merge automático**, sem publicação e sem mudança de release como parte desta documentação.

**Ponto de partida:** ler o [plano completo](PLANO_MIGRACAO.md). As referências reais do aplicativo estão em [docs/reference/ESTRUTURA_DO_PROJETO.md](../../reference/ESTRUTURA_DO_PROJETO.md) e no [README](../../../README.md).
