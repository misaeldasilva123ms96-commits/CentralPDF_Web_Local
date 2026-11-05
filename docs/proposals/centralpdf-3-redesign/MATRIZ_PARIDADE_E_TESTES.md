# Matriz de paridade funcional e critérios de teste — Central PDF 3.0

**Status: matriz de aceitação planejada. Testes listados abaixo NÃO foram executados nesta branch.**

Fonte de verdade para o inventário: `assets/js/app.js` → `toolConfig` (produto publicado); `docs/reference/MODULES.md` (34 ferramentas); `tests/tool-regression-real.py` e auditoria sintética de 25/10/2026 (evidência histórica, não certificação atual).

## 1. Relação entre catálogo e cartões

| Fonte | Quantidade | Regra |
| --- | ---: | --- |
| Módulos do catálogo funcional do site | 34 | Manter todos e seus identificadores reais |
| Atalhos/car­tões da prévia 3.0 | 39 | 39 acessos visuais a módulos reais; não são 39 motores separados |
| `pdfToOffice` | 1 módulo → 3 atalhos | PDF para Word, Excel e PowerPoint |
| `documentsToPdf` | 1 módulo → 4 atalhos | Word, Excel, PowerPoint, Texto/HTML para PDF |
| Demais módulos | 32 módulos → 32 atalhos | Relação 1:1 no catálogo visual |

Verificar a relação no código antes de nomear ou reordenar, especialmente `data-tool`, `data-shortcut`, formatos predefinidos e preferências. Um clique de atalho deve preselecionar o formato e acionar a ferramenta real.

## 2. Inventário funcional completo (34/34)

Legenda: “Verificar” = obrigação futura, **não** execução realizada.

| Nº | Ferramenta publicada | O que não pode regredir com o visual | Estado |
| ---: | --- | --- | --- |
| 01 | Organizar PDF | Miniaturas, arraste/ordem, girar, excluir, duplicar, inserir, salvar cópia | Verificar |
| 02 | Editar PDF | Editor básico/avançado, texto nativo, imagens, assinatura visual, seleção, histórico, exportação | Verificar |
| 03 | Juntar PDFs | Múltiplos PDFs, ordem, capas representam documentos inteiros, contagem, saída única | Verificar |
| 04 | Dividir PDF | 6 modos apresentados, intervalos, prévia, saída PDF/ZIP, páginas corretas | Verificar |
| 05 | Extrair páginas | Inclusão/remoção de páginas, intervalo e ordem | Verificar |
| 06 | Girar páginas | Seleção e rotação correta na saída | Verificar |
| 07 | Marca-d’água | Texto, transparência, posição e exportação | Verificar |
| 08 | Numerar páginas | Formato, posição, início e prévia | Verificar |
| 09 | Imagens para PDF | Seleção de imagens, giro, orientação, escala, ordem | Verificar |
| 10 | Converter imagens | JPG/PNG, dimensões, qualidade e lote | Verificar |
| 11 | Comprimir PDF | Modos, qualidade, redução, comparação e download | Verificar |
| 12 | PDF para imagens | Resolução, imagens por página e pacote final | Verificar |
| 13 | Recortar PDF | Margens e aparência exportada | Verificar |
| 14 | Limpar metadados | Remoção efetiva dos campos selecionados | Verificar |
| 15 | Normalizar PDF | Regravação e compatibilidade da estrutura | Verificar |
| 16 | Extrair texto | Selecionabilidade, ordem e exportação TXT | Verificar |
| 17 | OCR pesquisável | Idioma, progresso, camada pesquisável e opções de saída | Verificar |
| 18 | PDF para Office | Atalhos Word/Excel/PPTX, seletor de formato, saída correspondente | Verificar |
| 19 | Documentos para PDF | Word/Excel/PPTX/Texto-HTML, pré-seleção e fidelidade dentro dos limites | Verificar |
| 20 | Extrair imagens do PDF | Recursos internos vs páginas, saída e manifesto | Verificar |
| 21 | Preparar para arquivamento | Normalização/rasterização, hashes e aviso de não certificação PDF/A | Verificar |
| 22 | Assistente documental | Respostas baseadas em evidências, limites locais e relatório | Verificar |
| 23 | Extração estruturada | Campos, CSV/JSON e evidência | Verificar |
| 24 | Auditoria documental | Verificação cruzada, divergências e relatório | Verificar |
| 25 | Classificar e renomear | Lotes, nomes, páginas suspeitas e exportação | Verificar |
| 26 | Comparar PDFs | Diferenças de texto/visual por página e relatório | Verificar |
| 27 | Censura definitiva | Remoção efetiva, prévia e ausência do texto na saída | Verificar |
| 28 | Criar formulário | Campos preenchíveis, tipos, posições e gravação | Verificar |
| 29 | Assinar e rubricar | Desenho/imagem/texto, escala, posição, rubricas; aviso de assinatura visual | Verificar |
| 30 | Proteger PDF | Senha, criptografia e permissões | Verificar |
| 31 | Remover senha | Senha conhecida, permissão e saída válida | Verificar |
| 32 | Diagnosticar PDF | Verificação de integridade, formulários e relatórios | Verificar |
| 33 | Recuperar PDF | Recuperação limitada, advertências e saída válida | Verificar |
| 34 | Fixar formulários | Achatamento preservando a aparência e removendo campos editáveis | Verificar |

## 3. Paridade transversal — todas as ferramentas

| Área | Cenário de aceite | Evidência exigida |
| --- | --- | --- |
| Navegação | Topo, cartões, busca, menus, breadcrumbs, voltar, mobile | Captura + clique real sem perda de estado não intencional |
| Temas | Claro, escuro, alternância, persistência, contraste | Capturas em ambos, foco visível e valores CSS |
| Importação | Clique, arrastar e soltar, arquivos inválidos, múltiplos, cancelar | Arquivos sintéticos importados e mensagens corretas |
| Processo | Ajustes corretos, progresso real, cancelamento cooperativo | Logs locais e resultado final válido |
| Exportação | PDF/ZIP/JPG/PNG/TXT/DOCX/XLSX/PPTX conforme módulo | Reabrir e verificar conteúdo, páginas, dimensões e SHA-256 |
| Projetos | Exportar/reabrir `.cpdf`, recuperação, continuidade | Restauração de estados/formulários em casos compatíveis |
| Histórico | Desfazer/refazer no editor, seleção e foco | Casos de regressão sem perder modificações |
| Configurações | Todas as seções e comandos antigos (exceto seletor de tema duplicado) | Cada item abre função real; nenhum ícone decorativo fingindo ação |
| Resultados/fluxos | Lista, download novamente, sequência de ações | Estado local e interoperabilidade |
| Segurança | Senhas, censura, assinatura visual, limpeza de metadados | Validar conteúdo de saída, não só overlay |
| Privacidade | Sem upload de documentos; controles de Sentry, limites/consentimento | Teste de rede e contratos de telemetria |
| Offline | Motores pré-preparados, SW/cache, inicializador Windows | Fluxo completo sem rede, conforme motor |
| Acessibilidade | Tab/Enter/Espaço/Esc, ARIA, screen reader, toque, zoom 200% | Checklist manual + ferramentas automáticas |
| Performance | Tempo inicial, arquivos grandes, uso de memória, viewport móvel | Comparação com baseline, sem degradação crítica |

## 4. Suites já existentes a reaproveitar

- `tests/product-redesign-functional-parity-2.0.test.py` (39 cartões, 39 atalhos laterais e contratos de DOM)
- `tests/tool-regression-real.py` (34 ferramentas com motores reais; não confiar só em mock)
- `tests/merge-cover-default.test.py`, `tests/merge-dragdrop.test.py`, `tests/merge-source-order.test.py`
- `tests/split-interactive-ui.test.py`, `tests/organizer-planner.test.js`
- `tests/editor-native-text.test.py`, `tests/ux-editor-modernization.test.py`, `tests/workspace-completion-actions-2.0.6.test.py`
- `tests/settings-theme-toggle.test.py`, `tests/layout-controls.test.py`, `tests/dark-theme-1.0.4.test.py`
- `tests/office-conversions.test.py`, `tests/ocr-0.16.test.py`, `tests/pdf-compatibility-gate.py`
- `tests/browser-network-guard.test.py`, `tests/diagnostics-telemetry.test.py`, `tests/offline-installer-integrity.test.py`

Os testes podem exigir adaptação de seletores da UI; a correção preferencial é preservar contratos e criar testes adicionais para novo DOM, não remover assertivas sem substituição.

## 5. Comandos para validação na futura branch de implementação

```bash
npm ci --prefix app
python -m pip install -r requirements-test.txt
python -m playwright install chromium

python scripts/run-browser-test.py tests/product-redesign-functional-parity-2.0.test.py
python scripts/run-browser-test.py tests/merge-cover-default.test.py
python scripts/run-browser-test.py tests/split-interactive-ui.test.py
python tests/tool-regression-real.py
python tests/static_integrity.py

npm --prefix app run typecheck
npm --prefix app test
npm --prefix app run build
python scripts/sync-tool-icons.py --check
```

Antes de rodar, consultar `CONTRIBUTING.md` e `.github/workflows/ci.yml` da branch vigente. Não assumir que comandos isolados substituem a CI completa, nem que a presença de um teste significa que ele passou.

## 6. Aceite dos três exemplos prioritários

Detalhes concretos: [EXEMPLOS_TELAS.md](./EXEMPLOS_TELAS.md). Em todos, o botão de seleção deve abrir importação **real** na implementação; aqui é apenas uma demonstração da disposição visual.

**Trava de merge:** nenhum dos três pode perder opções anteriores, gerar PDF/ZIP corrompido ou aparentar sucesso sem saída validada.
