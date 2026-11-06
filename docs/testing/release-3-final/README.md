# Acabamento final do CentralPDF 3.0

Entrega incremental sobre a aplicação original. A PR prepara o lançamento e não
publica site, Admin, tag ou release. O resultado autoritativo da revisão atual
fica nos checks da PR; um ZIP local não equivale a uma release publicada.

## Escopo verificado

| Pedido | Implementação | Verificação |
| --- | --- | --- |
| Controles arredondados | Busca, importação e filtros com cantos suaves | Capturas computador/celular nos dois temas |
| Hover consistente | Mesma regra para cartões comuns, destacados e profissionais; foco de teclado preservado | 39 cartões em Chromium/Firefox |
| Botões com relevo | Fechar, ações comuns e remoção com sombra discreta; foco e estados desabilitados preservados | Diálogos, arquivos e Admin |
| Sobreposições | Acesso administrativo separado do consentimento; instruções e checkbox com altura natural | Geometria real e leitura nos dois temas |
| Motores | PDF.js 6.5.438 com API, Worker, recursos e hashes sincronizados | Preparo PowerShell, edição, exportação e regressões |
| Admin | Versão compacta, última consulta bem-sucedida e filtro de falhas | 27 testes unitários/API e fluxos de navegador |
| Leitura de arquivos | Anel roxo fino, etapas reais, tamanho, tempo e explicação expansível | Entrada, rejeição, troca de ferramenta, PDF de 40 páginas e PDF de 16 MB |

O indicador compartilha a fila original de entrada, aguarda uma oportunidade de
pintura antes de analisar e termina em `finally`. Uma troca de ferramenta invalida
a sessão e descarta o resultado antigo. O status acessível fica fora da região
marcada como ocupada. Não há progresso percentual fictício nem envio de arquivo.
O movimento é reduzido quando solicitado pelo sistema.

## Operações reais e resultados

- `tests/release-3-polish.test.py`: Chromium e Firefox; computador 1440 px/tema
  escuro e celular 390 px/tema claro. Confere os 39 hovers, geometria da área
  administrativa, importação em Juntar/Dividir/Organizar/Editar, ajuda durante a
  leitura, rejeição e troca de ferramenta. Exporta e reabre 40 páginas.
- `heavy-pdf.json`: PDF sintético com 16.054.909 bytes e 9 páginas com imagens.
  Importação e exportação nativas aprovadas, texto/dimensões/pixels idênticos,
  sem erros de página e com destinos externos bloqueados. O tempo registrado é
  apenas desta execução; depende do computador e do documento.
- Suíte React: 241 testes aprovados e build gerado. O build mantém o aviso
  existente sobre tamanho de chunks; ele não foi ocultado.
- Admin: 27 testes aprovados e build gerado. Login, MFA, recuperação, troca de
  senha, sessões independentes, avisos, histórico e coleta testados com provedores
  isolados em Chromium e Firefox; nenhum acesso a contas reais.
- A suíte Python existente foi executada integralmente. Encontrou problemas
  durante o desenvolvimento, descritos abaixo; os testes afetados foram repetidos
  após a correção. O teste visual existente cobre 34 workspaces, 39 atalhos,
  seis larguras e os dois temas em ambos os navegadores.
- Testes JavaScript, integridade estática, catálogo, versões e marcadores offline
  executados. Os checks da PR também validam o pacote preparado, offline, motores
  Office, Go e a reprodução do executável Windows.

## Falhas encontradas e tratadas

1. Uma regra ampla para botões “Fechar” também exibia o backdrop da barra lateral,
   consumindo uma coluna do grid. O seletor foi restringido e há uma asserção de
   regressão. Não se resolveu por sobrepor os painéis com z-index.
2. PDF.js 6.5 exige `fontExtraProperties` para expor códigos originais dos glifos.
   A leitura do editor solicita essa opção. As verificações que impedem alteração
   de estruturas/fontes não suportadas continuam ativas; os testes de substituição,
   posição, duplicatas, remoção e restauração foram preservados.
3. O digest dos recursos PDF.js precisa da ordenação do preparador PowerShell,
   que difere da ordenação Python. O hash fixado foi calculado com o algoritmo real
   e o preparo offline passou com API/Worker/recursos verificados.
4. Marcadores gerados de preparo devem voltar ao padrão não preparado no código
   fonte. O pacote preparado os gera novamente; o teste desse contrato passou.
5. Capturas tiveram timeout durante execuções simultâneas. As repetições isoladas
   do protótipo e dos fluxos do Admin passaram, sem aumento de timeout ou redução
   de asserções. O resultado final da CI deve ser consultado antes de integrar.

## Motores e limites

`pdfjs.json` contém versão, integridade do pacote e SHA-256 dos módulos/recursos.
`engine-review.json` registra as versões publicadas consultadas. PDF.js foi
atualizado; pdf-lib 1.17.1, Tesseract 7.0.0, QPDF WASM 0.3.1 e LibreOffice converter
2.7.2 foram mantidos. Não se substituiu o bundle experimental LibPDF sem um
processo de atualização e testes próprios.

Preservados: 34 módulos, 39 atalhos, projetos, documentos locais, segurança de
senhas/assinaturas, MFA, limites gratuitos, escolha de consentimento e modo offline.
Sem alteração de credenciais, Auth, RLS ou banco. O catálogo do Admin referencia
`pages-54`; isso não identifica a revisão carregada por cada colega.

Arquivos muito grandes ainda podem consumir bastante memória e os parsers podem
ocupar a thread principal. O indicador melhora o retorno visual, sem prometer
processamento instantâneo ou desempenho igual entre dispositivos. Office continua
sujeito a fontes e layout conforme `docs/OFFICE.md`.

## Evidências e reversão

As capturas em `screenshots/` usam dados sintéticos e provedores de teste. Não há
notas fiscais reais, senhas ou códigos de acesso nesses artefatos.

Reverter a camada visual/indicador e o motor com seus hashes como uma unidade,
atualizar a revisão do cache e sincronizar o catálogo. Não apagar dados de usuários.
A publicação do ZIP, site ou Admin exige a etapa de publicação correspondente.
