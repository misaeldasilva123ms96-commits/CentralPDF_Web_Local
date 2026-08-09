# CentralPDF 2.0.0-alpha.1

[![CI](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/ci.yml/badge.svg)](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/ci.yml)
[![Pages](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml/badge.svg)](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml)

> **Pré-lançamento:** esta é a primeira versão alpha da nova arquitetura CentralPDF 2.0. Algumas ferramentas ainda estão experimentais ou planejadas.

Plataforma documental local-first desenvolvida com Vite, React e TypeScript. O processamento acontece no navegador; o servidor local apenas entrega os arquivos da aplicação no próprio computador, sem upload dos documentos.

**[Abrir o CentralPDF 2.0](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/)**

## Estado da versão

| Disponibilidade | Ferramentas |
| --- | --- |
| **Disponíveis** | Juntar PDFs; Extrair texto de PDF |
| **Experimentais** | PDF para imagens; Proteger PDF |
| **Planejada** | Comprimir PDF |

A base legada 1.2.1, com o inventário histórico de 34 ferramentas, permanece documentada em `docs/architecture/BASELINE_1.2.1.md`. O site e os novos Releases passam a usar o aplicativo localizado em `app/`.

## Uso online

1. Abra o site no GitHub Pages.
2. Escolha uma ferramenta disponível ou experimental.
3. Adicione os arquivos.
4. Revise os parâmetros e avisos.
5. Execute o processamento e baixe o resultado.

Os arquivos permanecem no dispositivo. O aplicativo não possui uma rota de upload documental.

## Uso local no Windows

1. Abra a página de [Releases](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/releases).
2. Baixe `CentralPDF_Web_Local_v2.0.0-alpha.1.zip`.
3. Extraia todo o conteúdo para uma pasta comum.
4. Execute `ABRIR_CENTRAL_PDF.bat`.

O pacote inclui o build do CentralPDF 2.0 e o servidor local `CentralPDF_Local_Server.exe`. O servidor escuta somente em `127.0.0.1` e abre o aplicativo no navegador padrão.

## Verificação dos artefatos

O Release inclui:

- `CentralPDF_Web_Local_v2.0.0-alpha.1.zip`;
- `CentralPDF_Local_Server.exe`;
- `CentralPDF_Web_Local_v2.0.0-alpha.1.sha256`.

No PowerShell, confira os hashes com:

```powershell
(Get-FileHash -Algorithm SHA256 .\CentralPDF_Local_Server.exe).Hash.ToLowerInvariant()
Get-Content .\CentralPDF_Web_Local_v2.0.0-alpha.1.sha256
```

Para verificar a procedência publicada pelo GitHub Actions:

```powershell
gh attestation verify .\CentralPDF_Web_Local_v2.0.0-alpha.1.zip --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local
gh attestation verify .\CentralPDF_Local_Server.exe --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local
```

## Desenvolvimento

### Aplicativo

```bash
cd app
npm ci
npm run typecheck
npm run test
npm run build
```

### Servidor local

```bash
cd server
go test ./...
go vet ./...
```

## Controle de versão

A versão deve permanecer sincronizada em:

- `app/package.json`;
- `app/src/App.tsx`;
- `server/main.go`.

A CI bloqueia divergências entre essas fontes. Após o merge manual de uma alteração versionada na `main`, o workflow de Release cria a tag correspondente, monta os artefatos, calcula os hashes e publica o Release. Versões com sufixo, como `2.0.0-alpha.1`, são publicadas como pré-lançamento.

## Privacidade e segurança

- Processamento local por padrão.
- Sem backend de upload de documentos.
- Ferramentas experimentais identificadas explicitamente.
- Cancelamento cooperativo e limpeza de recursos.
- Limite de saída para conversões rasterizadas.
- Checkout da CI sem persistência de credenciais.
- Artefatos produzidos em workflow e acompanhados de SHA-256 e atestação.

## Documentação

- `docs/architecture/ADR-0001-centralpdf-2.md` — arquitetura da CentralPDF 2.0.
- `docs/architecture/CATALOGO_FERRAMENTAS.md` — inventário e migração das ferramentas.
- `docs/architecture/MOTORES.md` — motores documentais.
- `docs/releases/2.0.0-alpha.1.md` — notas desta versão.
- `SECURITY.md` — política e controles de segurança.
- `THIRD_PARTY_NOTICES.md` — licenças e componentes de terceiros.
