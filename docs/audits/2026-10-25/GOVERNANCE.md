# Governança: verificação e proposta administrativa

## Confirmado por leitura da API

Ruleset **Protect main**, ID 20533795, ativo e limitado à `refs/heads/main`, sem bypass. Bloqueia exclusão e force push, exige PR, resolução de conversas e checks com atualização da branch. Checks configurados: **test** e **build**. `app-2-0` executa na CI, mas não é um check obrigatório do ruleset.

`python scripts/verify-github-governance.py` passou contra a política atual. Não houve alteração de ruleset, branch protection, permissões, aprovação ou configuração administrativa.

## Recomendação: incluir app-2-0

Justificativa: o job cobre testes/tipos/build da migração React. Sem ele como requisito, seu resultado negativo pode não bloquear o merge, mesmo havendo código `app/` no repositório. Adicionar esse check reforça a política sem substituir `test` ou `build`.

**Depende de aprovação do responsável. Procedimento proposto, não executado:**

1. Confirmar que a PR em revisão emite os nomes exatos `test`, `build` e `app-2-0` e que estão verdes no mesmo SHA.
2. Em GitHub → Settings → Rules → Rulesets → Protect main, adicionar **app-2-0** aos status checks exigidos, preservando os demais controles e sem bypass.
3. Atualizar `DEFAULT_CHECKS` do verificador e seus testes/guia na mesma mudança de política aprovada. Não mudar esse default antes do ruleset para criar uma falha administrativa artificial nesta PR.
4. Verificar pela API e executar `python scripts/verify-github-governance.py --check build --check test --check app-2-0`.
5. Se houver divergência de nomes/integração, corrigir a configuração pelo responsável; não contornar bloqueios por push direto.

Cron semanal de CI, Dependabot e fixação de Actions são arquivos de configuração revisáveis desta PR, sem auto-merge. O cron não publica site nem releases. O workflow Pages mantém o bloqueio de deploy em PR, e releases continuam dependentes de tag/ação explícita.
