# Gerenciador CentralPDF — proposta para avaliação

Esta entrega contém **planejamento e exemplo**, sem implantação de serviços ou
alterações no site público. O login será exclusivo do administrador; os colegas
continuarão utilizando o app sem cadastro.

- [Plano completo](PLANO.md): objetivos, benefícios, escopo, arquitetura,
  privacidade, segurança, fases, testes, custos e decisões pendentes.
- [Plano em PDF](PLANO.pdf): versão de leitura do plano 1.1.
- [Baixar o pacote de avaliação](<CentralPDF — exemplo do gerenciador.zip>): extraia
  e abra o HTML no navegador; inclui o plano em PDF e instruções.
- [Exemplo navegável — código e instruções](../../../examples/admin-demo/README.md):
  arquivo único, sem instalação nem serviços externos.
- [Evidência da avaliação local de capacidade](capacidade-local.json): 37 sessões
  sintéticas, em rodadas de até 20; não é um limite de produção.
- [Conceito visual](referencia.png): imagem de referência, também com números fictícios.

## Revisão 1.1 — Cloudflare e acesso administrativo

- Novo projeto exclusivo do CentralPDF, com nome sugerido `centralpdf-admin`. O `projeto-omni` permanece fora de qualquer alteração.
- Conexão Cloudflare autenticada e inventário nominal confirmados em 30/10/2026: um Pages existente e nenhum Worker. Sem criação de recursos; plano, quotas, endereço e permissões de implantação continuam a confirmar.
- Hospedagem proposta: Workers com Static Assets e API dedicada; Supabase Auth/Postgres para login, recuperação, MFA e autorização. A escolha final depende da aprovação do plano.
- Futuro cartão **Área do administrador** em **Compatibilidade e modo offline**, após o cartão completo **Capacidade estimada** e antes dos botões do rodapé.
- Recuperação na entrada e alteração de senha em **Conta e segurança**. Recomenda-se ativação por convite e senha forte, com MFA; o primeiro acesso ainda precisa ser aprovado.

Esta revisão atualiza somente o plano, PDF e pacote. O HTML e a captura do exemplo anterior permanecem iguais: ainda não mostram o novo cartão nem executam autenticação ou recuperação. Nenhum e-mail, senha ou recurso de produção foi configurado.

O exemplo tem Visão geral, Ferramentas, Diagnósticos, Avisos, Ajustes e Histórico.
Permite alternar tema/período, buscar ferramentas, baixar CSV fictício, examinar
falhas e simular avisos. Nenhuma dessas ações grava dados no servidor. A prévia
publicada e o rascunho são separados: salvar um rascunho não publica a mensagem.

**Todos os indicadores são demonstrativos.** O estado dos serviços não foi obtido
por conexão real. Os campos de acesso estão desabilitados; não informe senhas.
A autenticação e os controles reais dependem de uma etapa futura aprovada.

A imagem gerada orientou a composição e as cores. O exemplo reutiliza o controle
único de tema já adotado pelo CentralPDF, usa texto explícito de serviços não
conectados e calcula os indicadores a partir do conjunto fictício. A versão para
celular reorganiza o conteúdo em coluna e ajusta a legibilidade do gráfico.

## Aparência do exemplo

Captura real do HTML navegável. Todos os números são fictícios e os serviços não
estão conectados.

![Visão geral do protótipo administrativo](exemplo-painel.png)

A validação usa `python scripts/run-browser-test.py tests/admin-demo.test.py`,
com Chromium/Firefox, desktop/celular, CSV, filtros, rascunho/publicação separados,
preferências, histórico, acesso ilustrativo e abertura do HTML offline.
