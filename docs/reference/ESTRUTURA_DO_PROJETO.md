# Estrutura e distribuição do projeto

Estado revisado em **21/10/2026**, versão declarada **2.0.1**. [Documentação](../README.md) · [Desenvolvimento](../../CONTRIBUTING.md)

## Duas interfaces, uma publicação atual

| Área | Papel atual |
| --- | --- |
| Raiz: `index.html` + `assets/` + `vendor/` | Aplicação estática publicada e usada pelo pacote Windows, com 34 ferramentas |
| `app/` | Migração React/TypeScript com catálogo parcial, build e testes próprios |
| `server/` | Servidor HTTP Go para servir a aplicação no computador; não processa os PDFs enviados por uma API |

O [ADR-0001](../architecture/ADR-0001-arquitetura-2.0.md) registra a direção aprovada em agosto de 2026. Adaptador legado via iframe, runtime companion ampliado e serviços remotos propostos não devem ser confundidos com capacidades atuais. O [README React](../../app/README.md) descreve o que está implementado nesse diretório.

## Mapa do repositório

```text
CentralPDF_Web_Local/
├── index.html                     # entrada da interface publicada
├── README.md / CONTRIBUTING.md     # apresentação e desenvolvimento
├── CHANGELOG.md / SECURITY.md      # evolução e segurança
├── THIRD_PARTY_NOTICES.md          # componentes e licenças de terceiros
├── manifest.webmanifest / sw.js    # metadados PWA e cache
├── ABRIR_CENTRAL_PDF.bat           # inicializador Windows, com fallback Python
├── PREPARAR_OFFLINE.bat            # preparação PowerShell dos motores
├── CentralPDF_Local_Server.exe     # binário Windows Go versionado
├── checksums.sha256                # integridade do executável
├── assets/
│   ├── css/                       # estilos e ajustes responsivos
│   ├── icons/                     # ícones da aplicação
│   └── js/                        # ferramentas, editor, sessão e diagnósticos
├── vendor/                        # motores e recursos locais
├── app/                           # migração React/Vite/TypeScript
├── server/                        # servidor HTTP Go e testes
├── scripts/                       # preparar motores, empacotar, inventariar e auditar
├── tests/                         # testes JS, Python/Playwright e integridade
├── docs/                          # guias, arquitetura, referências e histórico
└── .github/workflows/              # CI, Pages e release
```

## Principais pontos de manutenção

| Arquivo ou grupo | Responsabilidade |
| --- | --- |
| `assets/js/app.js` | Catálogo `toolConfig`, workspace, entrada, execução e exportação |
| `pdf-editor.js` / `pdf-native-text.js` | Editor visual, páginas, histórico e substituição de texto original |
| `workspace-modernization.js` | Importação global e escolha de ferramentas compatíveis |
| `foundation.js` / `experience-0.15.js` | Projetos, recuperação, processos, resultados, fluxos e predefinições |
| `stable-1.0.js` | Autodiagnóstico, logs locais e acessibilidade |
| `diagnostics-config.js` / `diagnostics-telemetry.js` | Destino Sentry, consentimento e transporte restrito |
| `engine-loader.js` / `pdfjs-manifest.js` em `vendor/` | Carregamento dos motores e recursos PDF.js |
| `sw.js` | Cache e atualização da aplicação estática |

Os nomes JavaScript da tabela pertencem a `assets/js/`, salvo o manifesto indicado em `vendor/`. Sufixos antigos em arquivos refletem a evolução incremental; não indicam necessariamente a versão atual do produto.

## Distribuição e integridade

1. **CI** valida a raiz e `app/`, roda testes Go e compara o executável Windows com a recompilação. Node.js 22, Python 3.12 e Go 1.26.10 são as versões do workflow; o módulo Go declara 1.23.
2. **Pages** prepara motores verificados e copia somente os arquivos estáticos da raiz para o site. `app/dist/`, executável, fontes Go e testes não integram esse pacote. Em PR não há deploy; eventos elegíveis na `main` publicam pelo workflow.
3. **Release** usa tag estável e notas em `docs/releases/`, prepara o pacote Windows e produz ZIP, executável, manifesto SHA-256 e atestações.

CI e Pages são workflows separados. Publicar a `main` não atualiza uma release Windows já criada. O número `2.0.1` sozinho não identifica todos os patches: confira commit, data e notas da distribuição.

## Organização da documentação

Comece por [docs/README.md](../README.md). `guides/` contém uso; `reference/`, consulta; `architecture/`, decisões e inventários. `testing/`, `reports/`, `history/` e capturas em `previews/` preservam evidências datadas. Não atualize silenciosamente contagens ou resultados de relatórios antigos para fazê-los parecer verificações da versão atual.
