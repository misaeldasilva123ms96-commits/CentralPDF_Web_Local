# Checkpoint 4 — Admin e acesso

PR empilhada sobre a entrega do aplicativo principal. Sistema visual 3.0;
versão técnica 0.3.0. **Sem deploy ou alterações em Auth, Worker, banco ou secrets.**

## Escopo implementado

- Marca SVG local em acesso, navegação, carregamento e falha de conexão/callback.
- Tokens claros/escuros, títulos em degradê, menus, cartões, gráficos, tabelas,
  formulários, mensagens, vazios e modais compartilhados por todas as views.
- Visão geral, ferramentas, diagnósticos, avisos, ajustes, histórico e conta.
- Login, recuperação, convite, senha, desafio/cadastro TOTP e acesso negado
  continuam usando o componente e os estados reais de `Access`.
- Tema sol/lua mantém `centralpdf-admin-theme`, role switch e nome acessível.

Não são modificados `auth.ts`, Worker, migrações, rotas privadas ou contratos.
O SVG passa pelo mesmo processo de build de assets. O harness de navegador
serve o arquivo SVG como imagem e confere sua largura natural, além de registrar
capturas de login, MFA, convite, redefinição e callback inválido.

## Verificação

`npm --prefix admin test`: **27 testes passaram**. Build, verificação de catálogo
e TypeScript passaram. A suíte Chromium/Firefox com fixtures valida senha atual,
recuperação com MFA, revogação por sessão, rascunhos/publicações, conflitos,
histórico, consentimento, tema e ausência de chamadas externas.

A primeira execução de capturas após o redesign revelou que o servidor do harness
respondia HTML para o SVG. O arquivo existia no build; a rota do harness foi
corrigida e uma assertiva de imagem carregada adicionada. A repetição final passou em Chromium/Firefox, computador/celular, com a marca
carregada e sem chamadas externas. Capturas em `evidence/admin-after/`.

## Pendências e rollback

Revisão humana das capturas, leitor de tela, aparelho físico e zoom 200%.
SQL/RLS remoto, credenciais reais e entrega de e-mail: **não executados**, pois
esta entrega autoriza apenas código e testes locais/CI. Não representa teste
de uma sessão real de administrador.

Rollback independente: reverter estilos, Brand, apresentação do Theme e mudanças
visuais de App/Access. Não apagar dados, sessões, MFA ou preferências.
