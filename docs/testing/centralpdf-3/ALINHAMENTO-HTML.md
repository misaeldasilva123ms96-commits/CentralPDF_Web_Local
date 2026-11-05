# Alinhamento ao HTML aprovado — Central PDF 3.0.0

Referência: `docs/proposals/centralpdf-3-redesign/prototipo-centralpdf-3.html`.
O HTML continua como referência visual; a aplicação original e seus motores permanecem.

## Diferenças corrigidas

| Elemento | Antes | Ajuste |
|---|---|---|
| Título inicial em 1440 px | 1077 px, em uma linha | 760 px, com a quebra do HTML |
| Todas as ferramentas | Painel de até 1120 px, descrições visuais | Até 820 px, quatro grupos compactos; dois no celular |
| Converter PDF | Dez itens em duas seções | Os 16 cartões reais de conversão, em grade como no HTML |
| Posicionamento | Painéis centralizados separadamente | Ancorados ao botão, limitados à janela; teclado, resize e scroll |
| Ícones | Tons claros antigos sobrepunham o redesign | Símbolos locais, degradê e dimensões compactas do HTML |
| Abrir arquivos/categorias | Estilo e escala herdados | Degradê e escala da referência |
| Offline | Cache pages-51, apresentação v1 | Cache pages-52, apresentação v2 |

Favoritos, ajustes Office, informações dos cartões, versão 3.0.0, descrições acessíveis,
34 módulos, 39 atalhos, fechamento dos menus e motores foram preservados.
O degradê dos títulos mantém as cores claras do tema escuro para legibilidade.

## Admin

A captura recebida mostra o Admin anterior, com aplicativo 2.0.1. O código atual
já contém a identidade 3.0; o catálogo passa a referenciar a revisão pages-52.
Build, 27 testes e fluxos Chromium/Firefox PC/celular passaram. A captura
`admin-previa-local.png` usa provedores isolados, sem dados da conta real.
A tentativa de leitura pública do Worker retornou HTTP 403; não se verificou
uma sessão autenticada em produção. Não houve deploy do Admin.

## Evidências

Capturas reais do aplicativo: `evidence/alinhamento-html/`.

Verificações executadas com sucesso:

- Office: atalhos/formato, navegação e operações nos dois navegadores, PC/celular.
- `redesign-3-exports.test.py`: união em ordem exata, divisão e organização, PDFs reabertos e hashes.
- `cached-editor-downloads.test.py`: atualização, atualização online e fallback offline; inclui arquivos de apresentação antigos da pages-51.
- `pdf-compatibility-sw.test.py`: cache e compatibilidade offline.
- Versão, integridade estática e catálogo Admin.
- Admin: 27 testes, tipos/build e suíte de navegador com Auth/MFA/recuperação.

A suíte responsiva final também verifica os 34 workspaces, 39 atalhos, limites
dos menus, abertura por teclado, retorno do foco, título e importação nos dois
temas, seis larguras e Chromium/Firefox: PASS na execução local final. Os checks da PR verificam as suítes completas.

Sem merge ou publicação desta etapa. A publicação do Admin permanece separada,
conforme a restrição do pedido original. Rollback por reversão deste ajuste e
nova revisão de cache, sem apagar projetos, preferências ou dados de documentos.

## Revisão: alinhamento vertical dos nomes no cabeçalho

A primeira prévia ainda deixava Converter PDF e Todas as ferramentas abaixo dos
outros cinco itens. A reprodução com Range real do texto mediu diferença de
6,25 px em Chromium/320 px/tema claro. A causa era `inline-flex` sem centralização
nos cinco botões simples, enquanto os dois acionadores já centralizavam o texto.
Todos os sete itens agora usam a mesma centralização vertical e horizontal.

A suíte responsiva compara os centros dos textos (tolerância de 1 px), incluindo
os dois temas, seis larguras e Chromium/Firefox. As capturas foram renovadas;
`evidence/alinhamento-html/app-cabecalho.png` mostra somente o cabeçalho real,
sem recorte ou montagem posteriores. Nenhum handler ou posição dos menus mudou.
