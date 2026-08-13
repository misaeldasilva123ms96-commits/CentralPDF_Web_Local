# Baseline CentralPDF v1.2.1 — Fase 0

Estado congelado do aplicativo antes da fundação 2.0 (ADR-0001).

- **Versão:** v1.2.1
- **Commit de referência:** `5c08991` (merge do fix/compact-tool-workspace-chrome)
- **Data do inventário:** 2026-08-07
- **Ferramentas:** 34 (ver [CATALOGO_FERRAMENTAS.md](CATALOGO_FERRAMENTAS.md))
- **Motores:** ver [MOTORES.md](MOTORES.md)
- **Licenças:** ver [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)

## O que foi medido

| Item | Estado |
| --- | --- |
| Arquivos JS na raiz `assets/js/` | 21 scripts carregados via `<script>` |
| Linhas de `assets/js/app.js` | 3.498 (toolConfig na linha 9; API pública `window.CentralPDFApp` na linha 3468) |
| Ferramentas | 34, sendo 7 marcadas `professional` |
| Maiores superfícies de settings | editPdf (42 ids), signPdf (26), ocr (25), formBuilder (19), watermark (16) |
| Testes legados | runner node puro + pytest/Playwright (`tests/`) |
| CI | `ci.yml` (node 22 + python 3.12 + go 1.26.5), `pages.yml`, `release.yml` |
| Motor local | Go `server/` (go 1.23, stdlib, sem dependências externas) |
| Service Worker | `sw.js`, cache `centralpdf-v1.2.1-pages-14` |

## Screenshots

`tests/generate-baseline-screenshots.py` captura o estado visual atual
(home + workspace) para `docs/architecture/previews/BASELINE_*.png`.
Executar no ambiente com Playwright (CI):

```bash
python tests/generate-baseline-screenshots.py
```

Os previews históricos em `docs/previews/` continuam válidos como
referência visual das versões anteriores.

## Indicadores para comparação futura

Na Fase 6 (migração), cada ferramenta migrada deve manter ou melhorar:

- tempo de processamento por unidade (páginas/s);
- tamanho de saída (compressão);
- memória estimada (modo lote grande);
- comportamento offline (sem rede);
- resultados de auditoria (`tool-quality-1.2.0.js`).

## Ferramentas a preservar intactas

`window.CentralPDFApp` (app.js:3468) é a superfície pública mínima usada pelo
`LegacyToolAdapter` (Fase 3): `selectTool`, `processCurrentTool`,
`openFilesInTool`, `getToolCatalog`, `getToolCapabilities`, `getSettings`,
`applySettings`. Nenhuma alteração interna é necessária para o baseline.
