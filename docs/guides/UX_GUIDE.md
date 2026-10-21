# Guia de experiência

Referência da aplicação publicada, revisada em **21/10/2026**. [Documentação](../README.md) · [Editor](EDITOR_PDF.md)

## Princípios

1. **Contexto antes da ação:** cada ferramenta apresenta entrada, saída, opções e limitações pertinentes.
2. **Revelar conforme a necessidade:** opções complexas são recolhíveis e ficam próximas do trabalho.
3. **Continuidade:** arquivos, configurações, processamento e resultado compõem um fluxo; é possível continuar ou iniciar outra tarefa após baixar.
4. **Conferência:** prévias, comparação e histórico ajudam a revisar antes da exportação.
5. **Privacidade compreensível:** processamento documental local e compartilhamento técnico opcional são apresentados separadamente.

## Aplicação no editor

- Texto adicionado começa com caixa compacta e barra contextual junto à página.
- Texto original usa seleção de trechos compatíveis, prévia durante a digitação e confirmação explícita.
- Imagens mantêm arraste e alças, com ações recolhíveis acima da página para excluir, duplicar e ajustar sem teclado. Não usam painel suspenso sobre o documento.
- A barra lateral direita fica dedicada ao documento e à saída; não é necessária para formatar o texto selecionado ou abrir as ações da imagem.
- Miniaturas sob demanda, controles de seleção em lote e substituição com prévia ajudam a organizar sem alterar páginas por engano.

## Conferência por família

| Família | Ponto de atenção |
| --- | --- |
| Organizar | Ordem, seleção e total de páginas; capas representam documentos inteiros. |
| Editar | Fonte, posição, histórico e cópia exportada; cobertura não é censura segura. |
| Converter | Formato, qualidade e preservação de recursos; rasterização perde texto selecionável. |
| Segurança | Estado experimental quando aplicável; permissões, limites e validação do resultado. |
| Diagnóstico | Distinguir logs locais de eventos opcionais recebidos no Sentry. |

## Teclado, toque e acessibilidade

Busca por `Ctrl+K`, foco visível, botões nomeados, diálogos e ações alternativas ao arraste devem ser preservados. No editor, mantenha Desfazer/Refazer, duplicar e excluir acessíveis conforme o contexto; botões por toque não devem depender de atalhos físicos.

Teste desktop e viewport móvel, temas claro/escuro, foco, rolagem, controles e a saída real. Uma simulação no Chromium não comprova conformidade integral de acessibilidade nem valida todos os dispositivos. Consulte [Acessibilidade](ACESSIBILIDADE_1.0.md) e [Contribuir](../../CONTRIBUTING.md).
