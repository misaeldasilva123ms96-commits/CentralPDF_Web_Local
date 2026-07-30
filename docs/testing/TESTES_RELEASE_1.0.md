# Plano de testes — release 1.0

## Critérios de release

1. Registrar exatamente 34 ferramentas.
2. Carregar todos os scripts sem erro de sintaxe.
3. Preservar os testes das versões 0.7 a 0.20.
4. Validar a união simulada de 600 páginas.
5. Validar o primeiro acesso, acessibilidade, atalhos e autodiagnóstico.
6. Validar manifesto, service worker e endpoint `/__health` como 1.0.0.
7. Validar o executável Windows x86-64.
8. Verificar integridade do ZIP.

## Testes manuais recomendados no computador do usuário

- abrir pelo BAT e confirmar a versão 1.0;
- executar a preparação offline;
- processar um PDF pequeno em Organizar, OCR e Converter;
- salvar e restaurar um projeto `.cpdf`;
- testar texto ampliado, contraste e navegação por teclado;
- baixar o diagnóstico pelo botão Qualidade;
- testar um lote real grande antes de descartar a versão 0.20 de backup.
