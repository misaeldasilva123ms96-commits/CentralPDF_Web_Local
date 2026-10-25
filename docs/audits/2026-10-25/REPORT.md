# Auditoria e estabilização — Central PDF & Imagem

**Data:** 25/10/2026. **PR Draft:** [#58](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/58). **Branch:** `fix/centralpdf-stabilization-audit-20261024`.

[Estado inicial](INITIAL.md) · [34 ferramentas](TOOLS.md) · [Segurança](SECURITY_REVIEW.md) · [Release](RELEASE_PLAN.md) · [Governança](GOVERNANCE.md) · [Assinaturas](SIGNING_PLAN.md)

## Resumo executivo

A base foi confirmada em `a4c11e4aa88d68d47daa78b5e781524112d2a412`, commit de 21/10/2026 às 11:36:25 -03:00, sem commits posteriores ao HEAD citado no pedido. Não havia issues ou PRs abertas. A release mais recente era v2.0.1, de 17/08/2026, com a `main` 78 commits adiante. CI e Pages da base estavam verdes; foram executadas verificações novas.

Foram corrigidos problemas reproduzidos de recarga offline, acesso às alças de imagens compactas e ausência de aviso antes de modificar PDFs com estruturas de assinatura. Ferramentas de desenvolvimento afetadas foram atualizadas, e o executável foi recompilado com o patch de segurança Go 1.26.10, mantendo o número do produto 2.0.1 e a reprodução byte a byte.

A validação funcional executou **34/34 ferramentas com motores reais**, mais casos específicos de compressão/OCR. O editor passou em Chromium e Firefox com desktop/tablet/celular emulados; as matrizes de transformação do PDF exportado foram conferidas. Telemetria passou em testes adversariais sem envio ao Sentry real. O site publicado foi carregado separadamente, sem ser alterado por esta auditoria.

**Prontidão:** trabalho preparado para revisão em PR. Não é aprovação automática de release: Windows físico, WebKit/Safari, leitores de tela, configuração privada do Sentry e decisões administrativas/comerciais permanecem pendentes. Não há falha crítica/alta confirmada introduzida pelas mudanças nos casos executados; isso não é garantia de ausência de vulnerabilidades ou regressões fora do corpus.

## Achados e resultado

As prioridades abaixo são operacionais da auditoria, não pontuação CVSS. Avisos de dependências mantêm a severidade e o contexto de exposição próprios.

| ID | Severidade | Problema e evidência | Correção | Resultado |
| --- | --- | --- | --- | --- |
| F01 | P0 / alta de confiabilidade | `offline-marker-cache.test.py` falhava com `Failed to fetch` após desligar rede; marcador não era cacheado | Marcador no core; rede primeiro com persistência/fallback; cache pages-39 | Corrigido; teste real de SW e recarga offline com união de 5 páginas passaram |
| F02 | Alta de manutenção | `npm audit`: 5 pacotes, incluindo avisos críticos na cadeia Vitest/tinypool; sem prova de exploração do site estático | Vite 7.3.7, Vitest 4.1.12, tipos Node explícitos e lockfile | Zero avisos conhecidos na consulta completa/produção; 240 testes, tipos e build passaram |
| F03 | Alta de manutenção | Análise binária do Go 1.26.5 apontou 22 avisos de símbolos da biblioteca padrão; não prova alcançabilidade de todos no servidor loopback | Compilador 1.26.10 na mesma linha, binário/checksum novos e scanner na CI | Testes Go, vet, reprodução byte a byte e govulncheck sem avisos no binário novo |
| F04 | P1 / usabilidade | Playwright não conseguia atingir alça lateral: área ampliada de canto interceptava o ponteiro na imagem compacta | Expansão das áreas de toque para fora da imagem | Corrigido; arraste, redimensionamento, rotação e exportação em Chromium/Firefox passaram |
| F05 | P1 / integridade documental | Fixture com CMS real autoassinado não gerava aviso na pré-verificação de metadados | Detecção estrutural em ingestão e aviso nas operações modificadoras | Corrigido; estrutura detectada e hash do original preservado. Sem validar confiança/ITI |
| F06 | P1 / cobertura | Registro de 34 módulos e presença de poucos arquivos não comprovavam funcionamento e pacote completo | Harness de 34 exportações reais, recarga offline, editor entre navegadores e gate de assets/Workers/hashes | Corrigido como cobertura; novos gates executam antes do upload Pages |
| F07 | P1 / governança | Ruleset exige `test` e `build`, mas não `app-2-0` | Procedimento revisável para incluir check e atualizar verificador em conjunto | Pendente de aprovação administrativa; regra não alterada |
| F08 | P1 / privacidade externa | Não há acesso ao projeto privado Sentry para conferir IP, retenção e acesso | Checklist verificável e limites explícitos; payload testado contra receptor local | Código/testes verificados; painel pendente do responsável |
| F09 | P2 / distribuição | Site e ZIP v2.0.1 têm commits diferentes | Proposta 2.0.2, notas, instalação, hashes e rollback | Preparado, sem bump generalizado, tag ou publicação |
| F10 | P2 / manutenção | Ausência de CI periódico/dependências e referências mutáveis de Actions | Cron semanal só de CI, Dependabot e Actions fixadas por SHA das tags resolvidas | Configuração testada em arquivos; ativação periódica depende da integração à branch padrão |
| F11 | P2 / plataforma | WebKit sem bibliotecas nativas; sem Windows físico/leitor de tela | Escopo emulado explícito e gates manuais de release | Não testado nessas plataformas; não contado como aprovado |
| F12 | P2 / produto | Sem PAdES/ICP-Brasil nem Authenticode; aviso existente de chunks React >500 kB | Estudo técnico, custos/requisitos e limites; sem provedores, certificados ou refatoração cosmética | Planos preparados; capacidades não implementadas nem anunciadas como prontas |

## Evidências e contagens

| Verificação | Resultado confirmado |
| --- | --- |
| Base local | 89 comandos passaram antes das correções, incluindo suíte mista existente e 240 testes React |
| Suíte final local | **93 comandos passaram, 0 falharam, 0 ignorados** no runner final; [recibos com tempo e exit code](validation-commands.json) |
| React | **240 testes / 22 arquivos**, tipos e build; aviso de chunks grandes preservado, não ocultado |
| Ferramentas reais | **34 aprovadas, 0 falhas, 0 ignoradas** na configuração válida por ferramenta; [matriz](TOOLS.md), [dados e SHA-256](tool-matrix.json) |
| Casos extras | OCR pesquisável de página 90° com correção manual 270°; compressão reduz digitalização, preserva texto/caminho vetorial e mantém bytes quando não há redução |
| Editor real | **6 execuções de navegador/viewport**, abrangendo 24 combinações de modo/tema; [recibo](editor-browsers.json). Toque no Chromium; mouse/teclado nos dois navegadores |
| Offline | Reload após preparação/aquecimento do cache, Worker PDF.js real, extração de texto e exportação de união com 5 páginas; [recibo](offline.json) |
| Assets | 62 referências na raiz; 265 no pacote preparado, incluindo manifesto PDF.js completo, arquivos CSS/JS/Workers e hashes de motores |
| Gate negativo | 6 testes de cópia de pacote: arquivo ausente, imagem CSS ausente, caminho externo, revisões inconsistentes e Worker ausente, além do caso íntegro |
| Sentry | Testes Node adversariais e navegador/HTTP local; consentimento, revogação, quotas e ausência de conteúdo sensível nos payloads cobertos |
| Assinatura sintética | CMS e digest intactos na verificação independente local, com confiança de teste explícita; [recibo](signature-integrity.json). Não equivale a cadeia confiável/ITI |
| npm | Zero avisos conhecidos no [audit completo](npm-audit.json) e [produção](npm-production-audit.json); [licenças do lockfile](licenses.json) inventariadas |
| Go | Testes/vet com 1.26.10, duas compilações Windows iguais e [govulncheck do binário](go-binary-audit.txt) sem avisos |
| Site publicado | 58 recursos HTTP conferidos; Chromium carregou título e 34 ferramentas, sem pageerror, com consentimento falso/zero envios; [recibo](published.json) |

Os 93 itens são **comandos/suítes**, não uma contagem inventada de cada assert interno. Os 240 testes React estão dentro desse total de comandos. As 34 ferramentas e os seis cenários de viewport são gates adicionais. Testes antigos com colaboradores simulados continuam sendo unidade/contrato e não foram tratados como prova de motor real.

Na primeira passagem geral após as mudanças, duas expectativas de URL antiga (`ui14`/`ingest1`) falharam. As expectativas foram atualizadas para os assets realmente entregues, mantendo os testes de migração de cache; a nova passagem integral terminou 93/93. As recusas exploratórias de extração sem intervalo e desbloqueio sem autorização administrativa foram mantidas como validações corretas, não contornadas.

## Commits, CI e reprodução

Base: `a4c11e4aa88d68d47daa78b5e781524112d2a412`. O código/artefato do servidor validado nesta etapa está em `e14fd19`; os commits seguintes consolidam os casos extras e a documentação. O SHA final da branch e o estado da CI do mesmo SHA ficam registrados na descrição da [PR #58](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/58), evitando inserir um hash autorreferente neste arquivo.

- CI da base, consultada: [39618321890](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/runs/39618321890); Pages da base: [39618321946](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/runs/39618321946).
- CI do código `e14fd19`, aprovada: [40223272619](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/runs/40223272619), incluindo testes e build React.
- Pages do código `e14fd19`, aprovada: [40223272618](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/runs/40223272618), com gates reais e deploy ignorado por ser PR.
- O workflow conserva JSONs e capturas sintéticas no artefato **stabilization-evidence**, por 14 dias. CodeRabbit não fez revisão automática porque a PR é Draft; isso não foi apresentado como revisão aprovada.

Com motores preparados (`scripts/prepare-offline.ps1`), além dos comandos em [CONTRIBUTING.md](../../../CONTRIBUTING.md):

```bash
python scripts/verify-static-site.py --require-engines
python tests/tool-regression-real.py --site . --report /tmp/centralpdf-evidence/tools.json
python tests/offline-tools-real.py --site . --report /tmp/centralpdf-evidence/offline.json
python tests/editor-cross-browser-real.py --site . --report /tmp/centralpdf-evidence/editor.json
node tests/diagnostics-telemetry.test.js
python tests/diagnostics-telemetry.test.py
python tests/signature-warning.test.py
python tests/offline-marker-cache.test.py
```

Para os testes entre navegadores, prepare Chromium e Firefox com Playwright. No ambiente local Linux sem PowerShell, o staging foi montado com arquivos validados pelos hashes do mesmo instalador e recursos PDF.js compatíveis; o workflow Pages executa o instalador PowerShell real antes dos gates. Não se declarou teste nativo do instalador Windows.

O executável final desta auditoria tem SHA-256 `215032b92ab256e87df70c13dabf2ea8dc1253c565f1f5712b79c689c7c019dd`. Compare com o arquivo versionado `checksums.sha256`. A versão do produto permanece 2.0.1; nenhum artefato 2.0.2 foi publicado.

## Arquivos e limites de escopo

- Runtime: `sw.js`, `index.html`, `assets/js/pdf-ingest.js`, `assets/js/app.js`, `assets/js/tool-quality-1.2.0.js` e `assets/css/workspace-modernization.css`.
- Ferramentas de desenvolvimento/build: `app/package.json`, lockfile, tipos TypeScript, workflows, Dependabot, executável e checksum.
- Testes: regressões de marcador, assinatura, pacote estático, cadeia de CI, privacidade, 34 ferramentas, offline real, editor entre navegadores e expectativas de entrega de assets.
- Documentação: relatório inicial/final, matriz/recibos, checklist Sentry/governança, planos de assinatura/release, notas propostas e referências atuais. A lista integral por commit está na aba Files changed da PR.

Não foram removidas ferramentas, alterados documentos reais, adicionados serviços pagos obrigatórios, integrados provedores de assinatura, adquiridos certificados, inseridos segredos, alteradas regras administrativas, criadas tags ou publicadas releases. A `main` não recebeu commits desta execução.

O payload Sentry é restrito, mas IP/cabeçalhos da conexão são visíveis ao receptor; configurações externas exigem o responsável. Detecção de assinatura é estrutural e pode não cobrir todos os documentos, inclusive cópias restauradas/criptografadas; não prova ausência/validade. Conversões, OCR e análises permanecem assistivas. Offline do site exige recursos previamente carregados: o teste não promete todos os idiomas/funções na primeira visita. Os testes de viewport são emulação Linux, não dispositivos físicos.

## Pendências classificadas

**Verificados:** estado inicial, catálogo, casos reais, cache/offline, privacidade no payload, dependências, build estático/React, Go e reprodução do binário.

**Corrigidos:** marcador offline, áreas das alças compactas, aviso de assinaturas e componentes de desenvolvimento/compilador afetados; cobertura/gates ampliados.

**Não testados:** Windows físico/SmartScreen, WebKit/Safari, aparelhos físicos, leitores de tela, provedores comerciais, trust chain ICP-Brasil/ITI e painel privado Sentry.

**Pendentes de aprovação:** incluir `app-2-0` no ruleset, coordenar bump/tag/release 2.0.2, executar eventual homologação externa e contratar certificados/provedores. Os procedimentos concretos estão nos planos vinculados. A revisão pode prosseguir sem mudar essas configurações unilateralmente; uma decisão de publicação deve considerar os gates restantes.
