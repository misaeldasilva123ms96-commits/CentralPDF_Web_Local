# Evidências da homologação

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
  O aceite do convite, senha e TOTP são preenchidos pelo responsável na interface;
  o envio aceito pelo provedor não comprova entrega nem autenticação real.
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
  aprovado de Firefox; a execução Linux da CI deve ser conferida na revisão final.
- Publicação por Wrangler autenticado no Worker exclusivo. A opção
  `preview_urls=false` foi acrescentada: a primeira publicação por CLI revelou que
  o padrão do Wrangler habilitava prévias quando a opção era omitida.

### Dependências que permanecem explícitas

| Critério | Evidência / pendência |
|---|---|
| Convite, definição da senha e login real com MFA | Convite aceito pelo provedor; confirmação pessoal pendente |
| Recuperação/alteração de senha e encerramento de outras sessões | Contrato de navegador aprovado no Chromium; exercício pessoal real pendente |
| Anônimo, conta comum, sessão revogada, rascunhos e auditoria | API real anônima e teste transacional no banco aprovados; fixtures revertidas |
| Sentry | API de leitura sem credencial disponível; permanece link privado. DSN de ingestão não autoriza consulta |
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
