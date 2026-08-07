# Governança do GitHub

A branch `main` recebe mudanças somente por pull request. O ruleset ativo `Protect main` bloqueia exclusão e force push, exige resolução das conversas e exige que a branch esteja atualizada antes do merge.

Os checks obrigatórios são os nomes reais emitidos pelos jobs dos workflows em pull requests:

- `test`, emitido por `.github/workflows/ci.yml`;
- `build`, emitido por `.github/workflows/pages.yml`.

O job `deploy` do Pages não é obrigatório porque é ignorado em pull requests e executa somente em `push` para `main`. A conta proprietária única não depende de uma aprovação impossível de outro usuário; revisão continua possível, mas a barreira automática é composta pelos checks, atualização da branch e resolução das conversas.

## Política dos workflows

CI e Pages executam em `pull_request` nos eventos `opened`, `synchronize`, `reopened` e `ready_for_review`, além de aceitarem `workflow_dispatch`. O `push` automático é limitado à `main`, evitando duplicar uma validação de branch que já será feita pelo evento de pull request.

Cada workflow separa concorrência por PR ou branch. Execuções antigas da mesma PR são canceladas; execuções da `main` não são canceladas automaticamente.

As permissões globais são somente leitura. Apenas o job de deploy do Pages recebe `pages: write` e `id-token: write`.

## Auditoria somente leitura

Com o GitHub CLI autenticado, execute:

```powershell
python .\scripts\verify-github-governance.py
```

O comando consulta a API, não altera configurações e retorna código `1` se a proteção divergir da política. Para outro fork ou nomes de checks diferentes, use `--repo OWNER/REPO` e repita `--check NOME` para cada contexto obrigatório.

Alterações futuras nos nomes dos jobs `test` e `build` devem atualizar o ruleset, os testes e este documento no mesmo pull request, para não bloquear merges.
