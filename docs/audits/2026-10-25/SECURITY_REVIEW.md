# Privacidade e segurança — auditoria de 25/10/2026

## Fronteira e evidência

Revisão direta do código, fluxos e testes; o servidor do serviço Deep Security Scan não estava disponível, e não há relatório gerado por esse serviço. Não se trata de uma prova de ausência de vulnerabilidades.

### Sentry

`diagnostics-telemetry.js` não instala SDK. Usa transporte Envelope explícito, campos gerados e dicionários fechados. Não envia mensagens/stack traces brutos, PDFs, imagens, nomes, texto digitado, caminhos, histórico local, cookies da aplicação ou identidade persistente. O DSN no site é público e não concede acesso administrativo.

A autorização é por navegador/origem, versão da política e destino. Padrão desligado; habilitar não reapresenta logs antigos. Revogação descarta a fila e aborta pedidos, com propagação por storage entre abas da origem. Não se pode recolher um evento já recebido.

A fila possui 20 grupos, TTL de 15 minutos, até 30 envios por carga, 10 tentativas/minuto, três tentativas limitadas e timeout de 8 segundos. Retry-After e X-Sentry-Rate-Limits são respeitados. Offline não faz pedido, e falhas do receptor não interrompem operações PDF. Campos fixos e testes mantêm o envelope gerado abaixo de 2 KiB nos casos adversariais, inclusive entrada de 1 MiB; não há anexos arbitrários, replay, tracing ou breadcrumbs.

Evidências executadas:

- `node tests/diagnostics-telemetry.test.js`: CPF, CNPJ, nomes, e-mail artificial, caminhos Windows/Linux, Bearer token, cookies, senha, chave de API e marcador de chave privada sintéticos; antes/depois/revogação, pedidos limitados, objetos malformados e consentimento inválido.
- `python tests/diagnostics-telemetry.test.py`: dois contextos independentes, servidor HTTP local que recebe o envelope, opt-in, revogação entre abas, offline, 429, interface móvel e conferência de cabeçalhos. **Nenhum evento foi enviado ao Sentry real.**
- Carregamento do site publicado: consentimento falso, zero envios e zero erros de execução naquela visita isolada. Não é acesso ao painel nem comprovação dos ajustes do serviço.

O critério “sem informação sensível” foi verificado no payload de aplicação dos casos cobertos. O receptor e o provedor de hospedagem observam IP e metadados normais da conexão; não há promessa de anonimato absoluto ou cobertura de todos os erros. Logs locais continuam podendo conter nomes e mensagens, e devem ser revisados antes de compartilhamento manual.

### Checklist externo — não verificado sem acesso ao painel

O responsável deve registrar data e evidência dos seguintes itens, sem colocar tokens ou dados reais nesta PR:

- [ ] Projeto/organização, DSN, região e responsáveis corretos.
- [ ] Projeto privado; membros e permissões mínimos; MFA e contas de suporte revisados.
- [ ] Retenção e procedimento de exclusão documentados; quotas e alertas de consumo adequados ao plano.
- [ ] Armazenamento/enriquecimento de IP desabilitado quando oferecido; conferir o evento efetivamente recebido, além da opção de interface.
- [ ] Limpeza de dados sensíveis ativa; verificar campos recebidos no projeto e integrações downstream.
- [ ] Replay, tracing, breadcrumbs e captura automática não adicionados por configuração/integração externa.
- [ ] Diagnóstico sintético enviado apenas com autorização do responsável; confirmar agrupamento e destino. Não usar CPF, nomes ou documentos reais.
- [ ] Revogação, exclusão central e resposta a incidente conhecidos; não confundir limpar logs locais com apagar eventos centrais.

Não foram criadas contas, alteradas configurações privadas, convidadas pessoas ou adicionados segredos.

## Dependências, motores e CI

A captura inicial de `npm audit` apontou cinco pacotes: Vite, Vitest, @vitest/mocker, tinypool e source-map-js, na cadeia de desenvolvimento. Os avisos de severidade crítica em tinypool/Vitest não comprovam exploração do site estático: o servidor de desenvolvimento e as condições de protótipos/mocks não integram o site Pages. Ainda assim, exigem manutenção.

Atualização restrita: Vite 7.3.7, Vitest 4.1.12 e tipos Node explícitos; lockfile re-resolvido para remover a cadeia afetada. `npm audit` completo e de produção ficaram sem avisos conhecidos na consulta desta auditoria. Isso é temporal, não garantia futura. Os 240 testes, tipos e build foram executados. Nenhum motor PDF foi atualizado em massa.

O executável original compilado com Go 1.26.5 apresentou **22 avisos de símbolos da biblioteca padrão** na análise binária `govulncheck`. A análise binária não estabelece alcançabilidade/exploração por requisições reais; o servidor é HTTP em loopback. O patch **Go 1.26.10** foi selecionado na mesma linha de versão, baixado de go.dev com SHA-256 conferido, fixado em CI/release e usado para recompilar o executável. O novo checksum e a comparação byte a byte integram a verificação. O resultado final do scanner fica registrado no relatório desta auditoria, sem confundir a ausência de avisos da base consultada com prova de segurança universal. A CI também passa a verificar o executável com govulncheck v1.9.0.

Os motores preparados foram comparados aos hashes do instalador; PDF.js API/Worker e manifesto completo de recursos também foram conferidos. `prepare-offline.ps1` continua validando os hashes de download e o digest de recursos PDF.js. O gate novo confere arquivos locais, revisões e hashes no pacote que será publicado.

Actions foram fixadas aos commits resolvidos das tags existentes. Dependabot e CI semanal fazem manutenção visível; não há auto-merge, aquisição de serviços nem deploy por cron adicionado. Licenças e versões dos motores permanecem conforme [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md); componentes de desenvolvimento alterados seguem metadados do lockfile. Não foi copiado código de terceiros para implementar funcionalidades.

## Assinaturas e integridade

A fixture sintética tem assinatura CMS real com certificado autoassinado de teste; verificação local confirmou integridade do documento e da assinatura CMS, com confiança no certificado definida apenas para esse teste. A chave temporária/PKCS#12 não integra o repositório e foi removida após a geração.

A detecção nova usa estruturas ByteRange/Contents e campos Sig, com aviso antes de operações modificadoras. Não verifica cadeia ICP-Brasil, revogação, carimbo de tempo, ITI, permissões DocMDP ou validade jurídica. A ausência de detecção não certifica que não haja assinatura: estruturas ilegíveis, criptografia, sessões restauradas ou casos não reconhecidos exigem conferência no leitor. O original é preservado; uma nova cópia regravada pode invalidar ou perder assinaturas.

Plano para assinatura qualificada e Authenticode: [SIGNING_PLAN.md](SIGNING_PLAN.md).
