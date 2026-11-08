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

7. Zoom visual de 200%: o novo teste detectou overflow na barra Duplicar/Excluir. Container query reorganiza cabeçalho/campos/ações apenas em painéis muito estreitos. Teste real via CDP passou, sem simular `visualViewport` ou exportações.
8. Ação final acompanha largura e deslocamentos do visual viewport; campos focados usam a posição real do rodapé e podem rolar acima dele. Viewport baixo emula espaço do teclado, sem declarar validação de IME físico.
9. Teste ampliado aprovado em Chromium/Firefox: transição de importação, foco, ordem dos campos, ação única, seleção/estado, redimensionamento, recolher/reabrir e exportação com acentos. App React: 241 testes; Admin: 28 testes, ambos com build.

10. Seleção visível em altura reduzida: teste RED encontrou texto parcialmente atrás do cabeçalho após redimensionamento. Ajuste por limites reais da seleção/painel e cabeçalho que acompanha a rolagem durante digitação em pouca altura. Teste ampliado passou em ambos os navegadores, com conteúdo original/acentos reabertos no PDF.
11. Validação estática: a fixture não incluía `office/` e a corrupção de versão estava presa a uma URL antiga. Passou a partir de um pacote completo validado e alterar a revisão encontrada, mantendo os seis casos negativos/positivos.
12. Telemetria: o teste de revogação chamava uma operação inválida, que legitimamente gera evento de erro ainda consentido. Substituído por operação real válida sem traces e teste adicional de envio autorizado de diagnóstico. Transporte, consentimento e código de produção não mudaram.
13. A execução de referência foi iniciada com vendor preparado: o contrato do checkout vazio de `offline-marker` falhou nesse contexto. Snapshot preparado preservado para capturas/desempenho; o marcador da referência foi restaurado ao conteúdo versionado para os contratos do checkout. Falhas/tempos limite da primeira execução serão mantidos no relatório, com repetições identificadas.
14. Configurações recolhidas no celular: teste RED confirmou que a ação final desaparecia com o painel. O contêiner recolhido agora mantém somente a ação original visível em mobile, sem mover campos/handlers. Teste passou nas 34 famílias, mantendo ações sem arquivos desabilitadas, em Chromium/Firefox.
15. Desempenho: primeira comparação isolada de 36 saídas detectou variação de ~20% (+182ms) na exportação de 20 imagens. O observer do rodapé media layout no desktop embora suas variáveis fossem usadas somente no mobile. A medição passou a retornar cedo fora do breakpoint; o atributo de arquivos só é escrito quando muda. Dados iniciais preservados; a repetição será registrada, sem promessa de ganho universal.
