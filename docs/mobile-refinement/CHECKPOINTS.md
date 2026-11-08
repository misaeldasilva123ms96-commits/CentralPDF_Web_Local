# Refinamento mobile — Central PDF 3.0

Branch: `refactor/centralpdf-3-ux-mobile-refinement`. Base sincronizada: `d5b38e82c1fa90f0d3b28574c779f0500d4a3df1`, com PRs #89/#90 e correção de transparência integradas. Escopo: aplicação original da raiz; sem merge, produção, releases, tags ou alteração de motores.

## Referência e problemas

- Importação de imagens: cabeçalho, área de seleção e informações repetidas deixam pouco papel visível no celular. Capturas reais antes da alteração.
- Ação final depois das configurações: teste RED encontrou o botão em y=983,53 numa tela de 844px, fora da área visível.
- Editor: propriedades não tinham estado recolhido independente da seleção. Concluir mantém sua função de terminar a seleção; minimizar precisa ser uma ação diferente.
- A referência completa encontrou aviso de recuperação em um teste que remove os scripts do app e não carrega JSZip. Corrigida a dependência da fixture, mantendo todos os asserts.

## Implementação incremental

1. Estado de trabalho derivado dos eventos existentes: compactar o topo depois de importar, sem recriar inputs, arquivos ou seleções. A Home permanece intacta.
2. Imagens: manter todos os campos dentro de `settingsContent`; `display:contents` permite apresentar a ação original antes de Mais opções sem quebrar snapshot/handlers.
3. Propriedades: Recolher/Propriedades altera apenas a apresentação. Seleção, ferramenta, objetos, histórico e conteúdo continuam iguais; selecionar outro objeto reabre o painel.
4. Mobile: mesma ação final, sem cópia ou novo processo. Altura medida, espaço final de rolagem, áreas seguras e posicionamento pelo visual viewport. O painel contextual ocupa menos da metade da área visível e mantém Concluir acessível.
5. Regressão encontrada durante o refinamento: a margem de rolagem para a ação final afetava um scroller interno do editor. A regra foi limitada ao painel lateral, sem relaxar o teste de toque.
6. Recursos versionados e cache `pages-58`; o catálogo gerado do Admin acompanha apenas a revisão. Não há mudança de Admin, autenticação, Supabase, MFA, Worker, banco ou infraestrutura.

## Método e limites

A extensão Browser não dispõe de ferramenta `js` nesta sessão. O prompt autoriza testes automatizados da aplicação isolada; usamos Chromium/Firefox do Playwright e motores preparados reais. Teclado físico/virtual de dispositivo real e leitores de tela não são reproduzidos por emulação de viewport. Capturas, testes, zoom/reflow e medições detalhados no relatório final. Não se presume aprovação visual humana desta etapa.
