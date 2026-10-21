# Referência das 34 ferramentas

Catálogo da aplicação estática da raiz, revisado em **21/10/2026**, versão declarada **2.0.1**. [Documentação](../README.md) · [Guia do usuário](../guides/GUIA_DO_USUARIO_1.0.md)

Os nomes resumidos abaixo facilitam a consulta; a interface pode usar títulos mais descritivos. A migração React tem um [catálogo próprio e parcial](../../app/README.md).

A aplicação possui 34 ferramentas:

1. Organizar PDF
2. Editar PDF
3. Juntar PDFs
4. Dividir PDF
5. Extrair páginas
6. Girar páginas
7. Marca-d’água
8. Numerar páginas
9. Imagens para PDF
10. Converter imagens
11. Comprimir PDF
12. PDF para imagens
13. Recortar PDF
14. Limpar metadados
15. Normalizar PDF
16. Extrair texto
17. OCR pesquisável
18. PDF para Office
19. Documentos para PDF
20. Extrair imagens do PDF
21. Preparar para arquivamento
22. Assistente documental
23. Extração estruturada
24. Auditoria documental
25. Classificar e renomear
26. Comparar PDFs
27. Censura definitiva
28. Criar formulário
29. Assinar e rubricar
30. Proteger PDF
31. Remover senha
32. Diagnosticar PDF
33. Recuperar PDF
34. Fixar formulários

## Escolher pela necessidade

| Necessidade | Exemplos | Conferência recomendada |
| --- | --- | --- |
| Organizar documentos | Organizar, juntar, dividir, extrair e girar | Ordem, intervalos e total de páginas. Em união por capas, cada capa representa o documento inteiro. |
| Editar conteúdo | Editor, marca-d’água, numeração e recorte | Fonte, posição, cortes e orientação. [Guia do editor](../guides/EDITOR_PDF.md). |
| Converter e otimizar | Imagens/PDF, compressão e Office | Qualidade visual, texto selecionável e fidelidade da conversão. |
| Reconhecer e extrair | OCR, texto e imagens | Erros de reconhecimento, ordem e resolução. |
| Analisar e revisar | Assistente, extração estruturada, auditoria, classificação e comparação | Evidências e revisão humana; as análises são locais e baseadas em regras/texto. |
| Proteger e finalizar | Senhas, censura, formulários, assinatura visual e arquivamento | Permissões, remoção efetiva de conteúdo e integridade; assinatura visual não é certificado e arquivamento não é certificação PDF/A. |
| Diagnosticar e recuperar | Diagnóstico, recuperação e fixação de formulários | Abrir a saída e verificar páginas, campos e aparência. Não há recuperação garantida para todo PDF. |

## Disponibilidade e implementação

O catálogo informa recursos disponíveis, experimentais e limitações conforme os motores e o documento. Ter uma ferramenta listada não significa garantia de fidelidade para todos os formatos. Consulte os avisos apresentados antes de processar e as [limitações conhecidas](LIMITACOES_CONHECIDAS_1.0.md).

A fonte do catálogo publicado é `toolConfig` em `assets/js/app.js`. O [inventário gerado](../architecture/_CATALOGO_RAW.md) relaciona identificadores, entradas, saídas e opções; pode ser atualizado por `node scripts/extract-tool-catalog.mjs`. O catálogo React é definido separadamente em `app/src/core/catalog.ts`.
