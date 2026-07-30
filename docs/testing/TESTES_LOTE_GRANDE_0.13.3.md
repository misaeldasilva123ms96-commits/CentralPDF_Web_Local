# Testes - união de lote grande 0.13.3

1. Abra **Juntar PDFs**.
2. Adicione vários PDFs totalizando mais de 250 páginas.
3. Confirme o aviso **Modo para lote grande ativado**.
4. Reordene algumas páginas e clique em **Juntar PDFs**.
5. Observe o progresso `Unindo páginas X de Y`.
6. Confirme que o download inicia sem o erro `A origem da página 1 não está disponível`.
7. Abra o PDF final e confira primeira, última e páginas próximas às mudanças de ordem.

## Teste de recuperação de vínculo
- O sistema deve tentar religar páginas ao `File` original antes de exportar.
- Caso um arquivo realmente não exista mais, a mensagem deve identificar a página e o nome do PDF.
