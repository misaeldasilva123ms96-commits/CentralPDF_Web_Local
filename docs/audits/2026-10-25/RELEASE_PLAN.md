# Plano de estabilização e release — proposta 2.1.0

**Proposta, sem tag nem publicação.** O código continua declarando 2.0.1. A versão final depende da revisão e aprovação do responsável.

## Escolha da versão

A proposta **2.1.0** consolida funcionalidades compatíveis acumuladas desde a tag v2.0.1, como diagnóstico central opcional, evolução da edição original e substituição de páginas, além das correções desta auditoria. Pela convenção semântica, funcionalidades novas compatíveis justificam incremento minor. A migração React continua separada; não se anuncia migração completa nem mudança incompatível de versão maior.

A tag v2.0.1 foi publicada em 17/08/2026; a base da auditoria tem 78 commits posteriores. Mesmo com 2.0.1 na interface, o site já inclui melhorias ausentes do ZIP daquela release. Uma nova tag deverá apontar para o commit aprovado que inclua essas melhorias e a atualização coordenada da versão.

## Preparação após aprovação

1. Integrar a PR somente pelo responsável, após os checks e conversas resolvidos. Nenhuma regra de proteção foi alterada por esta auditoria.
2. Atualizar de modo coordenado README, manifesto, interface estática, configuração de versão, React/package-lock, diagnóstico, cache, servidor e testes de sincronização. Usar `scripts/build-release.ps1` como lista verificável; não substituir números de versões históricas.
3. Recompilar o executável com a versão de Go fixada na CI e as flags reproduzíveis; atualizar `checksums.sha256`. Não assinar Authenticode com uma chave improvisada.
4. Preparar motores com `scripts/prepare-offline.ps1`, verificar hashes, grafo de assets, manifesto PDF.js completo e as regressões reais da publicação.
5. Executar a suíte geral e confirmar o pacote extraído em Windows, com trabalho online/offline, download, fechamento do servidor e reabertura de projeto.
6. Revisar privacidade, retenção/IP/acesso do Sentry no painel externo; conferir quota do plano sem enviar documentos. Ver checklist em [SECURITY_REVIEW.md](SECURITY_REVIEW.md).
7. Revisar as [notas propostas](../../releases/2.1.0.md), comparar `v2.0.1` com o commit candidato, criar a tag e publicar **somente com autorização explícita**.

## Artefatos e instalação

A release deve produzir `CentralPDF_Web_Local_v2.1.0.zip`, `CentralPDF_Local_Server.exe` e `CentralPDF_Web_Local_v2.1.0.sha256`, com as atestações do workflow. Nesta auditoria, esses nomes são planejados, não arquivos publicados.

- Extraia o ZIP inteiro em uma pasta nova; não misture com instalação antiga.
- Compare o SHA-256 do executável com `checksums.sha256` e o manifesto da release. A compilação deve corresponder byte a byte à CI antes da assinatura Authenticode.
- Verifique procedência: `gh attestation verify ARQUIVO --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local`.
- Abra `ABRIR_CENTRAL_PDF.bat`. Motores de release devem estar preparados. Não use `file://`.
- Exporte/importante `.cpdf` antes de migrar ou limpar dados do navegador. Projetos contêm cópias dos documentos e devem ser protegidos.

A auditoria verificou a reprodução do executável 2.0.1 original e a recompilação com o patch Go 1.26.10 em Linux com destino Windows, além dos hashes dos motores preparados. Isso não é uma execução nativa Windows nem uma validação de um futuro pacote já renumerado para 2.1.0.

## Compatibilidade e limites

O site deve usar o mesmo commit aprovado do pacote, embora os canais sejam distribuídos separadamente. O número sozinho não identifica os patches. A migração React permanece com catálogo parcial. Mudanças no PDF podem invalidar assinaturas existentes; o aviso novo é estrutural, não valida confiança. Recursos de assinatura visual, arquivamento e auditoria mantêm seus limites documentados.

O build React ainda avisa sobre chunks acima de 500 kB; não houve refatoração de carregamento para esconder o aviso. Windows físico/SmartScreen, WebKit/Safari, leitores de tela e configurações privadas do Sentry exigem verificação restante.

## Rollback

1. Preserve originais e projetos exportados. Não reverta documentos do usuário nem apague `localStorage`/IndexedDB como medida automática.
2. Se o site apresentar regressão, prepare uma PR de reversão para o último commit conhecido; mantenha os checks e a atualização de cache para substituir assets antigos. Publicação de reversão segue aprovação do responsável.
3. Para o Windows, encerre o servidor, use a pasta da release anterior e importe o projeto salvo quando compatível. Não sobrescreva a pasta anterior durante instalação.
4. Revogue o consentimento ou publique configuração de telemetria desativada caso necessário; isso não recolhe eventos já recebidos. Ajustes no projeto Sentry são feitos pelo administrador.
5. Documente commit, versão, canal afetado, hashes e evidência da recuperação. Não mova tags publicadas silenciosamente.
