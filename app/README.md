# CentralPDF 2.0 — migração React

Interface em **React 19, TypeScript e Vite 7**, com versão de pacote **2.0.1**. Estado conferido em **21/10/2026**.

> A aplicação publicada no GitHub Pages e no pacote Windows continua na raiz do repositório. Este diretório tem build próprio; não oferece automaticamente as 34 ferramentas do produto atual. [Voltar ao projeto](../README.md).

## O que existe hoje

- Registro e contratos tipados de ferramentas, roteamento de runtime, validação de entrada e motor de tarefas.
- Catálogo inicial, busca/favoritos, workspace, arquivos, configurações, progresso e resultados.
- Ferramentas e motores PDF no navegador, além de suítes Vitest/Testing Library.

| Ferramenta registrada | Estado no catálogo React |
| --- | --- |
| Juntar PDFs | Implementada |
| Extrair texto | Implementada |
| Proteger PDF | Experimental; qpdf WASM em Worker |
| PDF para imagens | Experimental; PDF.js com limites de saída |
| Comprimir PDF | Planejada; execução bloqueada no catálogo |
| OCR e PDF pesquisável | Planejada; execução bloqueada no catálogo |

A implementação experimental de compressão presente nos arquivos não torna a ferramenta disponível no registro. A referência executável é [`src/core/catalog.ts`](src/core/catalog.ts) e os metadados das ferramentas.

Proteger PDF e PDF para imagens têm testes unitários/contratuais, mas não uma integração realista dos respectivos motores na CI. Não interprete mocks de qpdf/PDF.js como validação completa do WASM/renderizador. Faça a conferência manual com documentos sintéticos antes de liberar uma distribuição dessa interface.

## Executar e validar

Com Node.js 22, da raiz do repositório:

```bash
npm ci --prefix app
npm --prefix app run dev -- --host 127.0.0.1
npm --prefix app test
npm --prefix app run typecheck
npm --prefix app run build
npm --prefix app run preview -- --host 127.0.0.1
```

Abra a URL que o Vite informar. O build produz `app/dist/`. Dentro de `app/`, os equivalentes são `npm ci`, `npm run dev`, `npm test`, `npm run typecheck`, `npm run build` e `npm run preview`. Para observar testes durante desenvolvimento, use `npm run test:watch`.

## Estrutura atual

```text
src/
├── core/         # contratos, catálogo, registro, runtime, validação e tarefas
├── home/         # catálogo e cartões de ferramentas
├── store/        # estado da aplicação
├── workspace/    # layout, arquivos, ajustes, progresso e resultados
├── tools/        # implementações PDF, motores e ponte/Worker qpdf
├── ui/           # componentes compartilhados
├── styles/       # tokens e estilos
├── test/         # setup e verificações transversais
├── types/        # declarações auxiliares
├── App.tsx       # composição da interface
└── main.tsx      # entrada Vite
```

Testes também ficam junto aos módulos. `legacy/` e o adaptador via iframe descritos no ADR ainda não existem neste diretório; integrações companion/remote e a migração completa são direções arquiteturais, não recursos entregues por este catálogo.

## Referências

- [Contribuição e validação das duas interfaces](../CONTRIBUTING.md).
- [Estrutura e distribuição atuais](../docs/reference/ESTRUTURA_DO_PROJETO.md).
- [ADR-0001](../docs/architecture/ADR-0001-arquitetura-2.0.md): decisão histórica e direção da migração.
- [Componentes de terceiros](../THIRD_PARTY_NOTICES.md).
