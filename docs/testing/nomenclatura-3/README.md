# Correções de nomenclatura — Central PDF 3.0.0

Base: `0695e4651dd9bb70f5d0bbfa4a7c3fccbb3e9c18` (`main`, conteúdo da release v3.0.0).
Branch: `fix/centralpdf-3-ajustes-nomenclatura`.

## Diferenças visuais

| Local | Antes | Depois |
| --- | --- | --- |
| Aba | Central PDF & Imagem | Central PDF |
| Rodapé | Central PDF & Imagem — Web Local 3.0.0 | Central PDF — Web Local 3.0.0 |
| Cartão, menus e catálogo | Imagens para PDF | JPG/PNG para PDF |
| Workspace | Imagens para PDF avançado | JPG/PNG para PDF |
| Onboarding/PWA/metadados de apresentação | Central PDF & Imagem | Central PDF |

O nome da PWA continua acompanhado da versão 3.0.0. Os formatos reais permanecem
JPG/JPEG, PNG e WEBP; a descrição do cartão explicita WEBP. A busca aceita tanto
“JPG/PNG para PDF” quanto “Imagens para PDF”. O Admin recebe o catálogo pelo gerador
oficial e mantém o nome antigo como alias de busca, sem mudar telas ou APIs.

| Comparação | Antes | Depois |
| --- | --- | --- |
| Cartão no computador/escuro | [Captura](before/card-1440-dark.png) | [Captura](after/card-1440-dark.png) |
| Rodapé no computador/escuro | [Captura](before/footer-1440-dark.png) | [Captura](after/footer-1440-dark.png) |
| Workspace no computador/escuro | [Captura](before/workspace-1440-dark.png) | [Captura](after/workspace-1440-dark.png) |
| Cartão no celular/claro | [Captura](before/card-390-light.png) | [Captura](after/card-390-light.png) |
| Rodapé no celular/claro | [Captura](before/footer-390-light.png) | [Captura](after/footer-390-light.png) |
| Workspace no celular/claro | [Captura](before/workspace-390-light.png) | [Captura](after/workspace-390-light.png) |

## Escopo e preservação

- HTML e textos JS, metadados de apresentação em arquivos gerados, manifest, busca
  e documentos atuais. Algoritmos e opções de processamento permanecem iguais.
- `imagesToPdf`, sua lista de aceitação, nomes de saída, 34 módulos, 39 atalhos,
  armazenamento, projetos, autenticação/MFA e motores preservados.
- Nenhum CSS, SVG, executável, pacote/dependência, diretório ou nome de instalador
  foi alterado. SHA-256 da logomarca preservada:
  `83f93eff1ed515265e916b3d5edbef455ffd1dea9be2a3b402310262941a67fd`.
- README/guia atual/catalogação usam os nomes atuais. Propostas, releases,
  evidências anteriores e fixtures históricos não sofreram substituição em massa.
- Os checks de empacotamento acompanham os novos nomes de apresentação no README
  e manifest, mantendo versões técnicas e nomes dos artefatos.

## Cache

A revisão passa de `pages-54` para `pages-55` porque a aplicação serve HTML e JS
pelo cache offline. Sem atualizar o worker, clientes existentes poderiam continuar
mostrando os textos antigos. As URLs dos scripts alterados também foram renovadas
para evitar reutilização do cache HTTP. O teste de migração/recarga offline passou.
Não há limpeza de localStorage, IndexedDB ou dados/projetos dos usuários.

## Validação executada

Referência **antes de editar**: integridade estática, catálogo oficial e sincronismo
de versão aprovados; teste de navegador em modo `--baseline` aprovado na base acima.

Depois da alteração:

- `tests/nomenclature-3.test.py`: aprovado em Chromium e Firefox, 1440 e 390 px,
  nos temas claro/escuro. Verifica aba, rodapé, cartão, buscas antiga/nova/WEBP,
  menu Converter, navegação, workspace, disponibilidade das 34 funções e 39 atalhos.
  Importa JPG, PNG e WEBP sintéticos, baixa/reabre o PDF com três páginas e confere
  dimensões e amostras de cor. Os resultados por navegador são iguais aos da base
  em `before/report.json` e `after/report.json`.
- Rotação de imagens: aprovado em Chromium/Firefox, computador/celular; rotação,
  pixels de referência, projeto restaurado, saída separada e 39 ícones preservados.
- Cache: migração, atualização online e fallback offline aprovados.
- Paridade funcional e conversões existentes: aprovadas.
- Admin: 28 testes aprovados, incluindo aliases do nome antigo; build aprovado.
- Build React aprovado; nenhum arquivo em `app/` foi alterado. O aviso existente
  sobre tamanho de chunks permanece visível.
- Suíte JavaScript, sintaxe, seis testes de integridade do pacote estático,
  versões, catálogo oficial, integridade estática e `git diff --check`: aprovados.

Os checks da PR são a referência para a CI completa no head revisado. Não se
apresentam testes futuros ou não executados como aprovados.

## Entrega e limites

Somente PR para revisão: sem merge, publicação do Pages/Admin, tag ou release.
O ZIP 3.0.0 e os lançamentos anteriores permanecem intactos. A identidade de uma
PWA já instalada também depende de quando o navegador reaplica seu manifest.
Reverter esta mudança não exige apagar preferências ou projetos; uma reversão
publicada precisa renovar novamente a revisão de cache.
