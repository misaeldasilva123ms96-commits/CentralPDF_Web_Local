# CentralPDF 2.0 — app

Núcleo do CentralPDF 2.0 (Vite + React 19 + TypeScript). Ver
`../docs/architecture/ADR-0001-arquitetura-2.0.md` para o contexto
arquitetural.

## Comandos

```bash
npm install       # instala dependências
npm run dev       # servidor de desenvolvimento
npm run test      # Vitest (unit/componentes)
npm run build     # tsc -b && vite build → dist/
npm run typecheck # verificação de tipos
```

## Estrutura prevista

```text
src/
├── core/         # ToolDefinition, ToolRegistry, TaskEngine, RuntimeRouter (PR 4+)
├── workspace/    # layout 3 colunas, arquivos, configurações, progresso (PR 7)
├── home/         # catálogo, busca, favoritas (PR 7)
├── legacy/       # LegacyToolAdapter via iframe + postMessage (PR 8)
└── styles/       # design tokens (tokens.css)
```

O app antigo na raiz continua sendo o produto publicado no GitHub Pages até o
fim da migração. Este app publicará apenas a partir da Fase 3.