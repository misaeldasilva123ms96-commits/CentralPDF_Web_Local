# Exemplo navegável do gerenciador CentralPDF

**Protótipo para avaliação, com dados fictícios. Não é um painel em produção.**

Baixe `index.html` e abra no navegador. O arquivo é autocontido: não usa rede,
contas, dependências, documentos reais ou serviços externos. Também pode ser
servido localmente com `python -m http.server 8766 --bind 127.0.0.1`, a partir
desta pasta, e aberto em `http://127.0.0.1:8766/`.

Experimente:

1. Alternar Claro/Escuro e mudar o período da visão geral.
2. Buscar e ordenar ferramentas; exportar o CSV demonstrativo.
3. Filtrar diagnósticos, abrir detalhes e marcar um item como analisado no exemplo.
4. Escrever um aviso, conferir a prévia e simular a publicação. Depois, voltar à
   visão geral para ver a mensagem apenas nesta demonstração.
5. Ajustar as preferências ilustrativas e consultar o histórico das ações.
6. Abrir **Conta e segurança → Alterar senha** e simular a mudança, com a opção de encerrar outras sessões. Nenhuma credencial ou sessão real é alterada.
7. Em **Ver acesso → Esqueci minha senha**, simular envio e abrir a prévia de nova senha. Os campos estão desabilitados e não recebem credenciais reais.
8. Em **Ver acesso → Ver posição do acesso no aplicativo**, conferir o cartão após **Capacidade estimada**. Ele abre a prévia do login; o site público continua igual.

Os dados são mantidos apenas na memória da aba. Recarregar ou clicar em
**Restaurar exemplo** reinicia a demonstração. Nenhuma ação modifica o site,
Sentry, Supabase, GitHub ou arquivos de colegas. O CSV também é fictício.

O plano está em [PLANO.md](../../docs/proposals/admin/PLANO.md). O conceito visual
está em [referencia.png](../../docs/proposals/admin/referencia.png).

A implementação real de autenticação, permissões, métricas e publicação de avisos
é uma etapa futura, dependente da aprovação do plano e da configuração dos serviços.

Hospedagem proposta: novo projeto Cloudflare **Free**, independente do Omni. Este arquivo não conecta a conta Cloudflare, Auth ou serviços de e-mail.
