# Estrutura do projeto

Estrutura atual (v1.2.1 + fundação 2.0 conforme ADR-0001).

```text
CentralPDF_Web_Local/
├── index.html                      # App vanilla (produto publicado no Pages)
├── README.md
├── CHANGELOG.md
├── SECURITY.md
├── THIRD_PARTY_NOTICES.md          # Política de licenças (PR 2, Fase 0)
├── checksums.sha256
├── manifest.webmanifest
├── sw.js                           # Service worker (PWA)
├── ABRIR_CENTRAL_PDF.bat           # Execução local no Windows
├── PREPARAR_OFFLINE.bat            # Baixa motores para uso offline
├── CentralPDF_Local_Server.exe     # Motor local Go (companion)
├── assets/
│   ├── css/                        # 24+ folhas de estilo (design legado)
│   ├── icons/
│   └── js/                         # app.js + módulos de ferramentas legados
├── docs/
│   ├── architecture/               # ADRs, catálogo, motores, baseline, previews (2.0)
│   ├── guides/
│   ├── history/
│   ├── previews/                   # Screenshots de versões anteriores
│   ├── reference/
│   ├── reports/
│   └── testing/
├── app/                            # (Fase 1+) Vite + React + TS — CentralPDF 2.0
├── scripts/
│   ├── build-release.ps1
│   ├── prepare-offline.ps1
│   └── extract-tool-catalog.mjs    # Inventário das 34 ferramentas
├── tests/                          # Suíte legada (node + pytest/Playwright)
├── vendor/                         # Motores commitados (jszip, pptxgen, libpdf)
└── server/                         # Motor local Go (go 1.23, stdlib)
```

A raiz contém somente arquivos de entrada, segurança e execução. A documentação
de arquitetura do 2.0 vive em `docs/architecture/` (comece por
`ADR-0001-arquitetura-2.0.md`).