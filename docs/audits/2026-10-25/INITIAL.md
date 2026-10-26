# Estado inicial — 25/10/2026

Base confirmada: a4c11e4aa88d68d47daa78b5e781524112d2a412, commit em 21/10/2026 11:36:25 -03:00. Nenhum commit posterior ao HEAD da auditoria citada. Branch criada após verificar ausência local/remota: fix/centralpdf-stabilization-audit-20261024. Trabalho anterior work/ preservado.

GitHub: sem issues/PRs abertos. Release mais recente v2.0.1 (17/08/2026), main 78 commits adiante. CI 39618321890 e Pages 39618321946 concluídos com sucesso na base; não substituem reexecução. Ruleset Protect main ativo, sem bypass, exclusão/force-push bloqueados, conversas resolvidas e branch atualizada exigidos; checks build e test. app-2-0 não obrigatório (risco de governança, P1, propor autorização administrativa, não mudar configuração).

Achados iniciais:

| ID | Severidade | Evidência | Causa/proposta |
| --- | --- | --- | --- |
| A01 | Alta na cadeia de desenvolvimento (advisories críticos transitivos; exposição a confirmar) | npm audit: 5 pacotes afetados, tinypool/vitest, mocker, vite, source-map-js | Atualizar somente ferramentas afetadas para versões corrigidas, validar 240 testes/build/tipos; não afirmar exploração do site estático. |
| A02 | P1 de cobertura | Pages verifica presença de poucos arquivos; testes de workflow são majoritariamente contratos de texto | Validar grafo local de assets/Workers/cache no pacote real e testar carga/offline. |
| A03 | P1 de cobertura | OCR atual usa worker substituto em teste | Adicionar reconhecimento real com Tesseract/WASM e idiomas verificados, documento sintético rotacionado e PDF pesquisável. |
| A04 | P1 de cobertura | Auditoria 34 ferramentas verifica registro, não execução de todas | Executar matriz com entradas/exportações reais e marcar falhas/bloqueios sem substituir motores. |
| A05 | P1 de distribuição | main 78 commits após tag v2.0.1, mesmo número público | Preparar proposta 2.0.2 e plano sem tag/publicação/bump indiscriminado. |

Sentry: leitura inicial encontrou payload de lista fechada, opt-in, revogação, agregação, quotas e transporte sem SDK. Ainda não há resultado novo de validação; testar adversarialmente CPF/CNPJ/caminhos/credenciais, limites, disponibilidade e consentimento. Configurações do painel não acessíveis; checklist externo obrigatório.

Limites ambientais: Linux; Windows físico/SmartScreen/leitores de tela e painel Sentry não disponíveis. Ferramenta do serviço Deep Security Scan ausente; revisão por código e testes não será apresentada como resultado desse serviço. Chromium instalado; Firefox/WebKit baixados, disponibilidade de bibliotecas nativas em avaliação. Nenhum documento real será usado e nenhum evento será enviado ao Sentry real.

A intenção inicial de patch indicada em A05 foi refinada após considerar as funcionalidades acumuladas desde a tag; a recomendação final de SemVer está em [RELEASE_PLAN.md](RELEASE_PLAN.md). Nenhuma versão do runtime foi alterada.
