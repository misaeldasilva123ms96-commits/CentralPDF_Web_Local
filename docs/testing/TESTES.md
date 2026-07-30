# Validações da versão 0.6

- `node --check app.js`: aprovado.
- 15 cartões de ferramentas e 15 entradas na navegação lateral.
- Chaves `data-tool` sem duplicidade.
- Configuração correspondente para os 15 módulos.
- Handlers registrados para todos os módulos.
- ZIP inclui código, documentação e biblioteca JSZip local.

## Testes manuais necessários no Windows

Use cópias de documentos pequenos e verifique:

1. Compressão nos três níveis e comparação do tamanho.
2. PDF para JPG/PNG em 96, 150 e 300 DPI.
3. Recorte com margens pequenas antes de testar valores altos.
4. Limpeza de metadados verificando Propriedades do PDF.
5. Normalização em um PDF que abra com avisos ou incompatibilidade simples.
6. Extração de texto em PDF digital e em PDF escaneado.
7. Lote de rotação, marca-d’água e numeração.

A renderização completa não foi automatizada neste ambiente porque a política do navegador de teste bloqueou acesso a páginas locais. A sintaxe e a estrutura foram verificadas, mas os motores externos precisam ser carregados no computador de teste.

## Versão 0.16

Consulte `TESTES_OCR_0.16.md` para OCR de imagens, PDFs escaneados, documentos mistos, lotes, confiança e cancelamento.
