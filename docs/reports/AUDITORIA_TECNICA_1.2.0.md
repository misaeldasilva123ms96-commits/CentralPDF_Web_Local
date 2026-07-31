# Auditoria técnica — Central PDF & Imagem 1.2.0

Data: 2026-07-30

Origem analisada: `CentralPDF_Web_Local_v1.2.0.zip`
SHA-256 do ZIP: `e0cf8f34eb56254ad923745bdc281fa6931e38002ca462da334670e795d4f302`

## Escopo

- aplicação web local e seus 34 fluxos;
- carregamento de motores PDF, OCR, HEIC e TIFF;
- preparação e cache offline;
- servidor HTTP Go e executável Windows;
- testes JavaScript, Python/Playwright e Go;
- documentação, CI e proveniência do binário.

## Achados corrigidos

### 1. Execução automática de código remoto — alta

A versão recebida carregava motores de CDN automaticamente quando os arquivos locais não estavam presentes. O comportamento foi substituído por consentimento persistente e explícito. PDF.js, pdf-lib, Worker PDF, LibPDF, Tesseract, UTIF e heic2any respeitam o mesmo controle.

### 2. Rota local de desligamento sem autenticação — média

O servidor reintroduzia `POST /__shutdown`. Mesmo limitado a `127.0.0.1`, qualquer página aberta no navegador poderia tentar atingir a porta local. A rota foi removida e `/__health` passou a aceitar apenas GET.

### 3. LibPDF “offline” incompleto — média

O arquivo baixado do esm.sh tinha 251 bytes e imports absolutos adicionais, portanto não funcionava como pacote autossuficiente. Ele foi substituído por um bundle local completo de `@libpdf/core` 0.4.1, com dependências incorporadas e avisos de licença preservados. Testes estático e de importação validam o artefato.

### 4. Downloads offline sem integridade criptográfica — média

O instalador verificava somente tamanho mínimo. Agora cada dependência tem versão e SHA-256 fixos, é baixada para arquivo parcial e só substitui o destino após tamanho e hash válidos.

### 5. Binário sem vínculo verificável com o fonte — média

O servidor foi recompilado com Go 1.26.5 usando build reproduzível. `checksums.sha256` registra o artefato, e a CI recompila para Windows e exige igualdade byte a byte com o executável commitado.

### 6. Testes presos a `/usr/bin/chromium` — baixa

Os testes Playwright passaram a usar o Chromium gerenciado pelo próprio Playwright, permitindo execução consistente no Windows e no GitHub Actions.

## Hardening adicional

- Content Security Policy limita scripts, Workers e conexões aos fornecedores documentados;
- Permissions Policy desabilita câmera, microfone, geolocalização, pagamentos e USB;
- cabeçalhos `nosniff`, `SAMEORIGIN` e `no-referrer` foram preservados;
- não foram encontrados segredos ou chaves privadas no código-fonte;
- o servidor continua limitado a uma porta aleatória de `127.0.0.1` e não possui rota de upload.

## Risco residual

O executável não possui assinatura Authenticode porque não há certificado de assinatura de código configurado. Releases futuras passam a publicar automaticamente o pacote offline, hashes SHA-256 e atestações Sigstore vinculadas ao workflow e ao commit. Essa procedência verificável melhora a segurança da distribuição, mas o Windows poderá continuar mostrando alerta de editor desconhecido. Para eliminar esse risco residual, ainda será necessário assinar o `.exe` com certificado reconhecido e timestamp público.

Motores opcionais continuam sendo software de terceiros. O instalador fixa versões e hashes, mas qualquer atualização futura deve revisar licença, vulnerabilidades, origem e novo SHA-256 antes de alterar o manifesto.

## Limitação da ferramenta de auditoria

O workspace integrado do Codex Security não iniciou por um erro interno de decodificação no Windows (`UnicodeDecodeError` durante a leitura dos metadados Git). A revisão deste relatório foi executada localmente por inventário, análise de fontes, busca de padrões sensíveis e testes; ela não deve ser apresentada como resultado gerado pelo plugin.
