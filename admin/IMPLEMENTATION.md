# Evidências da homologação

## Comentários da PR #66 — 31/10/2026

- Revisão conferida na cabeça `072f92e`, após a integração da #65 na `main` e
  sincronização da branch pelo responsável. Os dois apontamentos foram confirmados.
- [Conflito de revisão](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/66#discussion_r4430383740):
  nova migration `20261031101706_admin_notice_conflict_http.sql` troca apenas o
  erro de revisão antiga da RPC para `PT409`, preservando o predicado de revisão,
  execução como invocador e permissões. Migration aplicada somente no Supabase
  de homologação, como quinta migration. As quatro anteriores foram preservadas.
- O teste de banco que exige `PT409` falhou com `40001` antes da migration e passou
  depois. Os asserts de auditoria agora contam somente a fixture do próprio teste,
  permitindo executá-lo em um banco que já possui histórico real; tudo faz rollback.
- Teste real no navegador: editor manteve a revisão 3 do aviso de teste já retirado;
  uma edição concorrente levou o banco à revisão 4. O salvamento antigo retornou
  **HTTP 409 / `revision_conflict`**, exibiu a orientação de recarregar e não alterou
  a revisão 4 nem republicou o aviso. Status e código foram inspecionados sem
  registrar credenciais. Uma tentativa de tradução do erro HTTP 500 no Worker foi
  descartada após timeout real; a solução final é a resposta explícita da RPC.
- [Acesso aos avisos antigos](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/pull/66#discussion_r4430383744):
  API paginada, 50 registros por página, consulta limitada a 51 para detectar a
  próxima página e desempate de ordenação por ID. A interface permite navegar,
  selecionar e retirar avisos além dos primeiros 50; uma gravação retorna à
  primeira página. O contrato de array sem `page` foi mantido para abas já abertas.
- Dezoito testes de API/dados e o build passaram. A regressão de paginação busca
  o 51º registro publicado e o retira em desktop/celular no Chromium. Firefox
  continua indisponível localmente por configuração lado a lado do Windows;
  a CI Linux executa ambos os navegadores. A CI da revisão final deve ser conferida.
- Advisor após a migration: aviso de proteção contra senhas vazadas desativada,
  já documentada como recurso fora do plano gratuito; nenhum recurso pago foi
  habilitado. Não houve mudança no Omni, no site público ou merge da #66.

## Continuação — 31/10/2026

- PR #66 conferida antes de editar: revisão `e5ed673`, sem atualização remota,
  checks anteriores aprovados. Trabalho na branch original, no worktree previsto
  em `D:\Dev\Worktrees\CentralPDF_Web_Local-feat-admin-homologacao`.
- Configuração Auth salva e relida pela API de gerenciamento, após autenticação
  pessoal da CLI: Site URL de homologação, retornos exatos `/auth/callback` e
  `/auth/invite`, cadastro público/anônimo desativado, confirmação de e-mail,
  mínimo de 12 caracteres, senha atual na alteração e TOTP para cadastro/verificação.
- Não havia usuários nem administradores. O destinatário foi conferido como
  permitido pelo remetente de testes antes de enviar um único convite do aplicativo.
  A identidade retornada foi conferida e provisionada em `private.administrators`.
  Contagem posterior: uma identidade e uma permissão habilitada. Não há senha padrão.
- `ADMIN_READY=true` liberado somente em homologação após essas conferências.
  O responsável recebeu e aceitou o convite, definiu a própria senha e cadastrou
  TOTP diretamente na interface. O banco confirmou e-mail validado, um fator TOTP
  verificado e uma sessão AAL2; a Visão geral foi conferida no navegador real.
- Corrigida recuperação com MFA: o Auth recusa alterações de senha de contas com
  fator verificado em AAL1. O app agora verifica permissão e pede o TOTP existente
  antes de abrir a nova senha. O teste de regressão falhou na versão anterior e
  passou no Chromium em desktop/celular com o contrato do provedor mais estrito.
  Referência: [implementação oficial do Auth](https://github.com/supabase/auth/blob/master/internal/api/user.go).
- RLS real passou novamente com rollback, incluindo retirada de aviso, remoção da
  projeção pública, auditoria da retirada e preservação do snapshot anterior.
  Advisor de segurança: nenhum alerta. Dezesseis testes de API/dados, TypeScript,
  build e auditoria npm passaram; zero vulnerabilidades reportadas.
- Testes de interface usam Playwright 1.61.0, conforme dependência da CI.
  Chromium passou em 1440×1000 e 390×844. Firefox local não iniciou: o Windows
  informou configuração lado a lado incorreta. Isso é limitação local, não teste
  aprovado de Firefox. O job `admin-staging` da revisão `c148080` passou no Linux,
  incluindo Chromium e Firefox com provedores interceptados.
- Conferência sem login no endereço publicado: entrada e recuperação habilitadas,
  sem erros de JavaScript ou corte horizontal em 1440, 390 e 320 px. Nenhum envio
  de e-mail foi feito por esse teste. O bundle publicado é idêntico ao build local
  por SHA-256. A API Auth real recusou cadastro público (`signup_disabled`) e
  anônimo (`anonymous_provider_disabled`), ambos com HTTP 422.
- REST real sem autenticação recusou leitura de `admin_notices`, `admin_audit`
  e `admin_daily_metrics` com HTTP 401/SQLSTATE 42501. Não retornou rascunhos,
  auditoria ou métricas privadas.
- CI completa da revisão `994b824` aprovada: testes gerais, `app-2-0`,
  `admin-staging` e build. O deploy de produção foi ignorado, conforme esperado.
- Publicação por Wrangler autenticado no Worker exclusivo. A opção
  `preview_urls=false` foi acrescentada: a primeira publicação por CLI revelou que
  o padrão do Wrangler habilitava prévias quando a opção era omitida.
- Aviso identificado como teste criado com a sessão real: rascunho ausente da
  API pública, publicação presente com apenas cinco campos permitidos, retirada
  seguida de lista pública vazia. Banco e tela de Histórico confirmaram três
  revisões e três registros de auditoria. O aviso permaneceu retirado; a auditoria
  foi preservada. Esse teste não alterou o site público.
- O link Sentry agora inclui somente o ID do projeto CentralPDF, obtido do DSN
  público existente. Destino conferido na tela real; nenhum recurso Sentry foi
  alterado. A API de leitura permanece explicitamente não conectada.
- Encerramento de outras sessões exercitado com duas sessões AAL2 reais: após
  o comando, restou uma e a segunda aba teve acesso recusado. O teste revelou
  que eventos `SIGNED_OUT` do SDK atravessam abas apesar do uso de `sessionStorage`:
  a interface principal voltava ao login sem perder sua sessão no banco. Corrigido
  para consultar a sessão da própria aba; recuperação só inicia em um documento
  que entrou pela rota de callback. A regressão de saída falhou antes da correção.
  Na repetição real, a sessão principal permaneceu na Conta e segurança mesmo
  após revogação e saída local da outra aba.
- Alteração autenticada realizada pelo responsável com senha atual; a interface
  confirmou sucesso e encerramento das outras sessões. Em seguida, o responsável
  recebeu o e-mail real de recuperação e concluiu outra redefinição. TOTP permaneceu
  cadastrado e a sessão foi encerrada ao concluir a recuperação. O novo login
  abriu a Visão geral, com carregamento da API privada e sessão AAL2 confirmados.
  O agente não leu nem preencheu senhas, QR code ou códigos TOTP.
- CI completa da revisão de código `bc0efe5` aprovada, incluindo a regressão de
  duas abas em Chromium/Firefox. O bundle final publicado corresponde ao build
  local, e as URLs de prévia continuam desativadas.

### Dependências que permanecem explícitas

| Critério | Evidência / pendência |
|---|---|
| Convite, definição da senha e login real com MFA | Confirmados pelo responsável, banco e navegador real |
| Encerramento de outras sessões | Duas sessões reais → uma; segunda recusada, sessão principal preservada |
| Alteração de senha | Realizada pessoalmente com senha atual; sucesso conferido na interface |
| Recuperação | E-mail recebido, senha redefinida pessoalmente e novo login com TOTP confirmados |
| Anônimo, conta comum, sessão revogada, rascunhos e auditoria | API real anônima e teste transacional no banco aprovados; fixtures revertidas |
| Sentry | API de leitura sem credencial disponível; link privado limitado ao projeto CentralPDF. DSN de ingestão não autoriza consulta |
| Métricas | Ingestão desativada; sem contadores inventados. Piloto depende de consentimento separado, limites, retenção e origem de teste |
| Acesso pelo aplicativo público | Cartão e consumo de avisos reservados ao piloto do plano aprovado; produção não foi modificada |

Remetente de testes confirmado sem SMTP próprio, quota configurada de dois e-mails
por hora. Não desativar confirmação de e-mail para contornar a quota, nem contratar
serviços pagos nesta autorização. Nenhuma credencial privilegiada foi persistida
no Worker, bundle, Git ou capturas. Dados pessoais de acesso não constam desta evidência.

## Primeira homologação — 30/10/2026

- Projeto dedicado Supabase `centralpdf-admin-homologacao`, região São Paulo,
  organização escolhida pelo responsável, custo informado pelo provedor: US$ 0/mês.
- Worker novo `centralpdf-admin-homologacao`, Static Assets e origem exclusiva.
  Preview URLs desativadas. Nenhuma operação foi dirigida ao Omni ou a seu banco.
- Quatro migrations e RLS nas quatro tabelas; nenhum alerta no advisor de segurança
  depois da configuração. As funções privilegiadas estão no schema privado,
  têm `search_path` fixo e exposição/grants mínimos.
- Dezesseis testes de API/dados passaram; TypeScript, build e auditoria npm passaram.
- Teste transacional de RLS passou no banco real, sem manter contas ou avisos
  fictícios. Conta comum, metadados adulterados, MFA, rascunhos, snapshot publicado preservado após novo rascunho,
  revisões, auditoria e revogação foram verificados.
- Fluxos de navegador passaram em Chromium/Firefox, desktop/celular, com provedores
  interceptados. Essa evidência é de contrato/UX, não uma autenticação real.
- Browser Use inspecionou o endereço real sem fazer login: homologação identificada,
  aviso de configuração pendente, campos bloqueados e sem corte horizontal em
  desktop e celulares de 390/320 px.

## Conferência visual

Referência: exemplo aprovado na PR #65, imagens de Visão geral e Conta e segurança.
A implementação usa os mesmos tokens e estilos, sem nova proposta visual.
Conferência por capturas em Playwright e inspeção com `view_image`:

| Ponto | Aplicação |
|---|---|
| Navegação | Mesmas sete áreas, ordem e ícones de traço |
| Paleta | Mesmos fundos, superfícies, bordas e violeta; claro/escuro em um controle |
| Tipografia | Mesmas escalas de títulos, rótulos, controles e texto auxiliar |
| Conta | Mesma coluna de acesso, painéis de MFA/sessões e formulário de senha |
| Layout responsivo | Menu lateral recolhe; painéis viram uma coluna, sem overflow |

Diferenças funcionais intencionais: remover números fictícios, rótulos de
simulação e botões “simular”; mostrar dados efetivos, “Sem dados” e dependências
reais. Não declarar MFA ativa fora de uma sessão validada. Login fica bloqueado
até a configuração de primeiro acesso. A configuração pendente é visível no
ambiente real e não foi mascarada por fixtures.

## Pendências antes de liberar o acesso

- Configurações Auth/URLs/convite e provisionamento privado da conta, descritos no README.
- Validar primeiro acesso e recuperação reais e então habilitar `ADMIN_READY`.
- Configurar leitura Sentry quando houver ferramenta/credencial apropriada. Nenhum
  token de leitura foi solicitado em chat; o link privado é o caminho disponível.
- Piloto de ingestão mínima, retenção e quotas antes de conectar o site dos colegas.

Não houve merge, publicação de produção ou mudança no site público.

A chamada real Worker → Supabase detectou que `redirect: error` não é suportado
pelo runtime Workers. Foi substituído por `manual`, com recusa explícita de 3xx
e teste de regressão; nenhuma credencial é encaminhada a outro destino.

HTTP real: shell e callbacks com CSP; APIs privadas responderam 401 para
anonimato. A projeção pública respondeu 200 com lista vazia pelo caminho
Worker → Supabase. O primeiro acesso real permanece pendente da configuração
de Auth; a entrega de e-mail ainda não foi validada.

O contrato de navegador inclui convite padrão/rota dedicada, cadastro TOTP com
QR code fornecido pelo SDK, recuperação PKCE, definição de nova senha e recusa
de callback inválido. O controle de versão das verificações impede que respostas
atrasadas reabram o painel após sair ou sobrescrevam a tela de nova senha.
