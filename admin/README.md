# CentralPDF — administração em homologação

Implementação separada do site público, iniciada após aprovação do plano em
30/10/2026. Mantém o sistema visual do exemplo aprovado. O projeto Omni não é
reutilizado. Em 31/10/2026, o responsável autorizou integrar e publicar o piloto no
site público após os testes. O painel continua na origem de homologação.

**Homologação:** <https://centralpdf-admin-homologacao.misaeldasilva123-ms96.workers.dev/>

## Estado desta entrega

| Parte | Estado |
|---|---|
| Novo projeto Supabase Free e Worker independente | Criados para homologação |
| React/Vite/TypeScript e Static Assets | Build e entrega na Cloudflare |
| Login, PKCE e recuperação | Convite, entrada com TOTP e recuperação real concluídos; novo login após redefinição confirmado |
| Segundo fator TOTP | Cadastro/desafio implementados; obrigatório para dados e ações privadas |
| Conta e segurança | Alteração com senha atual e encerramento de outras sessões |
| Avisos | Rascunho, confirmação de publicação, retirada, revisão e auditoria transacionais |
| Histórico | Consulta de alterações de avisos; registros de autenticação ficam no Auth |
| Métricas de utilização | Piloto com consentimento próprio, quotas, deduplicação e retenção |
| Sentry | Leitura sanitizada por API; exige segredo `SENTRY_READ_TOKEN` com `event:read` |
| Ajustes e acesso no site | Pausa global auditada, atalho e avisos publicados |

`ADMIN_READY=true` está ativo somente em homologação desde 31/10/2026, após
conferir as políticas, URLs, identidade convidada e permissão privada. O ambiente
local continua bloqueado. Esse sinal de interface não concede permissão:
Auth e RLS continuam obrigatórios em toda requisição privada.

## Arquitetura e autorização

- Cloudflare Workers com Static Assets. Apenas `/api` e `/api/*` executam o Worker
  antes do fallback de SPA; APIs desconhecidas nunca retornam o HTML do painel.
- Supabase Auth e PostgreSQL. APIs privadas usam chave publicável e token do usuário.
  Somente ingestão e limpeza usam `SUPABASE_METRICS_KEY` como segredo no Worker.
  Não há chave `service_role`, senha ou token Sentry no bundle do navegador.
- Cada pedido privado valida o usuário no Auth e a permissão no banco. A tabela
  `private.administrators` é provisionada por operador autorizado, sem cadastro
  administrativo público e sem confiar em `user_metadata`.
- Funções privadas verificam `auth.uid()`, confirmação de e-mail, presença da
  sessão em `auth.sessions` e `aal2`. Sessão removida perde acesso mesmo com JWT
  ainda dentro do prazo. Host alternativo e escrita de origem diferente são recusados.
- Tokens da sessão ficam em `sessionStorage`, por aba. O verificador PKCE fica
  em `localStorage` com TTL de dez minutos para a troca iniciada no mesmo navegador.
  Preferência de tema também usa `localStorage`. A API usa Bearer, sem cookies de
  autenticação; não há credenciais ambientes em pedidos entre origens.
- CSP estrita, ausência de HTML arbitrário, `no-store`, `no-referrer` e bloqueio
  de enquadramento. Logs de invocação desativados e query strings redigidas no Worker.
- Não recebemos documentos, nomes de arquivos ou textos das ferramentas públicas.
  A ingestão pública aceita apenas o contrato técnico fechado, sem autenticar pessoas.
  Não há censo de pessoas, uploads ou reprodução de sessões.

## Primeiro acesso — configuração e validação

O conector de banco não oferece configuração de Auth nem convite. Em 31/10/2026,
o responsável autenticou as CLIs oficiais; a API de gerenciamento foi usada para
configurar e reler o Auth do projeto exclusivo. O convite foi aceito pelo provedor,
sem reenvio ou senha padrão, e a identidade conferida foi provisionada na tabela
privada. O responsável recebeu o convite, definiu a senha e entrou com TOTP;
o banco confirmou e-mail validado, fator verificado e sessão AAL2. A entrada na
Visão geral foi conferida no navegador real. A alteração com senha atual teve
sucesso confirmado na interface. O e-mail de recuperação também foi recebido,
e o responsável concluiu a redefinição pessoal. O novo login abriu a Visão geral,
e o banco confirmou novamente a sessão AAL2 com o TOTP preservado.
Procedimento para conferência ou recuperação operacional:

1. Em [URL Configuration](https://supabase.com/dashboard/project/alszupfnwerwtkyczzkw/auth/url-configuration), definir Site URL como a origem exata de homologação.
2. Permitir exatamente `https://centralpdf-admin-homologacao.misaeldasilva123-ms96.workers.dev/auth/callback`
   e `https://centralpdf-admin-homologacao.misaeldasilva123-ms96.workers.dev/auth/invite`.
   Não usar curingas de produção nem aceitar um parâmetro arbitrário de destino.
3. Desativar cadastro público e autenticação anônima. Manter confirmação de e-mail,
   exigir senha mínima de 12 caracteres e senha atual na troca. Confirmar TOTP habilitado.
4. Convidar apenas o endereço administrativo definido privadamente, usando
   `/auth/invite` como redirecionamento quando a interface oferecer essa opção.
   O convite padrão para a raiz do Site URL também é aceito. Não enviar senha padrão. Validar se o
   destinatário está autorizado pelo SMTP de testes; para produção, configurar
   remetente/SMTP próprio e verificar entrega e limites.
5. Conferir a identidade do usuário convidado e provisionar seu UUID em
   `private.administrators` via operação administrativa. Não publicar endereço,
   UUID pessoal, links de convite, senhas ou tokens em commits, prints ou logs.
6. Após verificar essas configurações, habilitar `ADMIN_READY=true` **somente no
   Worker de homologação**, abrir o convite, definir senha, entrar e cadastrar TOTP.
   Confirmar recuperação real, link expirado/usado e revogação de outra sessão.

A exigência de senha atual usa o campo `current_password` confirmado pelos tipos
do SDK instalado. Não há formulário de cadastro nem convite no painel público.
A recuperação de senha de uma conta que já possui TOTP exige confirmar o fator
existente antes de apresentar a nova senha. A verificação de permissão também
acontece nesse fluxo; o link de recuperação não remove o segundo fator.
A recuperação de MFA é um procedimento distinto; não existe atalho que remova MFA
pelo frontend. Não reduzir proteções para contornar uma falha de acesso.

## Avisos e privacidade dos rascunhos

`published_value` mantém a versão publicada separada dos campos em edição.
Salvar um rascunho posterior preserva a publicação anterior. A confirmação de
publicação substitui o snapshot; retirada o apaga. A projeção pública devolve
apenas texto publicado, vigência e revisão, sem autor, auditoria ou rascunhos.
Validação, incremento de revisão e auditoria acontecem na transação do banco.
Revisões antigas são recusadas, evitando sobrescrita entre abas.

O conflito de revisão usa SQLSTATE `PT409` na RPC, para o PostgREST retornar
HTTP 409 e a interface orientar o administrador a recarregar. A migration
`20261031101706_admin_notice_conflict_http.sql` preserva autorização, grants e RLS.
As migrations anteriores, já aplicadas, não foram reescritas.

Avisos salvos têm páginas de 50 itens, com ordenação por atualização e ID.
“Página anterior” e “Próxima página” permitem editar ou retirar publicações antigas.
Após salvar ou retirar, a lista volta à primeira página para mostrar o aviso atualizado.
Abas antigas que consultam a lista sem parâmetro `page` continuam recebendo o
formato de resposta anterior até serem recarregadas.

Clientes online com `admin-bridge.js` consultam os avisos publicados a cada dois
minutos. Retirar o aviso remove a projeção na próxima consulta bem-sucedida;
clientes offline podem manter a mensagem já exibida até retomar a conexão.
Publicação de código continua por PR e pelo processo atual do repositório.

## Piloto de utilização e Sentry

O rodapé do site oferece **Administração**. Em Compatibilidade e modo offline,
o cartão Área do administrador também oferece o acesso e **Permitir estatísticas
de uso (opcional)**. Essa escolha começa desativada e é independente dos erros e
tempos enviados ao Sentry. Operações anteriores não são reconstruídas.

A coleta envia UUID aleatório de aba em memória, IDs aleatórios dos eventos,
ferramenta e conclusão/falha. Não recebe documentos, nomes ou textos. Atividade é
uma estimativa de abas vistas nos últimos três minutos. Indicadores têm cobertura
parcial; não representam pessoas ou todos os usos. A API pública pode receber
eventos forjados: CORS não é autenticação. Não usar os números para faturamento.

Limites: dez eventos/pedido, 720 pedidos/aba/dia e 5.000 pedidos globais/dia,
contados no banco. Filas locais têm no máximo vinte eventos, sem persistência.
Desativar descarta pendentes e interrompe o envio; agregados anteriores permanecem.
Ajustes permite pausar globalmente com revisão e auditoria atômicas.
Limpeza diária às 05:17 UTC: deduplicação por sete dias, abas até o dia anterior,
orçamento por sete dias, agregados por noventa dias e auditoria por 180 dias.
Não se inclui o corpo dos pedidos nos logs. O provedor observa os metadados
normais da conexão, como IP. O service worker não armazena respostas dessa API.

`SUPABASE_METRICS_KEY` é uma chave privilegiada do projeto dedicado, cadastrada
apenas via segredo do Worker. O RPC de ingestão/limpeza não é executável por
`anon` ou `authenticated`. As funções privadas de consulta/ajuste exigem sessão
viva e MFA; wrappers públicos usam `security invoker`.

Para a leitura Sentry, criar token com **somente `event:read`**, cadastrar localmente
`npx.cmd wrangler secret put SENTRY_READ_TOKEN --env staging` e conferir Diagnósticos.
Não enviar o token em chat nem salvá-lo no repositório. O Worker fixa projeto
CentralPDF `4512284680060928`, janela de sete dias e até 25 grupos. Retorna apenas
categoria prevista, contagem, horário e link construído; descarta títulos, stacks,
usuários e outros projetos. Falha de leitura não vira lista vazia de sucesso.
Sem segredo, a interface informa Leitura não conectada. O DSN público não concede
consulta. A coleta de erros já existente continua com sua preferência própria.
O piloto suporta a origem GitHub Pages configurada; cópias locais não enviam uso.

## Desenvolvimento e testes

```sh
cd admin
npm ci
npm test
npm run build
python tests/browser.py
npm run dev:worker
```

O Worker local usa variáveis locais vazias por padrão. Configure `.dev.vars` no
seu ambiente; esses arquivos são ignorados pelo Git. Não reutilize ambientes,
variáveis ou segredos do Omni. `npm run dev` inicia apenas Vite e usa o proxy
local para `/api`; para validar tudo junto, use Wrangler após o build.

- `tests/data.test.ts`: agregação, catálogo das 34 ferramentas, CSV com Unicode e proteção contra fórmulas, validação de senha.
- `tests/worker.test.ts`: anonimato, host/origem, metadados adulterados, MFA,
  falha fechada, limites de payload, validação e conflitos.
- `tests/browser.py`: Chromium/Firefox, 1440×1000 e 390×844, com Auth/API isolados
  por fixtures. Exercita login → MFA, recuperação, senha atual, revogação, avisos,
  histórico, temas e ausência de chamadas externas. **Não comprova entrega de e-mail
  ou entrada da conta real.** Capturas opcionais: `CENTRALPDF_ADMIN_QA`.
- `tests/integrations.test.ts` e `../tests/admin-bridge.test.js`: contrato fechado,
  consentimento, CORS, filtragem Sentry e ausência de conteúdo sensível.
- `tests/usage.sql`: deduplicação, quotas, pausa e retenção com rollback.
- `tests/rls.sql`: teste transacional no banco de homologação com fixtures que
  fazem rollback. Verifica conta comum, MFA, metadados adulterados, rascunhos,
  projeção publicada, revisão, auditoria e sessão revogada.
- Job `admin-staging` da CI: dependências travadas, auditoria npm, testes, build e
  fluxos de navegador. Não faz deploy nem executa SQL remoto.

Migrations foram geradas pela CLI e aplicadas somente no projeto novo. As chaves
publicáveis e referências de recursos não são segredos; elas não substituem RLS.

## Implantação, limites e rollback

Cloudflare Free é o limite autorizado nesta fase. Não há upgrade, alteração de
assinatura, integração paga ou deploy no Omni. Quotas de conta podem ser
compartilhadas; não usar esta entrega para prometer capacidade simultânea garantida.
Supabase Free, SMTP de testes e Sentry possuem limites próprios.

Na configuração consultada, o remetente embutido permite **dois e-mails por hora**
no projeto. O destinatário do convite foi conferido como autorizado pelo remetente
de testes. Não foi contratado SMTP nem habilitada proteção paga de senhas vazadas.
Evite reenvios; convite e recuperação podem consumir a mesma quota. A confirmação
do provedor não comprova entrega na caixa de entrada. Consulte as
[limitações oficiais de teste de Auth](https://supabase.com/docs/guides/auth/testing-auth-flows).

`npm run deploy:staging` usa a autenticação local do Wrangler e apenas o nome
`centralpdf-admin-homologacao`. A primeira implantação foi feita pela conexão
Cloudflare, usando o bundle validado e o protocolo oficial de upload de assets.
As implantações de 31/10/2026 usam Wrangler autenticado; `preview_urls=false`
está explícito para preservar o bloqueio das URLs de prévia a cada publicação.
O Worker exige deploy explícito; o site público mantém seu workflow GitHub Pages.
O responsável autorizou merge/publicação deste piloto após aprovação dos testes.

Rollback: manter `ADMIN_READY=false` se o acesso não estiver validado e reverter
apenas a versão do Worker novo. Não apagar banco ou dados sem análise e aprovação.
O site público continua funcionando independentemente do painel. O endpoint de
saúde demonstra resposta do Worker, não saúde global dos fornecedores.

Convites administrativos usam o callback implícito nativo do provedor, aceito
somente na raiz oficial ou em `/auth/invite`, com validação Auth e da permissão
no backend. Após definir a senha, a sessão é encerrada e o app recarrega para
retomar PKCE nos fluxos seguintes. Recuperação usa PKCE; links inválidos/usados
ou sem verificador no navegador mostram uma mensagem de acesso não confirmado.
