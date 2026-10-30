# Evidências da primeira homologação — 30/10/2026

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
