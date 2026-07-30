# Testes da inteligência documental — 0.20

## Casos automatizados

1. Contrato classificado como contrato.
2. CND classificada a partir do conteúdo e do nome do arquivo.
3. Pergunta respondida com passagem e página de origem.
4. CNPJ extraído para CSV/JSON.
5. Expressão regular personalizada localizada.
6. Certidão positiva sinalizada como severidade alta.
7. Certidão com validade anterior ao pagamento sinalizada.
8. Regra de oito dias após lançamento aplicada.
9. Nome padronizado criado pelas variáveis do modelo.
10. Cópias renomeadas incluídas no ZIP quando solicitado.
11. Relatórios HTML, JSON e CSV presentes.
12. Interface das quatro ferramentas sem erro JavaScript.

## Teste manual recomendado

- Use uma cópia de contrato com texto selecionável.
- Faça uma pergunta cuja resposta esteja claramente em uma página.
- Confira se a passagem e a página estão corretas.
- Execute o mesmo teste em um PDF escaneado sem OCR e confirme o aviso.
- Aplique OCR e repita a análise.
- Teste a auditoria com contrato, nota fiscal e certidão.
- Revise todos os achados diretamente nos documentos originais.
