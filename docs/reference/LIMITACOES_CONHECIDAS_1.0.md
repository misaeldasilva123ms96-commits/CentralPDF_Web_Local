# Limitações conhecidas

Referência da aplicação estática, revisada em **29/10/2026**. [Documentação](../README.md) · [Editor](../guides/EDITOR_PDF.md)

## Documentos, fontes e aparência

- A edição de texto original é por trecho compatível, sem recomposição automática de parágrafos. Fontes incorporadas podem aceitar somente parte dos caracteres; o fallback informado para Helvetica também possui limites.
- Digitalizações não são texto visual editável. OCR pode criar uma camada pesquisável, mas exige revisão do reconhecimento. Texto em Form XObjects e algumas fontes/codificações não permitem seleção para substituição. [Compatibilidade detalhada](../editor-native-text.md).
- No modo de compatibilidade raster, a página-base pode ser achatada, com perda de conteúdo interativo e sem edição nativa de texto original.
- Conversões Office priorizam texto ou aparência conforme o modo, sem fidelidade perfeita de layouts, gráficos, macros, fórmulas e elementos flutuantes.
- Rasterização, OCR e reconstrução podem remover texto selecionável, links, formulários, anotações, camadas e assinaturas digitais. Confira o resultado em outro leitor.

## Segurança e validade

- **Cobrir** visualmente não equivale a remover conteúdo. A censura definitiva reconstrói páginas afetadas; valide visualmente e tente pesquisar/copiar o que deveria ter sido removido.
- A assinatura visual não equivale a assinatura digital ICP-Brasil. Editar documentos assinados pode invalidar assinaturas existentes.
- Preparar para arquivamento não certifica conformidade PDF/A.
- Comparação, auditoria, resumos, classificação e extração estruturada são assistivos e não substituem revisão humana.
- Recuperação de PDF não garante reconstrução completa de qualquer arquivo corrompido. Trabalhe em cópias.

## Navegador e continuidade

- `file://` não oferece as condições necessárias de HTTP para todos os Workers, módulos e recursos offline.
- Capacidade de memória, CPU, quota de armazenamento e políticas corporativas variam. PDFs grandes podem exigir lotes menores; não há garantia universal de tamanho suportado.
- O cancelamento é cooperativo, pode aguardar a etapa interna atual e não recolhe downloads já iniciados.
- Recuperação automática possui limite de 80 MiB de entradas e depende do armazenamento do navegador. Resultados ficam na memória da aba. Use o `.cpdf` manual para trabalhos importantes; ele contém cópias dos documentos.
- Origem, porta e perfil isolam dados locais. O cache do site não garante todas as ferramentas offline após uma única visita. [Preparação e projetos](../guides/OFFLINE_E_PROJETOS.md).
- Políticas corporativas, antivírus e SmartScreen podem bloquear o executável sem assinatura Authenticode; confira hashes e procedência da distribuição.

## Diagnósticos e distribuições

- Logs locais representam apenas o navegador/origem atual. O Sentry recebe categorias técnicas somente de instalações conectadas com compartilhamento ativado; quotas, bloqueadores e falhas de rede impedem cobertura total. Não há contagem de usuários únicos nem entrega garantida. [Diagnósticos](../diagnosticos-sentry.md).
- O site e o ZIP Windows são distribuídos por fluxos separados. O mesmo número de versão pode corresponder a commits diferentes.
- A migração React não implementa todas as 34 ferramentas e mantém recursos planejados/experimentais. [Estado de app/](../../app/README.md).
- Testes em Chromium com viewport móvel não comprovam uso em aparelhos físicos, Safari, Firefox ou conformidade integral de acessibilidade. [Acessibilidade](../guides/ACESSIBILIDADE_1.0.md).
