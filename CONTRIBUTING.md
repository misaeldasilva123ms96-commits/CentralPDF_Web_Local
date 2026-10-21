# Contribuir com o Central PDF & Imagem

[README](README.md) · [Documentação](docs/README.md) · [Estrutura](docs/reference/ESTRUTURA_DO_PROJETO.md)

## Escolha a superfície correta

| Superfície | Entrada | Situação |
| --- | --- | --- |
| Aplicação publicada e pacote Windows | `index.html`, `assets/`, `vendor/` | Produto atual com 34 ferramentas |
| Migração da interface | `app/` | React/TypeScript, build separado e catálogo parcial |
| Servidor local | `server/` | Servidor HTTP Go em loopback; não é um backend de processamento de documentos |

Use uma branch a partir da `main` atualizada. Preserve mudanças não relacionadas, leia [AGENTS.md](AGENTS.md) antes de criar worktrees e abra uma PR com problema, comportamento esperado e evidência de validação. Não confunda abrir PR com autorização para integrar, publicar site ou criar release.

## Ambiente

A CI usa **Node.js 22**, **Python 3.12**, **Go 1.26.5** e Chromium do Playwright. `server/go.mod` declara Go 1.23, mas a comparação byte a byte do executável exige o compilador e as flags usados pela CI.

Da raiz, depois de clonar o repositório e entrar na pasta:

```bash
npm ci --prefix app
python -m pip install -r requirements-test.txt
python -m playwright install chromium
```

No Linux, `python -m playwright install --with-deps chromium` também prepara dependências de sistema quando o ambiente permite. Os testes do aplicativo da raiz usam bibliotecas de `app/node_modules`; instalar apenas os pacotes Python não basta.

## Executar

### Aplicação publicada

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8765/`. O servidor Python serve os arquivos; não prepara motores nem reproduz os cabeçalhos de segurança específicos do Go. No Windows, o inicializador recomendado é `ABRIR_CENTRAL_PDF.bat`.

Para preparar os motores pela raiz, com PowerShell e acesso à rede:

```powershell
.\scripts\prepare-offline.ps1
```

### Migração React

```bash
npm --prefix app run dev -- --host 127.0.0.1
```

Abra a URL exibida pelo Vite. Consulte [app/README.md](app/README.md) para catálogo, limites e estrutura real. O build React não substitui o site da raiz automaticamente.

## Validar uma mudança

Comece pelos testes ligados ao comportamento alterado. Para documentação, revise fatos no código, links, referências de versão e os testes documentais existentes. Não é necessário criar testes que apenas repitam a redação.

Os comandos abaixo reproduzem as famílias de verificação da CI. O bloco completo usa **Bash**; no PowerShell, execute os comandos individuais ou use o workflow GitHub para a execução integral.

```bash
set -euo pipefail

find assets/js -maxdepth 1 -name '*.js' -print0 | sort -z | xargs -0 -n1 node --check
node --check sw.js
find tests -maxdepth 1 -name '*.js' -print0 | sort -z | xargs -0 -n1 node
find tests -maxdepth 1 -name '*.test.py' -print0 | sort -z | xargs -0 -n1 python
python tests/static_integrity.py

(cd server && go test ./... && go vet ./...)
npm --prefix app run typecheck
npm --prefix app test
npm --prefix app run build

node scripts/extract-tool-catalog.mjs
git diff --exit-code -- docs/architecture/_CATALOGO_RAW.md
git diff --check
```

O catálogo gerado deve acompanhar alterações intencionais de `toolConfig`. Não edite `_CATALOGO_RAW.md` manualmente. Relatórios antigos podem citar totais menores de testes; o workflow e os arquivos atuais são a referência.

### Integridade do executável

No ambiente de compilação reproduzível, use **Go 1.26.5** e as mesmas flags da CI:

```bash
sha256sum -c checksums.sha256
(cd server && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build \
  -trimpath -buildvcs=false -ldflags="-s -w -buildid=" \
  -o ../CentralPDF_Local_Server.ci.exe .)
cmp --silent CentralPDF_Local_Server.exe CentralPDF_Local_Server.ci.exe
```

O `.ci.exe` é artefato temporário ignorado pelo Git. Mudanças no servidor que alterem o binário exigem reconstrução do executável versionado e atualização de `checksums.sha256`, com revisão. Uma compilação em outro Go não prova a reprodução exigida.

## Mudanças de interface e cache

- Teste o fluxo real com documento sintético, desktop e viewport móvel. Confira foco, teclado/toque, temas, console e arquivo exportado quando aplicável.
- Mantenha espaços e acentos nos downloads, com tratamento de caracteres inválidos para arquivo.
- Preserve o processamento local e a diferença entre cobertura visual e remoção confidencial.
- Ao alterar recursos entregues ao navegador, confira URLs com `?v=` em `index.html` e `sw.js`, incremente o cache quando necessário e ajuste os testes correspondentes.
- Não incremente versão/cache por uma mudança apenas documental.

## Privacidade e diagnósticos

Use exemplos sintéticos ou anonimizados em testes, capturas e PRs. Revise logs antes de anexar: o diagnóstico local pode conter nomes e URLs técnicas. Testes de telemetria usam receptor local; não envie eventos de teste para o Sentry real automaticamente.

O destino é um **DSN público**, não um token administrativo. Documentos, nomes e texto digitado não devem entrar nos eventos centrais. Alterações nessa fronteira devem manter consentimento e filtragem; consulte [diagnosticos-sentry.md](docs/diagnosticos-sentry.md). Para vulnerabilidades, siga [SECURITY.md](SECURITY.md).

## CI, publicação e releases

- **CI:** suítes JavaScript/Python/Go, integridade do executável, tipos/testes/build React e catálogo.
- **Pages:** prepara motores e monta somente `index.html`, `manifest.webmanifest`, `sw.js`, `assets/` e `vendor/`. Em PR, faz build sem deploy; em evento elegível da `main`, publica o site. O workflow Pages é separado da CI.
- **Release:** workflow por tag estável, com notas versionadas, pacote Windows, hashes e atestações. O ZIP não é atualizado a cada publicação do site.

Confira os workflows em [`.github/workflows/`](.github/workflows/) e as regras em [Governança](docs/github-governance.md). Quando uma mudança de documentação descreve recursos futuros, identifique-a como proposta; não apresente decisões de roadmap como funções já entregues.
