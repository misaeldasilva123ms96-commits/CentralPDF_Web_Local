# Investigação do carregamento de PDFs

## Arquitetura confirmada antes da implementação

- **GitHub Pages:** o workflow `.github/workflows/pages.yml` publica o `index.html`
  da raiz junto de `assets/`, `vendor/`, `sw.js` e o manifesto. Ele não publica
  `app/`.
- **Servidor local / EXE:** `server/main.go` serve a raiz do pacote por HTTP em
  `127.0.0.1`; `scripts/build-release.ps1` inclui o mesmo `index.html`, `assets/`,
  `vendor/` e `sw.js`. Portanto Pages e EXE usam o frontend JavaScript da raiz.
- **React / Vite:** `app/` é uma aplicação 2.x independente. A CI executa seus
  testes, typecheck e build, mas seu `dist/` não é consumido pelos workflows de
  Pages ou release atuais.

Existem, portanto, dois pipelines de ingestão independentes. Uma correção só em
`app/` não alcançaria os usuários de Pages/EXE; uma correção só na raiz deixaria
o frontend Vite com os mesmos riscos de validação e propriedade de buffers.

## Pipeline da raiz antes da correção

`FileList/DataTransfer -> isAccepted(nome/MIME) -> state.files -> renderFiles ->
thumbnail/metadata -> PDF.js ou pdf-lib -> ferramenta`

O primeiro ponto que lê bytes ocorre depois de o arquivo já estar em
`state.files`. Assim, um falso `.pdf`, um arquivo truncado ou uma falha de leitura
pode aparecer como carregado. Eventos de seleção e drop chamam `addFiles` sem uma
fila comum, permitindo que tarefas assíncronas concorram. O cache da miniatura é
separado do estado do arquivo e sua falha já produz placeholder, mas alguns erros
secundários são silenciados.

## Pipeline React/Vite antes da correção

`FileList/DataTransfer -> File.arrayBuffer -> FileInput no Zustand ->
PdfThumbnail/PDF.js -> ferramenta`

O componente serializa leituras e isola falhas de leitura por arquivo, mas aceita
qualquer conteúdo que chegue pelo input. A função `loadPdf` cria um `Uint8Array`
sobre o `ArrayBuffer` recebido; como PDF.js pode transferi-lo ao Worker, o buffer
persistido no Zustand não possui uma fronteira de propriedade segura. A thumbnail
faz uma cópia defensiva local, mas os demais chamadores não têm essa garantia.

## Causas raiz a provar e corrigir

1. Validação apenas por nome/MIME no runtime principal.
2. Arquivo promovido a “carregado” antes de leitura e parsing.
3. Ausência de fila única entre seleção e drag-and-drop no runtime principal.
4. Ausência de validação estrutural na ingestão Vite.
5. Contrato inseguro de propriedade de bytes em `app/src/tools/pdf-engine.ts`.
6. Classificação inconsistente de vazio, leitura, senha, corrupção e Worker.

## Invariantes da correção

- Click e drop devem usar exatamente a mesma função de ingestão.
- Cada item de um lote deve concluir independentemente.
- Apenas bytes próprios de uma operação podem ser transferidos para Workers.
- Thumbnail nunca decide se um arquivo permanece no workspace.
- MIME e extensão são pistas; a assinatura e o parser decidem PDFs candidatos.
- O conteúdo dos documentos nunca deve ser registrado em logs.

## Implementação e evidências

- A raiz ganhou uma fila única para click/drop, inspeção por item antes de alterar
  `state.files`, validação de assinatura e parsing, resultado parcial de lote e
  mensagens explícitas por arquivo.
- O app Vite agora aplica a mesma política antes de gravar no Zustand. Toda chamada
  a PDF.js recebe uma cópia descartável, impedindo que a transferência ao Worker
  destaque o `ArrayBuffer` persistido.
- Ferramentas de edição validam com `pdf-lib`; falha de thumbnail/PDF.js continua
  produzindo placeholder sem remover o arquivo. Diagnóstico/reparo preservam PDFs
  corrompidos, e desbloqueio/diagnóstico/reparo preservam PDFs protegidos com aviso.
- O service worker passou a `centralpdf-pages-20` e inclui o novo módulo de ingestão,
  mantendo Pages e EXE alinhados e disponíveis offline.

Verificações locais finais: 239 testes Vitest; typecheck e build Vite; todos os
testes JavaScript da raiz; toda a suíte Playwright/Python; lote real de 19 PDFs
válidos mais um falso PDF; buffer de 50 MB com transferência simulada; PDF real de
600 páginas; testes e `vet` do servidor Go; e checksum do EXE existente. Todos
passaram. Os casos de senha/corrupção usam erros determinísticos nos testes
unitários; a recuperação de PDF truncado usa fixture real. Não foi possível formar
uma matriz física com PDFs exportados por cada software de origem nem executar um
fixture único de 100–250 MB; esses casos permanecem como validação manual recomendada.
