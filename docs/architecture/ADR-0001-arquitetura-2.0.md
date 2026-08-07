# ADR-0001: Arquitetura do CentralPDF 2.0

- **Status:** Aceito
- **Data:** 2026-08-07
- **Autor:** Misael (equipe CentralPDF)
- **Versão de referência do legado:** v1.2.1 (`5c08991`)

## Contexto

O CentralPDF atual (v1.2.1) é um aplicativo local-first de JS puro com 34 ferramentas
de PDF e imagem, processamento no navegador, modo offline, pacotes Windows e
distribuição reproduzível (checksums, atestações, GitHub Pages).

Este ADR aprova a fundação do CentralPDF 2.0 como plataforma documental modular,
privada, offline, com workflows visuais e execução no dispositivo. A direção não é
copiar projetos de referência (iLovePDF, PDFCraft, Stirling PDF), mas usar seus
padrões como referência de comportamento, com implementação independente e
respeitando as licenças (ver `THIRD_PARTY_NOTICES.md`).

## Decisões

### 1. Modelo híbrido local-first

O 2.0 adota quatro modos de execução:

| Modo | Descrição | Exemplos |
| --- | --- | --- |
| `BROWSER_NATIVE` | Rápido, direto no navegador | juntar, dividir, organizar, numerar, marcas d'água, metadados, proteger |
| `BROWSER_WASM` | Pesado, ainda no navegador | OCR, compressão avançada, edição, comparação visual, TIFF/HEIC |
| `LOCAL_COMPANION` | Motor local opcional (Go já existente em `server/`) | Office para PDF, PDF/A, Ghostscript, qpdf, OCRmyPDF, LibreOffice, assinatura digital |
| `REMOTE_OPTIONAL` | Apenas recursos impossíveis localmente | tradução avançada, IA, análise semântica — desligado por padrão, consentimento explícito |

O `LOCAL_COMPANION` deve escutar em `127.0.0.1`, porta aleatória, token por sessão, e
aceitar somente a origem do CentralPDF. Segue o padrão já implementado no `server/`.

### 2. Coexistência com o app vanilla

O novo app vive em `app/` (Vite + React + TypeScript) no mesmo repositório. O app
antigo permanece intacto na raiz e continua sendo o produto publicado no GitHub
Pages durante toda a migração. O 2.0 publica apenas quando tiver ferramentas
migradas (Fase 3+).

### 3. `LegacyToolAdapter` via iframe isolado

As 34 ferramentas atuais, acopladas ao DOM vanilla, são executadas dentro de um
iframe isolado que carrega o app antigo em modo `?embedded=1`. A comunicação usa
`postMessage` com ponte tipada sobre a API pública `window.CentralPDFApp`
(ver `assets/js/app.js:3468`). Nenhum global do legado vaza para o React.

### 4. Contrato único de ferramentas

Cada ferramenta do 2.0 implementa `ToolDefinition` (id, versão, categoria,
entradas/saídas, runtime suportado, schema de parâmetros, `validate`, `estimate`,
`execute`, capabilities). O runtime é decidido pelo `RuntimeRouter`, nunca dentro
da ferramenta.

### 5. Workflow Engine (Fase 4+)

O workflow é um DAG cuja execução passa pelo `ToolRegistry → RuntimeRouter`.
Cada nó é uma ferramenta registrada; não existe executor monolítico.

### 6. Fronteira de testes

Novo app: Vitest + Testing Library. Suíte legada (pytest + Playwright) permanece e
cobre o app antigo, incluindo o modo `embedded`.

## Não decisões (posteriores)

- Substituir o servidor Go: não agora; o empacotamento pode mudar depois da
  modularização sem afetar os motores.
- Adotar AGPL: não; código de referência do PDFCraft não será copiado.
- API local/a utomação: somente depois do kernel 2.0 (Fases 5+).

## Consequências

- Repositório ganha `app/` com build próprio e job no CI (`npm ci && npm run test && npm run build`).
- O app antigo só recebe um patch mínimo: modo `?embedded=1` e ponte `postMessage`, em arquivos novos separados.
- O `sw.js` não é registrado dentro do iframe embutido para evitar conflito de cache.
- Toda tool nova nasce com testes determinísticos (≥2 casos por ação).