# CentralPDF — administração em homologação

Implementação separada do site público, iniciada após aprovação do plano em
30/10/2026. Mantém o sistema visual do exemplo aprovado. O projeto Omni não é
reutilizado e nenhuma publicação de produção é feita por esta pasta.

**Homologação:** <https://centralpdf-admin-homologacao.misaeldasilva123-ms96.workers.dev/>

## Estado desta entrega

| Parte | Estado |
|---|---|
| Novo projeto Supabase Free e Worker independente | Criados para homologação |
| React/Vite/TypeScript e Static Assets | Build e entrega na Cloudflare |
| Login, PKCE e recuperação | Implementados; primeiro acesso depende das configurações de Auth abaixo |
| Segundo fator TOTP | Cadastro/desafio implementados; obrigatório para dados e ações privadas |
| Conta e segurança | Alteração com senha atual e encerramento de outras sessões |
| Avisos | Rascunho, confirmação de publicação, retirada, revisão e auditoria transacionais |
| Histórico | Consulta de alterações de avisos; registros de autenticação ficam no Auth |
| Métricas de utilização | Consulta e estados vazios implementados; ingestão não habilitada |
| Sentry | Link privado disponível; API de leitura ainda não configurada |
| Ajustes remotos e cartão no app público | Reservados para etapa de piloto; site público permanece igual |

`ADMIN_READY=false` mantém entrada/recuperação bloqueadas até concluir e validar
primeiro acesso, URLs e políticas. Esse sinal de interface não concede permissão:
Auth e RLS continuam obrigatórios em toda requisição privada.

## Arquitetura e autorização

- Cloudflare Workers com Static Assets. Apenas `/api` e `/api/*` executam o Worker
  antes do fallback de SPA; APIs desconhecidas nunca retornam o HTML do painel.
- Supabase Auth e PostgreSQL. O Worker usa **somente chave publicável** e o token
  de quem fez o pedido. Não há chave `service_role`, senha ou token Sentry no bundle.
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
  Não há ingestão aberta, censo de pessoas, uploads ou reprodução de sessões.

## Primeiro acesso — dependência operacional

O conector disponível cria projetos e aplica SQL, mas não oferece configuração de
Auth nem convite de usuários. A configuração abaixo deve ser concluída no **novo
projeto**, sem alterar os demais projetos da conta:

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
A recuperação de MFA é um procedimento distinto; não existe atalho que remova MFA
pelo frontend. Não reduzir proteções para contornar uma falha de acesso.

## Avisos e privacidade dos rascunhos

`published_value` mantém a versão publicada separada dos campos em edição.
Salvar um rascunho posterior preserva a publicação anterior. A confirmação de
publicação substitui o snapshot; retirada o apaga. A projeção pública devolve
apenas texto publicado, vigência e revisão, sem autor, auditoria ou rascunhos.
Validação, incremento de revisão e auditoria acontecem na transação do banco.
Revisões antigas são recusadas, evitando sobrescrita entre abas.

Publicar nesta homologação **não muda o site dos colegas**. A ligação do app aos
avisos e a coleta mínima de métricas serão validadas no piloto. Publicação de
código continua por PR e pelo processo atual do repositório.

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

`npm run deploy:staging` usa a autenticação local do Wrangler e apenas o nome
`centralpdf-admin-homologacao`. A primeira implantação foi feita pela conexão
Cloudflare, usando o bundle validado e o protocolo oficial de upload de assets.
Não existe deploy automático por merge. A produção depende de revisão e aprovação
posteriores, conforme o plano.

Rollback: manter `ADMIN_READY=false` se o acesso não estiver validado e reverter
apenas a versão do Worker novo. Não apagar banco ou dados sem análise e aprovação.
O site público continua funcionando independentemente do painel. O endpoint de
saúde demonstra resposta do Worker, não saúde global dos fornecedores.

Convites administrativos usam o callback implícito nativo do provedor, aceito
somente na raiz oficial ou em `/auth/invite`, com validação Auth e da permissão
no backend. Após definir a senha, a sessão é encerrada e o app recarrega para
retomar PKCE nos fluxos seguintes. Recuperação usa PKCE; links inválidos/usados
ou sem verificador no navegador mostram uma mensagem de acesso não confirmado.
