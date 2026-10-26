# Documentação do Central PDF & Imagem

Referência revisada em **21/10/2026**, a partir da `main` com as PRs até a #56 integradas. Versão declarada: **2.0.1**.

[Abrir o aplicativo](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/) · [README do projeto](../README.md) · [Contribuir](../CONTRIBUTING.md)

## Para usar o aplicativo

| Preciso… | Consulte |
| --- | --- |
| Começar e conhecer o fluxo de trabalho | [Guia do usuário](guides/GUIA_DO_USUARIO_1.0.md) |
| Editar texto, imagens e páginas | [Editor PDF](guides/EDITOR_PDF.md) |
| Substituir texto que já existe no PDF | [Texto original: uso e compatibilidade](editor-native-text.md) |
| Trabalhar offline, salvar ou recuperar uma sessão | [Offline e projetos](guides/OFFLINE_E_PROJETOS.md) |
| Reutilizar arquivos e configurações | [Fluxos, resultados e predefinições](guides/FLUXOS_RESULTADOS_E_PREDEFINICOES.md) |
| Ajustar leitura, contraste, foco e movimento | [Acessibilidade](guides/ACESSIBILIDADE_1.0.md) |
| Conhecer as 34 ferramentas | [Referência dos módulos](reference/MODULES.md) |
| Entender riscos e limites | [Limitações conhecidas](reference/LIMITACOES_CONHECIDAS_1.0.md) e [Segurança](../SECURITY.md) |
| Consultar meus logs ou compartilhar diagnósticos | [Diagnósticos e Sentry](diagnosticos-sentry.md) |

### Guias por especialidade

- [OCR e PDF pesquisável](guides/OCR_E_PDF_PESQUISAVEL_0.16.md).
- [Comparação e censura](guides/COMPARACAO_E_CENSURA_0.17.md).
- [Formulários e assinaturas](guides/FORMULARIOS_E_ASSINATURAS_0.18.md).
- [Conversões e arquivamento](guides/CONVERSOES_E_ARQUIVAMENTO_0.19.md).
- [Inteligência documental](guides/INTELIGENCIA_DOCUMENTAL_0.20.md).
- [Princípios da experiência](guides/UX_GUIDE.md).

## Para desenvolver e manter

| Tema | Referência |
| --- | --- |
| Ambiente, comandos e pull requests | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Mapa atual e distribuição | [Estrutura do projeto](reference/ESTRUTURA_DO_PROJETO.md) |
| Migração React/TypeScript | [README de app/](../app/README.md) |
| Decisões de arquitetura | [ADR-0001](architecture/ADR-0001-arquitetura-2.0.md) — decisão registrada em agosto, não inventário atual |
| Inventário extraído do aplicativo | [Catálogo gerado](architecture/_CATALOGO_RAW.md) |
| Motores e licenças | [Inventário de motores](architecture/MOTORES.md) e [avisos de terceiros](../THIRD_PARTY_NOTICES.md) |
| Governança e checks do GitHub | [Governança](github-governance.md) |

O site e o pacote Windows usam a aplicação estática da raiz. O conteúdo de `app/` é uma migração com implementação e catálogo próprios. Os modos e integrações propostos no ADR não significam que todos já estejam disponíveis.

## Histórico e evidências

- [CHANGELOG](../CHANGELOG.md): evolução integrada ao código; melhorias na `main` podem ser posteriores ao último ZIP publicado.
- [Notas da release 2.0.1](releases/2.0.1.md): recorte daquela distribuição.
- [Modernização do editor](modernizacao-ux-editor-v2.md) e [estabilização](estabilizacao-editor.md): relatórios de entregas específicas.
- [Auditoria das 34 ferramentas](testing/AUDITORIA_34_FERRAMENTAS_1.2.0.md), [auditoria técnica](reports/AUDITORIA_TECNICA_1.2.0.md) e demais arquivos em `testing/`, `reports/` e `history/`: evidências datadas, não garantias sobre toda versão futura.
- `previews/`: capturas de versões identificadas nos nomes; não representam necessariamente a interface atual.

Alguns guias mantêm números antigos no nome do arquivo para preservar os links. Quando revisados, o título e o conteúdo indicam o estado atual. Relatórios, ADRs e notas de release preservam o contexto da entrega original.

## Auditoria de estabilização — 25/10/2026

[Relatório e evidências](audits/2026-10-25/REPORT.md) · [Matriz das 34 ferramentas](audits/2026-10-25/TOOLS.md) · [Plano de release](audits/2026-10-25/RELEASE_PLAN.md) · [Privacidade e checklist Sentry](audits/2026-10-25/SECURITY_REVIEW.md) · [Estudo de assinaturas](audits/2026-10-25/SIGNING_PLAN.md). A auditoria prepara uma PR, sem publicar uma release.
