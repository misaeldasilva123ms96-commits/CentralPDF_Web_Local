(() => {
  'use strict';

  const PDF_WORKER_URL = window.CentralPDFEnginePaths?.pdfWorkerRemote || 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/pdf.worker.min.mjs';
  const PDF_WORKER_LOCAL_URL = window.CentralPDFEnginePaths?.pdfWorker || 'vendor/pdfjs/pdf.worker.min.mjs';
  const HOME_STORAGE_KEY = 'central-pdf-last-tool';
  window.CentralPDFRuntimeFixes = Object.assign({}, window.CentralPDFRuntimeFixes, { pdfBufferIsolation: true });

  const toolConfig = {
    organize: {
      title: 'Organizar PDF',
      description: 'Edite cada página: reordene, gire, exclua, duplique e adicione páginas de PDFs, imagens ou páginas em branco.',
      accept: 'application/pdf,.pdf', multiple: false, typeLabel: 'PDF', button: 'Salvar PDF organizado', outputExt: 'pdf', outputBase: 'PDF_organizado',
      settings: '<div class="notice-card"><strong>Editor completo de páginas</strong><p>Use as ações individuais nas miniaturas ou selecione várias páginas para girar, duplicar, mover e excluir em lote.</p></div><label class="toggle-row"><input id="organizerPreserveMetadata" type="checkbox" checked /><span>Preservar metadados básicos do PDF original</span></label><p class="help-text">As alterações são aplicadas somente ao arquivo baixado. O original permanece intacto.</p>'
    },
    editPdf: {
      title: 'Editar PDF',
      description: 'Edite visualmente cada página com textos formatados, imagens, pincel, marcador, cobertura de áreas e recorte.',
      accept: 'application/pdf,.pdf', multiple: false, typeLabel: 'PDF', button: 'Salvar PDF editado', outputExt: 'pdf', outputBase: 'PDF_editado',
      settings: `
        <div class="notice-card"><strong>Editor visual não destrutivo</strong><p>Adicione conteúdo sobre o PDF e gere uma nova cópia. Para trocar um texto existente, cubra a área e escreva o novo texto por cima.</p></div>
        <div id="editorSelectionPanel" class="editor-selection-panel inactive">
          <div class="editor-selection-heading"><span>Objeto selecionado</span><strong id="editorSelectedType">Nenhum objeto selecionado</strong></div>
          <div id="editorTextControlsPanel">
            <div class="field"><label for="editorTextValue">Texto</label><textarea id="editorTextValue" rows="4" data-editor-text-control placeholder="Digite o texto que será inserido">Digite seu texto</textarea></div>
            <div class="field-row">
              <div class="field"><label for="editorFontFamily">Fonte</label><select id="editorFontFamily" data-editor-text-control><option value="Helvetica">Helvetica / Arial</option><option value="TimesRoman">Times / Georgia</option><option value="Courier">Courier</option></select></div>
              <div class="field"><label for="editorFontSize">Tamanho</label><input id="editorFontSize" data-editor-text-control type="number" min="6" max="120" value="16" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label for="editorTextColor">Cor do texto</label><input id="editorTextColor" data-editor-text-control type="color" value="#202735" /></div>
              <div class="field"><label for="editorTextOpacity">Opacidade (%)</label><input id="editorTextOpacity" data-editor-text-control type="number" min="5" max="100" value="100" /></div>
            </div>
            <div class="field-row editor-inline-options"><label class="toggle-row compact"><input id="editorBold" data-editor-text-control type="checkbox" /><span>Negrito</span></label><label class="toggle-row compact"><input id="editorItalic" data-editor-text-control type="checkbox" /><span>Itálico</span></label></div>
            <div class="field"><label for="editorTextAlign">Alinhamento</label><select id="editorTextAlign" data-editor-text-control><option value="left">Esquerda</option><option value="center">Centralizado</option><option value="right">Direita</option></select></div>
          </div>
          <div id="editorObjectSizePanel" class="editor-object-size-panel hidden">
            <div class="editor-transform-title"><strong>Posição e transformação</strong><span>Valores em pontos do PDF</span></div>
            <div class="field-row">
              <div class="field"><label for="editorObjectX">Posição X</label><input id="editorObjectX" type="number" min="0" step="1" /></div>
              <div class="field"><label for="editorObjectY">Posição Y</label><input id="editorObjectY" type="number" min="0" step="1" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label for="editorObjectWidth">Largura</label><input id="editorObjectWidth" type="number" min="10" step="1" /></div>
              <div class="field"><label for="editorObjectHeight">Altura</label><input id="editorObjectHeight" type="number" min="10" step="1" /></div>
            </div>
            <div class="field"><label for="editorObjectRotation">Rotação</label><div class="editor-rotation-field"><input id="editorObjectRotation" type="number" min="-360" max="360" step="1" value="0" /><span>°</span></div></div>
            <div class="editor-rotation-actions">
              <button id="editorRotateLeft" class="small-button" type="button" title="Girar 90 graus para a esquerda">↶ 90°</button>
              <button id="editorResetRotation" class="small-button" type="button">Zerar</button>
              <button id="editorRotateRight" class="small-button" type="button" title="Girar 90 graus para a direita">↷ 90°</button>
            </div>
            <label id="editorAspectRow" class="toggle-row compact"><input id="editorObjectLockAspect" type="checkbox" /><span>Manter proporção ao redimensionar</span></label>
            <button id="editorResetImageRatio" class="small-button full-width hidden" type="button">Restaurar proporção original da imagem</button>
            <div class="editor-alignment-block">
              <span>Alinhar na página</span>
              <div class="editor-alignment-actions">
                <button id="editorAlignLeft" class="small-button" type="button" title="Alinhar à esquerda">⇤</button>
                <button id="editorAlignCenterX" class="small-button" type="button" title="Centralizar horizontalmente">↔</button>
                <button id="editorAlignRight" class="small-button" type="button" title="Alinhar à direita">⇥</button>
                <button id="editorAlignTop" class="small-button" type="button" title="Alinhar ao topo">⇡</button>
                <button id="editorAlignCenterY" class="small-button" type="button" title="Centralizar verticalmente">↕</button>
                <button id="editorAlignBottom" class="small-button" type="button" title="Alinhar à base">⇣</button>
              </div>
            </div>
            <div class="editor-layer-actions">
              <button id="editorSendBackward" class="small-button" type="button">Enviar para trás</button>
              <button id="editorBringForward" class="small-button" type="button">Trazer à frente</button>
            </div>
            <button id="editorDuplicateObject" class="small-button full-width" type="button">Duplicar objeto</button>
            <p class="field-hint"><strong>No documento:</strong> use as oito alças para ajustar por qualquer lado e a alça circular superior para girar. Segure Shift para preservar a proporção e encaixar a rotação em intervalos de 15°.</p>
          </div>
          <button id="editorDeleteObject" class="small-button danger full-width" type="button" disabled>Excluir objeto selecionado</button>
        </div>
        <details class="editor-settings-group" open><summary>Pincel e marcador</summary>
          <div class="field-row"><div class="field"><label for="editorBrushColor">Cor do pincel</label><input id="editorBrushColor" type="color" value="#1f2937" /></div><div class="field"><label for="editorBrushWidth">Espessura</label><input id="editorBrushWidth" type="number" min="1" max="40" value="3" /></div></div>
          <div class="field-row"><div class="field"><label for="editorHighlightColor">Cor do marcador</label><input id="editorHighlightColor" type="color" value="#fff176" /></div><div class="field"><label for="editorHighlightWidth">Espessura</label><input id="editorHighlightWidth" type="number" min="4" max="80" value="16" /></div></div>
          <button id="editorClearDrawings" class="small-button full-width" type="button">Limpar desenhos da página atual</button>
        </details>
        <details class="editor-settings-group"><summary>Cobrir ou substituir conteúdo</summary>
          <div class="field-row"><div class="field"><label for="editorCoverColor">Cor da cobertura</label><input id="editorCoverColor" type="color" value="#ffffff" /></div><div class="field"><label for="editorCoverOpacity">Opacidade (%)</label><input id="editorCoverOpacity" type="number" min="5" max="100" value="100" /></div></div>
          <div class="notice-card warning"><strong>Não é redação segura</strong><p>A cobertura apenas oculta visualmente. O conteúdo interno original pode continuar existindo no PDF.</p></div>
        </details>
        <details class="editor-settings-group"><summary>Recorte da página</summary>
          <p class="help-text">Escolha a ferramenta Recortar, arraste sobre a página e confirme abaixo.</p>
          <div class="field-row"><button id="editorApplyCrop" class="small-button primary-soft" type="button">Aplicar recorte</button><button id="editorResetCrop" class="small-button" type="button">Remover recorte</button></div>
        </details>
        <div class="notice-card"><strong>Fontes do PDF final</strong><p>O resultado usa Helvetica, Times ou Courier, que são fontes padrão compatíveis com leitores de PDF.</p></div>`
    },
    merge: {
      title: 'Juntar PDFs', description: 'Adicione os documentos e organize todas as páginas em uma única área visual. A sequência das miniaturas será a sequência exata do PDF final.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Juntar PDFs', outputExt: 'pdf', outputBase: 'PDF_unido',
      settings: `
        <div class="notice-card"><strong>Uma única organização</strong><p>Não há modos separados. Arraste, gire, duplique, exclua ou adicione páginas diretamente no organizador central.</p></div>
        <div id="mergeLargeBatchNotice" class="notice-card hidden"><strong>Modo para lote grande ativado</strong><p id="mergeLargeBatchText">A exportação será feita em etapas para reduzir o uso de memória.</p></div>
        <label class="toggle-row"><input id="mergePreserveMetadata" type="checkbox" checked /><span>Preservar os metadados do primeiro PDF</span></label>
        <div class="merge-source-summary">
          <div class="split-plan-header"><span>Documentos da união</span><strong id="mergePlanCount">0 páginas</strong></div>
          <div class="merge-source-toolbar">
            <label for="mergeSourceSort"><span>Ordenar documentos</span><select id="mergeSourceSort">
              <option value="nameAsc" selected>Nome: A → Z</option>
              <option value="manual">Ordem manual</option>
              <option value="added">Ordem de adição</option>
              <option value="nameDesc">Nome: Z → A</option>
              <option value="numberAsc">Número do nome: menor → maior</option>
              <option value="numberDesc">Número do nome: maior → menor</option>
              <option value="pagesDesc">Mais páginas primeiro</option>
              <option value="pagesAsc">Menos páginas primeiro</option>
              <option value="sizeDesc">Maior arquivo primeiro</option>
              <option value="sizeAsc">Menor arquivo primeiro</option>
              <option value="newest">Modificado mais recentemente</option>
              <option value="oldest">Modificado há mais tempo</option>
            </select></label>
            <button id="mergeReverseSources" class="small-button" type="button" title="Inverter a ordem atual">⇅ Inverter</button>
          </div>
          <div id="mergePlanPreview" class="merge-source-list"><div class="split-plan-empty">Adicione pelo menos dois PDFs.</div></div>
          <p class="field-hint"><strong>Arraste os documentos</strong> para mudar a ordem. A ordenação automática mantém a ordem interna atual das páginas de cada documento e agrupa as páginas pela origem.</p>
        </div>`
    },
    split: {
      title: 'Dividir PDF', description: 'Divida por página, grupos personalizados, partes iguais, quantidade fixa ou pontos de corte.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Gerar divisão', outputExt: 'auto', outputLabel: 'PDF ou ZIP', outputBase: 'PDF_dividido',
      settings: `
        <div class="field"><label for="splitMode">Como deseja dividir?</label>
          <select id="splitMode">
            <option value="custom" selected>Intervalos personalizados</option>
            <option value="equalParts">Dividir em partes iguais</option>
            <option value="fixedSize">A cada quantidade de páginas</option>
            <option value="cuts">Cortar depois de páginas específicas</option>
            <option value="everyPage">Uma página por arquivo</option>
            <option value="oddEven">Separar páginas pares e ímpares</option>
          </select>
        </div>
        <div class="split-mode-panel" data-split-panel="custom">
          <div class="field"><label for="splitCustomGroups">Grupos de páginas</label><textarea id="splitCustomGroups" rows="4" placeholder="Exemplo: 1-2;3-5;6,8-10"></textarea></div>
          <p class="field-hint">Separe os arquivos com ponto e vírgula. Cada grupo vira um PDF.</p>
          <label class="toggle-row"><input id="splitIncludeUnmentioned" type="checkbox" /><span>Adicionar páginas não mencionadas em um arquivo extra</span></label>
        </div>
        <div class="split-mode-panel hidden" data-split-panel="equalParts">
          <div class="field"><label for="splitPartCount">Quantidade de partes</label><input id="splitPartCount" type="number" min="2" value="2" /></div>
          <p class="field-hint">Exemplo: um PDF de 10 páginas dividido em 2 partes gera páginas 1-5 e 6-10.</p>
        </div>
        <div class="split-mode-panel hidden" data-split-panel="fixedSize">
          <div class="field"><label for="splitPagesPerFile">Páginas por arquivo</label><input id="splitPagesPerFile" type="number" min="1" value="2" /></div>
          <p class="field-hint">Exemplo: a cada 2 páginas gera 1-2, 3-4, 5-6...</p>
        </div>
        <div class="split-mode-panel hidden" data-split-panel="cuts">
          <div class="field"><label for="splitCuts">Cortar depois das páginas</label><input id="splitCuts" placeholder="Exemplo: 2,5" /></div>
          <p class="field-hint">Com cortes em 2 e 5, o resultado será 1-2, 3-5 e 6 até o final.</p>
        </div>
        <div class="split-mode-panel hidden" data-split-panel="everyPage"><div class="notice-card"><strong>Uma página por arquivo</strong><p>Cada página será salva em um PDF independente.</p></div></div>
        <div class="split-mode-panel hidden" data-split-panel="oddEven"><div class="notice-card"><strong>Pares e ímpares</strong><p>Será criado um PDF com páginas ímpares e outro com páginas pares.</p></div></div>
        <div id="splitDocumentInfo" class="notice-card"><strong>Documento</strong><p>Adicione um PDF para calcular a divisão.</p></div>
        <div class="split-plan-box">
          <div class="split-plan-header"><span>Prévia do resultado</span><strong id="splitPlanCount">0 arquivos</strong></div>
          <div id="splitPlanPreview" class="split-plan-preview"><div class="split-plan-empty">O plano aparecerá aqui.</div></div>
        </div>
        <label class="toggle-row"><input id="splitIncludeManifest" type="checkbox" checked /><span>Incluir relatório TXT com a divisão dentro do ZIP</span></label>`
    },
    extract: {
      title: 'Extrair ou remover páginas', description: 'Extraia páginas em um ou vários PDFs, remova páginas ou separe pares e ímpares.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Gerar resultado', outputExt: 'auto', outputBase: 'paginas_extraidas',
      settings: `
        <div class="field"><label for="extractMode">Operação</label><select id="extractMode"><option value="single">Extrair páginas para um PDF</option><option value="groups">Extrair grupos para vários PDFs</option><option value="remove">Remover páginas informadas</option><option value="odd">Manter somente páginas ímpares</option><option value="even">Manter somente páginas pares</option><option value="oddEven">Gerar um PDF par e outro ímpar</option></select></div>
        <div data-extract-panel="single"><div class="field"><label for="extractPages">Páginas e ordem</label><input id="extractPages" placeholder="Exemplo: 5,1-3,8" /></div><label class="toggle-row"><input id="extractAllowDuplicates" type="checkbox" /><span>Permitir repetir páginas no resultado</span></label></div>
        <div data-extract-panel="groups" class="hidden"><div class="field"><label for="extractGroups">Grupos</label><textarea id="extractGroups" rows="4" placeholder="Exemplo: 1-3;4-6;1,5,9"></textarea></div><p class="field-hint">Cada grupo separado por ponto e vírgula gera um PDF.</p><label class="toggle-row"><input id="extractManifest" type="checkbox" checked /><span>Incluir relatório dos arquivos gerados</span></label></div>
        <div data-extract-panel="remove" class="hidden"><div class="field"><label for="extractRemovePages">Páginas para excluir</label><input id="extractRemovePages" placeholder="Exemplo: 1,4-6" /></div></div>
        <div id="extractDocumentInfo" class="notice-card"><strong>Documento</strong><p>Adicione um PDF para calcular o resultado.</p></div>
        <div class="split-plan-box"><div class="split-plan-header"><span>Prévia do resultado</span><strong id="extractPlanCount">0 arquivos</strong></div><div id="extractPlanPreview" class="split-plan-preview"><div class="split-plan-empty">O plano aparecerá aqui.</div></div></div>`
    },
    rotate: {
      title: 'Girar páginas', description: 'Gire páginas específicas, pares, ímpares ou páginas detectadas pela orientação.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Girar PDF(s)', outputExt: 'auto', outputBase: 'PDFs_girados',
      settings: `
        <div class="field"><label for="rotationAngle">Rotação</label><select id="rotationAngle"><option value="90">90° para a direita</option><option value="180">180°</option><option value="270">90° para a esquerda</option><option value="0">Remover rotação e deixar em 0°</option></select></div>
        <div class="field"><label for="rotateMode">Aplicar em</label><select id="rotateMode"><option value="all">Todas as páginas</option><option value="selected">Páginas informadas</option><option value="odd">Páginas ímpares</option><option value="even">Páginas pares</option><option value="portrait">Somente páginas em retrato</option><option value="landscape">Somente páginas em paisagem</option></select></div>
        <div id="rotatePagesPanel" class="hidden"><div class="field"><label for="rotatePages">Páginas</label><input id="rotatePages" placeholder="Exemplo: 2-4,8" /></div></div>
        <div class="field"><label for="rotateBehavior">Comportamento</label><select id="rotateBehavior"><option value="relative">Somar à rotação atual</option><option value="absolute">Definir exatamente o ângulo escolhido</option></select></div>
        <div class="notice-card"><strong>Processamento em lote</strong><p>A mesma regra será aplicada separadamente a todos os PDFs selecionados.</p></div>`
    },
    watermark: {
      title: 'Marca-d’água avançada', description: 'Use texto ou imagem, posição livre, repetição, cor, rotação e seleção de páginas.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Aplicar marca-d’água', outputExt: 'auto', outputBase: 'PDFs_com_marca_dagua',
      settings: `
        <div class="field"><label for="watermarkType">Tipo</label><select id="watermarkType"><option value="text">Texto</option><option value="image">Imagem ou logotipo</option></select></div>
        <div id="watermarkTextPanel"><div class="field"><label for="watermarkText">Texto</label><textarea id="watermarkText" rows="3">CONFIDENCIAL</textarea></div><div class="field-row"><div class="field"><label for="watermarkFont">Fonte</label><select id="watermarkFont"><option value="bold">Helvetica em negrito</option><option value="regular">Helvetica regular</option></select></div><div class="field"><label for="watermarkColor">Cor</label><input id="watermarkColor" type="color" value="#777777" /></div></div></div>
        <div id="watermarkImagePanel" class="hidden"><div class="field"><label for="watermarkImageFile">Imagem PNG ou JPG</label><input id="watermarkImageFile" type="file" accept="image/png,image/jpeg" /></div><p class="field-hint">Imagens PNG podem preservar transparência.</p></div>
        <div class="field-row"><div class="field"><label for="watermarkSize">Tamanho (%)</label><input id="watermarkSize" type="number" min="5" max="100" value="45" /></div><div class="field"><label for="watermarkOpacity">Opacidade (%)</label><input id="watermarkOpacity" type="number" min="3" max="100" value="20" /></div></div>
        <div class="field-row"><div class="field"><label for="watermarkRotation">Rotação</label><input id="watermarkRotation" type="number" min="-180" max="180" value="-35" /></div><div class="field"><label for="watermarkPattern">Repetição</label><select id="watermarkPattern"><option value="single">Uma marca</option><option value="tile">Repetir pela página</option></select></div></div>
        <div class="field"><label for="watermarkPosition">Posição</label><select id="watermarkPosition"><option value="center">Centro</option><option value="top-left">Topo esquerdo</option><option value="top-center">Topo central</option><option value="top-right">Topo direito</option><option value="bottom-left">Rodapé esquerdo</option><option value="bottom-center">Rodapé central</option><option value="bottom-right">Rodapé direito</option></select></div>
        <div class="field"><label for="watermarkScope">Páginas</label><select id="watermarkScope"><option value="all">Todas</option><option value="selected">Informar páginas</option><option value="odd">Ímpares</option><option value="even">Pares</option><option value="first">Somente a primeira</option><option value="last">Somente a última</option></select></div>
        <div id="watermarkPagesPanel" class="hidden"><div class="field"><label for="watermarkPages">Páginas</label><input id="watermarkPages" placeholder="Exemplo: 1,3-5" /></div></div>
        <div class="notice-card"><strong>Prévia conceitual</strong><p id="watermarkSummary">Uma marca de texto central será aplicada em todas as páginas.</p></div>`
    },
    pageNumbers: {
      title: 'Numerar páginas avançado', description: 'Defina escopo, formato personalizado, páginas iniciais ignoradas e posição alternada.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Numerar PDF(s)', outputExt: 'auto', outputBase: 'PDFs_numerados',
      settings: `
        <div class="field"><label for="numberFormat">Formato</label><select id="numberFormat"><option value="{n}">1</option><option value="Página {n}">Página 1</option><option value="{n} de {total}">1 de 10</option><option value="Página {n} de {total}">Página 1 de 10</option><option value="custom">Personalizado</option></select></div>
        <div id="numberCustomPanel" class="hidden"><div class="field"><label for="numberCustomFormat">Modelo</label><input id="numberCustomFormat" value="Folha {n} / {total}" /></div><p class="field-hint">Variáveis: {n} número exibido, {total} total numerado e {page} página física.</p></div>
        <div class="field"><label for="numberScope">Páginas a numerar</label><select id="numberScope"><option value="all">Todas</option><option value="selected">Informar páginas</option><option value="odd">Ímpares</option><option value="even">Pares</option></select></div>
        <div id="numberPagesPanel" class="hidden"><div class="field"><label for="numberPages">Páginas</label><input id="numberPages" placeholder="Exemplo: 3-10" /></div></div>
        <div class="field-row"><div class="field"><label for="numberSkip">Ignorar primeiras</label><input id="numberSkip" type="number" min="0" value="0" /></div><div class="field"><label for="numberStart">Primeiro número</label><input id="numberStart" type="number" value="1" /></div></div>
        <div class="field-row"><div class="field"><label for="numberSize">Tamanho</label><input id="numberSize" type="number" min="6" max="48" value="10" /></div><div class="field"><label for="numberColor">Cor</label><input id="numberColor" type="color" value="#333333" /></div></div>
        <div class="field"><label for="numberPosition">Posição</label><select id="numberPosition"><option value="bottom-center">Rodapé central</option><option value="bottom-right">Rodapé direito</option><option value="bottom-left">Rodapé esquerdo</option><option value="top-center">Topo central</option><option value="top-right">Topo direito</option><option value="top-left">Topo esquerdo</option><option value="outer-bottom">Rodapé externo alternado</option><option value="inner-bottom">Rodapé interno alternado</option></select></div>
        <div class="field-row"><div class="field"><label for="numberMargin">Margem</label><input id="numberMargin" type="number" min="5" max="100" value="24" /></div><div class="field"><label for="numberTotalMode">Total mostrado</label><select id="numberTotalMode"><option value="numbered">Páginas numeradas</option><option value="document">Total do documento</option></select></div></div>
        <label class="toggle-row"><input id="numberBackground" type="checkbox" /><span>Adicionar fundo branco discreto atrás do número</span></label>`
    },
    imagesToPdf: {
      title: 'Imagens para PDF avançado', description: 'Controle página, orientação, margens, encaixe e saída combinada ou separada.',
      accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', multiple: true, typeLabel: 'JPG, PNG ou WEBP', button: 'Criar PDF(s)', outputExt: 'auto', outputBase: 'imagens_convertidas',
      settings: `
        <div class="field"><label for="imageOutputMode">Resultado</label><select id="imageOutputMode"><option value="combined">Um PDF com todas as imagens</option><option value="separate">Um PDF para cada imagem</option></select></div>
        <div class="field"><label for="imagePageMode">Tamanho da página</label><select id="imagePageMode"><option value="image">Ajustar à imagem</option><option value="a4">A4</option><option value="letter">Carta</option><option value="custom">Personalizado</option></select></div>
        <div id="imageCustomPagePanel" class="hidden"><div class="field-row"><div class="field"><label for="imageCustomWidth">Largura (mm)</label><input id="imageCustomWidth" type="number" min="20" value="210" /></div><div class="field"><label for="imageCustomHeight">Altura (mm)</label><input id="imageCustomHeight" type="number" min="20" value="297" /></div></div></div>
        <div class="field-row"><div class="field"><label for="imageOrientation">Orientação</label><select id="imageOrientation"><option value="auto">Automática</option><option value="portrait">Retrato</option><option value="landscape">Paisagem</option></select></div><div class="field"><label for="imageMargin">Margem (mm)</label><input id="imageMargin" type="number" min="0" value="10" /></div></div>
        <div class="field"><label for="imageFit">Encaixe</label><select id="imageFit"><option value="contain">Conter imagem inteira</option><option value="cover">Preencher e cortar excesso</option><option value="stretch">Esticar para preencher</option></select></div>
        <div class="field-row"><div class="field"><label for="imageAlign">Alinhamento</label><select id="imageAlign"><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Rodapé</option></select></div><div class="field"><label for="imageBackground">Fundo</label><input id="imageBackground" type="color" value="#ffffff" /></div></div>
        <label class="toggle-row"><input id="imageNoUpscale" type="checkbox" checked /><span>Não ampliar imagens menores</span></label>`
    },
    imageConvert: {
      title: 'Converter imagens', description: 'Converta, reduza ou redimensione várias imagens de uma vez.',
      accept: 'image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif', multiple: true, typeLabel: 'Imagens', button: 'Converter imagens', outputExt: 'auto', outputBase: 'imagens_convertidas',
      settings: '<div class="field"><label for="outputFormat">Formato</label><select id="outputFormat"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WEBP</option></select></div><div class="field-row"><div class="field"><label for="maxWidth">Largura máxima</label><input id="maxWidth" type="number" min="1" value="1920" /></div><div class="field"><label for="maxHeight">Altura máxima</label><input id="maxHeight" type="number" min="1" value="1080" /></div></div><div class="field"><label for="quality">Qualidade JPG/WEBP</label><input id="quality" type="number" min="10" max="100" value="88" /></div><p class="help-text">Mantém a proporção e não amplia imagens menores.</p>'
    },
    compress: {
      title: 'Comprimir PDF avançado', description: 'Analise o conteúdo e comprima somente páginas com imagens relevantes, preservando texto e vetores quando possível.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Comprimir PDF(s)', outputExt: 'auto', outputBase: 'PDFs_comprimidos',
      settings: `
        <div class="field"><label for="compressionMode">Perfil</label><select id="compressionMode"><option value="preserve">Estrutural — preservar texto e links</option><option value="recommended" selected>Automático — boa qualidade e boa redução</option><option value="extreme">Forte — priorizar arquivo menor</option><option value="custom">Personalizada</option></select></div>
        <div id="compressionCustomPanel" class="hidden"><div class="field-row"><div class="field"><label for="compressionDpi">DPI</label><input id="compressionDpi" type="number" min="60" max="300" value="120" /></div><div class="field"><label for="compressionQuality">Qualidade JPG (%)</label><input id="compressionQuality" type="number" min="30" max="100" value="68" /></div></div><label class="toggle-row"><input id="compressionGrayscale" type="checkbox" /><span>Converter as páginas rasterizadas para tons de cinza</span></label></div>
        <div class="field"><label for="compressionScope">Páginas a rasterizar</label><select id="compressionScope"><option value="all">Todas</option><option value="selected">Informar páginas</option><option value="odd">Ímpares</option><option value="even">Pares</option></select></div>
        <div id="compressionPagesPanel" class="hidden"><div class="field"><label for="compressionPages">Páginas</label><input id="compressionPages" placeholder="Exemplo: 1-5,9" /></div></div>
        <label class="toggle-row"><input id="compressionStripMetadata" type="checkbox" checked /><span>Remover metadados básicos</span></label>
        <label class="toggle-row"><input id="compressionKeepSmaller" type="checkbox" checked /><span>Manter o original quando a versão comprimida ficar maior</span></label>
        <label class="toggle-row"><input id="compressionReport" type="checkbox" checked /><span>Incluir relatório TXT com tamanho antes e depois</span></label>
        <div class="notice-card warning"><strong>Rasterização</strong><p>No modo Automático, o motor prioriza nitidez: preserva páginas com texto e vetores e só reconstrói páginas escaneadas ou dominadas por imagens. O modo Forte busca arquivos menores e pode reduzir mais a qualidade. Nas páginas reconstruídas, texto selecionável, links, formulários e assinaturas deixam de existir.</p></div>`
    },
    pdfToImage: {
      title: 'PDF para imagens avançado', description: 'Converta páginas selecionadas para JPG, PNG ou WEBP, com DPI, cor e organização configuráveis.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Converter páginas', outputExt: 'auto', outputBase: 'PDF_para_imagens',
      settings: `
        <div class="field"><label for="pdfImageFormat">Formato</label><select id="pdfImageFormat"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WEBP</option></select></div>
        <div class="field-row"><div class="field"><label for="pdfImageDpi">Resolução</label><select id="pdfImageDpi"><option value="96">96 DPI — tela</option><option value="150" selected>150 DPI — recomendado</option><option value="200">200 DPI — alta</option><option value="300">300 DPI — impressão</option></select></div><div class="field"><label for="pdfImageQuality">Qualidade (%)</label><input id="pdfImageQuality" type="number" min="30" max="100" value="88" /></div></div>
        <div class="field"><label for="pdfImageScope">Páginas</label><select id="pdfImageScope"><option value="all">Todas</option><option value="selected">Informar páginas</option><option value="odd">Ímpares</option><option value="even">Pares</option><option value="first">Somente a primeira</option><option value="last">Somente a última</option></select></div>
        <div id="pdfImagePagesPanel" class="hidden"><div class="field"><label for="pdfImagePages">Páginas</label><input id="pdfImagePages" placeholder="Exemplo: 1-3,5" /></div></div>
        <div class="field"><label for="pdfImageOutputMode">Organização</label><select id="pdfImageOutputMode"><option value="pages">Uma imagem por página</option><option value="contact">Folha de contato por PDF</option></select></div>
        <div id="pdfImageContactPanel" class="hidden"><div class="field"><label for="pdfImageColumns">Colunas da folha de contato</label><input id="pdfImageColumns" type="number" min="1" max="6" value="3" /></div></div>
        <label class="toggle-row"><input id="pdfImageGrayscale" type="checkbox" /><span>Converter para tons de cinza</span></label>
        <label class="toggle-row"><input id="pdfImageTransparent" type="checkbox" /><span>Fundo transparente quando o formato for PNG</span></label>
        <div class="field"><label for="pdfImagePrefix">Prefixo dos arquivos</label><input id="pdfImagePrefix" value="pagina" /></div>`
    },
    crop: {
      title: 'Recortar PDF avançado', description: 'Recorte por milímetros, percentual ou tamanho central e escolha entre recorte visual e reconstrução.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Recortar PDF(s)', outputExt: 'auto', outputBase: 'PDFs_recortados',
      settings: `
        <div class="field"><label for="cropMode">Modo</label><select id="cropMode"><option value="margins">Margens em milímetros</option><option value="percent">Margens em percentual</option><option value="center">Manter área central com tamanho definido</option><option value="presetHeader">Remover cabeçalho de 25 mm</option><option value="presetFooter">Remover rodapé de 25 mm</option><option value="presetEdges">Remover 10 mm de todas as bordas</option></select></div>
        <div id="cropMarginsPanel"><div class="field-row"><div class="field"><label for="cropTop">Topo</label><input id="cropTop" type="number" min="0" step="0.5" value="0" /></div><div class="field"><label for="cropRight">Direita</label><input id="cropRight" type="number" min="0" step="0.5" value="0" /></div></div><div class="field-row"><div class="field"><label for="cropBottom">Rodapé</label><input id="cropBottom" type="number" min="0" step="0.5" value="0" /></div><div class="field"><label for="cropLeft">Esquerda</label><input id="cropLeft" type="number" min="0" step="0.5" value="0" /></div></div><p id="cropUnitHint" class="field-hint">Valores em milímetros.</p></div>
        <div id="cropCenterPanel" class="hidden"><div class="field-row"><div class="field"><label for="cropCenterWidth">Largura (mm)</label><input id="cropCenterWidth" type="number" min="10" value="180" /></div><div class="field"><label for="cropCenterHeight">Altura (mm)</label><input id="cropCenterHeight" type="number" min="10" value="250" /></div></div></div>
        <div class="field"><label for="cropScope">Páginas</label><select id="cropScope"><option value="all">Todas</option><option value="selected">Informar páginas</option><option value="odd">Ímpares</option><option value="even">Pares</option></select></div>
        <div id="cropPagesPanel" class="hidden"><div class="field"><label for="cropPages">Páginas</label><input id="cropPages" placeholder="Exemplo: 2-8" /></div></div>
        <div class="field"><label for="cropBehavior">Tipo de recorte</label><select id="cropBehavior"><option value="visual">Visual e reversível pelo editor</option><option value="rebuild">Reconstruir a página na nova dimensão</option></select></div>
        <div class="notice-card warning"><strong>Importante</strong><p>O modo visual apenas altera a área exibida. O modo reconstruir remove a área externa da nova página, mas pode perder anotações, links e formulários.</p></div>`
    },
    metadata: {
      title: 'Limpar metadados', description: 'Remova título, autor, assunto, palavras-chave, programa criador e produtor.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Limpar metadados', outputExt: 'auto', outputBase: 'PDFs_sem_metadados',
      settings: '<div class="check-list"><label><input id="metaTitle" type="checkbox" checked /> Título e assunto</label><label><input id="metaAuthor" type="checkbox" checked /> Autor</label><label><input id="metaKeywords" type="checkbox" checked /> Palavras-chave</label><label><input id="metaSoftware" type="checkbox" checked /> Criador e produtor</label></div><p class="help-text">O conteúdo e a aparência das páginas não são alterados.</p>'
    },
    normalize: {
      title: 'Normalizar PDF', description: 'Regrave a estrutura do PDF para corrigir inconsistências simples e melhorar compatibilidade.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Normalizar PDF(s)', outputExt: 'auto', outputBase: 'PDFs_normalizados',
      settings: '<label class="toggle-row"><input id="normalizeMetadata" type="checkbox" /> Limpar metadados básicos durante a normalização</label><div class="notice-card warning"><strong>Limite do reparo local</strong><p>Este módulo reconstrói PDFs que ainda podem ser abertos. Arquivos gravemente corrompidos exigem um motor nativo como qpdf ou Ghostscript.</p></div>'
    },
    pdfToText: {
      title: 'Extrair texto do PDF', description: 'Extraia o texto selecionável de todas as páginas para TXT, sem enviar o documento.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Extrair texto', outputExt: 'auto', outputBase: 'textos_extraidos',
      settings: '<label class="toggle-row"><input id="textPageHeaders" type="checkbox" checked /> Incluir separadores com número da página</label><div class="notice-card"><strong>Documentos escaneados</strong><p>Esta função extrai apenas texto já existente no PDF. Para fotos e digitalizações sem camada de texto, use OCR e PDF pesquisável.</p></div>'
   
    },
    ocr: {
      title: 'OCR e PDF pesquisável', description: 'Reconheça texto em PDFs escaneados e imagens, preserve páginas digitais e gere PDF pesquisável, TXT e relatório de confiança.',
      accept: 'application/pdf,image/png,image/jpeg,image/webp,image/bmp,.pdf,.png,.jpg,.jpeg,.webp,.bmp', multiple: true, typeLabel: 'PDF ou imagem', button: 'Executar OCR', outputExt: 'auto', outputBase: 'OCR_resultados',
      settings: `
        <div class="engine-banner ocr-engine-status"><span>OCR</span><div><strong>Reconhecimento local com Tesseract.js</strong><p>O PDF é renderizado pelo PDF.js e reconhecido no navegador. Use o inicializador local e prepare o modo offline para documentos sigilosos.</p></div></div>
        <div class="field"><label for="ocrOutputMode">Resultado</label><select id="ocrOutputMode"><option value="searchable">PDF pesquisável</option><option value="searchable-text">PDF pesquisável + TXT</option><option value="text">Somente texto TXT</option><option value="audit">PDF + TXT + relatório JSON</option></select></div>
        <div class="field-row"><div class="field"><label for="ocrLanguage">Idioma</label><select id="ocrLanguage"><option value="por">Português</option><option value="por+eng">Português + inglês</option><option value="eng">Inglês</option></select></div><div class="field"><label for="ocrDpi">Resolução</label><select id="ocrDpi"><option value="150">150 DPI — rápido</option><option value="200" selected>200 DPI — recomendado</option><option value="300">300 DPI — alta precisão</option></select></div></div>
        <div class="field"><label for="ocrRecognitionMode">Reconhecimento</label><select id="ocrRecognitionMode"><option value="automatic">Automático — preservar páginas que já têm texto</option><option value="force">Forçar OCR em todas as páginas escolhidas</option></select></div>
        <div class="field-row"><div class="field"><label for="ocrPageScope">Páginas</label><select id="ocrPageScope"><option value="all">Todas</option><option value="selected">Informar páginas</option><option value="odd">Ímpares</option><option value="even">Pares</option></select></div><div class="field"><label for="ocrPageSegMode">Layout do texto</label><select id="ocrPageSegMode"><option value="auto">Automático</option><option value="column">Uma coluna</option><option value="block">Um bloco uniforme</option><option value="sparse">Texto esparso</option></select></div></div>
        <div id="ocrPagesPanel" class="hidden"><div class="field"><label for="ocrPages">Páginas</label><input id="ocrPages" placeholder="Exemplo: 1-3,5,8" /></div></div>
        <div class="field-row"><div class="field"><label for="ocrManualRotation">Girar antes do OCR</label><select id="ocrManualRotation"><option value="0">Não girar</option><option value="90">90° à direita</option><option value="180">180°</option><option value="270">90° à esquerda</option></select></div><div class="field"><label for="ocrNativeThreshold">Texto existente mínimo</label><input id="ocrNativeThreshold" type="number" min="1" max="500" value="25" /></div></div>
        <label class="toggle-row"><input id="ocrAutoRotate" type="checkbox" checked /><span>Tentar corrigir automaticamente a orientação do texto</span></label>
        <details class="editor-settings-group" open><summary>Melhoria da imagem</summary>
          <label class="toggle-row"><input id="ocrGrayscale" type="checkbox" checked /><span>Converter para tons de cinza</span></label>
          <div class="field"><label for="ocrContrast">Aumentar contraste</label><input id="ocrContrast" type="range" min="0" max="100" value="20" /></div>
          <label class="toggle-row"><input id="ocrThresholdEnabled" type="checkbox" /><span>Aplicar preto e branco por limiar</span></label>
          <div id="ocrThresholdPanel" class="hidden"><div class="field"><label for="ocrThreshold">Limiar</label><input id="ocrThreshold" type="range" min="60" max="230" value="170" /></div></div>
        </details>
        <details id="ocrPdfOptions" class="editor-settings-group" open><summary>Preservação e controle de qualidade</summary>
          <label class="toggle-row"><input id="ocrPreserveNative" type="checkbox" checked /><span>Preservar páginas que já possuem texto selecionável</span></label>
          <label class="toggle-row"><input id="ocrPageHeaders" type="checkbox" checked /><span>Separar o TXT por número da página</span></label>
          <label class="toggle-row"><input id="ocrIncludeReport" type="checkbox" /><span>Incluir relatório JSON de confiança</span></label>
          <label class="toggle-row"><input id="ocrDetectPatterns" type="checkbox" checked /><span>Detectar CPF, CNPJ, datas, valores e e-mails</span></label>
          <div class="field"><label for="ocrConfidenceThreshold">Avisar abaixo da confiança (%)</label><input id="ocrConfidenceThreshold" type="number" min="0" max="100" value="60" /></div>
        </details>
        <div id="ocrPlan" class="notice-card ocr-plan"><strong>Plano do OCR</strong><p>Adicione PDFs ou imagens para calcular páginas, tamanho e estimativa de processamento.</p></div>
        <div id="ocrLastSummary" class="notice-card hidden"></div>
        <button id="ocrReviewButton" class="small-button full-width hidden" type="button">Revisar confiança do último OCR</button>
        <div class="notice-card warning"><strong>Ponto de atenção</strong><p>OCR pode cometer erros, especialmente em manuscritos, fotos desfocadas, tabelas complexas e páginas inclinadas. Revise páginas de baixa confiança antes de usar o conteúdo oficialmente.</p></div>`
    },
    compare: {
      title: 'Comparar PDFs', description: 'Compare duas versões página por página e gere um relatório com diferenças visuais e textuais.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: '2 PDFs', button: 'Comparar documentos', outputExt: 'zip', outputBase: 'Comparacao_PDFs',
      settings: `<div id="comparePlan" class="notice-card compare-plan"><strong>Selecione exatamente 2 PDFs</strong><p>O documento original e a versão revisada serão comparados.</p></div>
        <div class="field"><label for="compareMode">Tipo de comparação</label><select id="compareMode"><option value="hybrid">Híbrida: texto e imagem</option><option value="text">Somente texto</option><option value="visual">Somente aparência</option></select></div>
        <div class="field-row"><label class="toggle-row compact"><input id="compareIgnoreCase" type="checkbox" checked><span>Ignorar maiúsculas/minúsculas</span></label><label class="toggle-row compact"><input id="compareIgnoreWhitespace" type="checkbox" checked><span>Normalizar espaços</span></label></div>
        <div class="field"><label for="comparePages">Páginas</label><input id="comparePages" value="all" placeholder="all ou 1-3,5"></div>
        <div class="field-row"><div class="field"><label for="compareDpi">Resolução visual</label><select id="compareDpi"><option value="96">96 DPI — rápido</option><option value="110" selected>110 DPI — recomendado</option><option value="150">150 DPI — detalhado</option></select></div><div class="field"><label for="compareThreshold">Sensibilidade visual</label><input id="compareThreshold" type="range" min="8" max="70" value="28"></div></div>
        <label class="toggle-row"><input id="compareIncludeImages" type="checkbox" checked><span>Incluir imagens original, revisada e diferenças no relatório</span></label>
        <div class="notice-card warning"><strong>Comparação assistida</strong><p>O relatório aponta diferenças, mas não substitui a conferência humana de valores, cláusulas, assinaturas e elementos jurídicos.</p></div>`
    },
    redact: {
      title: 'Censura definitiva', description: 'Remova permanentemente áreas sensíveis reconstruindo as páginas afetadas, com relatório de auditoria.',
      accept: 'application/pdf,.pdf', multiple: false, typeLabel: 'PDF', button: 'Aplicar censura definitiva', outputExt: 'pdf', outputBase: 'PDF_censurado',
      settings: `<div class="notice-card warning"><strong>Operação irreversível na nova cópia</strong><p>As páginas censuradas são rasterizadas e reconstruídas. O texto, imagens e camadas originais dessas páginas não são copiados.</p></div>
        <div id="redactionSummary" class="notice-card redaction-summary"><strong>0 áreas marcadas</strong><p>Arraste sobre a página para selecionar informações sensíveis.</p></div>
        <details open><summary>Localizar texto</summary><div class="field"><label for="redactionSearch">Texto ou expressão</label><input id="redactionSearch" placeholder="Nome, CPF, CNPJ, valor..."></div><div class="field-row"><div class="field"><label for="redactionSearchScope">Pesquisar</label><select id="redactionSearchScope"><option value="all">Em todas as páginas</option><option value="current">Somente na página atual</option></select></div><label class="toggle-row compact"><input id="redactionRegex" type="checkbox"><span>Expressão regular</span></label></div><button id="redactionFind" class="small-button primary-soft" type="button">Marcar ocorrências</button><div class="redaction-pattern-buttons"><button type="button" onclick="document.querySelector('#redactionSearch').value='\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b';document.querySelector('#redactionRegex').checked=true">CPF</button><button type="button" onclick="document.querySelector('#redactionSearch').value='\\b\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}\\b';document.querySelector('#redactionRegex').checked=true">CNPJ</button><button type="button" onclick="document.querySelector('#redactionSearch').value='R\\$\\s?\\d+(?:[.,]\\d+)*';document.querySelector('#redactionRegex').checked=true">Valores</button></div></details>
        <details open><summary>Saída segura</summary><div class="field-row"><div class="field"><label for="redactionDpi">Qualidade</label><select id="redactionDpi"><option value="150">150 DPI</option><option value="180" selected>180 DPI</option><option value="220">220 DPI</option><option value="300">300 DPI</option></select></div><div class="field"><label for="redactionColor">Cor da área</label><input id="redactionColor" type="color" value="#000000"></div></div><div class="field"><label for="redactionLabel">Texto sobre a censura (opcional)</label><input id="redactionLabel" placeholder="CONFIDENCIAL"></div><label class="toggle-row"><input id="redactionRasterAll" type="checkbox"><span>Reconstruir todas as páginas para máxima sanitização</span></label><label class="toggle-row"><input id="redactionReport" type="checkbox" checked><span>Gerar relatório JSON com páginas e hashes</span></label><button id="redactionClearAll" class="small-button danger" type="button">Limpar todas as marcações</button></details>
        <div class="notice-card warning"><strong>Perdas esperadas</strong><p>Páginas reconstruídas perdem texto selecionável, links, formulários, comentários e assinaturas digitais. Sempre preserve o original separado.</p></div>`
    },

    formBuilder: {
      title: 'Criar formulário preenchível', description: 'Adicione campos de texto, data, número, CPF, CNPJ, moeda, caixas, listas e opções diretamente nas páginas.',
      accept: 'application/pdf,.pdf', multiple: false, typeLabel: 'PDF', button: 'Criar formulário', outputExt: 'pdf', outputBase: 'PDF_formulario_preenchivel',
      settings: `<div class="notice-card"><strong>Designer de formulário</strong><p>Escolha um tipo de campo, configure as propriedades e arraste sobre a página para posicioná-lo.</p></div>
        <div class="field-row"><div class="field"><label for="formFieldType">Tipo de campo</label><select id="formFieldType"><option value="text">Texto</option><option value="multiline">Texto multilinha</option><option value="date">Data</option><option value="number">Número</option><option value="currency">Moeda (R$)</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="checkbox">Caixa de seleção</option><option value="dropdown">Lista suspensa</option><option value="radio">Opções únicas</option><option value="list">Lista de opções</option></select></div><div class="field"><label for="formFieldName">Nome interno</label><input id="formFieldName" placeholder="Ex.: nome_completo"></div></div>
        <div class="field"><label for="formFieldLabel">Rótulo ou orientação</label><input id="formFieldLabel" placeholder="Ex.: Informe o nome completo"></div>
        <div class="field"><label for="formFieldDefault">Valor inicial</label><input id="formFieldDefault" placeholder="Opcional"></div>
        <div id="formFieldOptionsPanel" class="hidden"><div class="field"><label for="formFieldOptions">Opções, uma por linha</label><textarea id="formFieldOptions" rows="4" placeholder="Opção 1&#10;Opção 2"></textarea></div></div>
        <div class="field-row"><div class="field"><label for="formFieldFontSize">Tamanho do texto</label><input id="formFieldFontSize" type="number" min="6" max="48" value="11"></div><div class="field"><label for="formFieldMaxLength">Limite de caracteres</label><input id="formFieldMaxLength" type="number" min="0" max="5000" value="0"></div></div>
        <div class="field-row"><div class="field"><label for="formFieldTextColor">Cor do texto</label><input id="formFieldTextColor" type="color" value="#111827"></div><div class="field"><label for="formFieldBorderColor">Cor da borda</label><input id="formFieldBorderColor" type="color" value="#7c6cff"></div><div class="field"><label for="formFieldBackground">Fundo</label><input id="formFieldBackground" type="color" value="#ffffff"></div></div>
        <label class="toggle-row"><input id="formFieldRequired" type="checkbox"><span>Campo obrigatório</span></label>
        <div class="form-action-grid"><button id="formStartPlacement" class="small-button primary-soft" type="button">Adicionar campo na página</button><button id="formUpdateSelected" class="small-button" type="button">Atualizar selecionado</button><button id="formDuplicateSelected" class="small-button" type="button">Duplicar</button><button id="formDeleteSelected" class="small-button danger" type="button">Excluir</button></div>
        <details><summary>Repetir campo</summary><div class="field"><label for="formCopyPages">Copiar o campo selecionado para</label><input id="formCopyPages" placeholder="Ex.: all, 1-3,5"></div><button id="formCopySelected" class="small-button full-width" type="button">Copiar para as páginas</button></details>
        <div id="formBuilderSummary" class="notice-card"><strong>0 campos</strong><p>Adicione um PDF para iniciar o desenho.</p></div>
        <div class="notice-card warning"><strong>Compatibilidade</strong><p>Máscaras e validações ajudam na configuração, mas alguns leitores de PDF podem tratar CPF, CNPJ, data e moeda como campos de texto comuns.</p></div>`
    },
    signPdf: {
      title: 'Assinar e rubricar PDF', description: 'Adicione assinatura visual desenhada, digitada ou por imagem, com data, nome do assinante e rubrica em várias páginas.',
      accept: 'application/pdf,.pdf', multiple: false, typeLabel: 'PDF', button: 'Aplicar assinaturas', outputExt: 'pdf', outputBase: 'PDF_assinado_visual',
      settings: `<div class="notice-card warning"><strong>Assinatura visual</strong><p>Esta ferramenta insere a aparência da assinatura. Ela não equivale a uma assinatura digital com certificado ICP-Brasil e não valida identidade criptograficamente.</p></div>
        <div class="field"><label for="signatureSource">Origem da assinatura</label><select id="signatureSource"><option value="draw">Desenhar</option><option value="typed">Digitar</option><option value="image">Usar imagem PNG/JPG</option></select></div>
        <div id="signatureDrawPanel"><canvas id="signaturePad" width="520" height="180" aria-label="Área para desenhar assinatura"></canvas><div class="signature-pad-actions"><button id="signaturePadClear" class="small-button" type="button">Limpar</button><label>Cor <input id="signatureInkColor" type="color" value="#111827"></label><label>Espessura <input id="signatureInkWidth" type="range" min="1" max="8" value="3"></label></div></div>
        <div id="signatureTypedPanel" class="hidden"><div class="field"><label for="signatureTypedText">Assinatura digitada</label><input id="signatureTypedText" placeholder="Nome do assinante"></div><div class="field-row"><div class="field"><label for="signatureTypedFont">Estilo</label><select id="signatureTypedFont"><option value="serif">Clássica</option><option value="cursive">Manuscrita</option><option value="sans">Moderna</option></select></div><div class="field"><label for="signatureTypedColor">Cor</label><input id="signatureTypedColor" type="color" value="#111827"></div></div></div>
        <div id="signatureImagePanel" class="hidden"><div class="field"><label for="signatureImageInput">Imagem da assinatura</label><input id="signatureImageInput" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg"></div><label class="toggle-row"><input id="signatureRemoveWhite" type="checkbox" checked><span>Tornar fundo branco transparente</span></label></div>
        <button id="signaturePrepare" class="small-button primary-soft full-width" type="button">Preparar e posicionar assinatura</button>
        <div class="field-row"><div class="field"><label for="signatureSignerName">Nome abaixo da assinatura</label><input id="signatureSignerName" placeholder="Opcional"></div><div class="field"><label for="signatureDateMode">Data</label><select id="signatureDateMode"><option value="none">Não incluir</option><option value="today">Data atual</option><option value="custom">Data informada</option></select></div></div>
        <div id="signatureCustomDatePanel" class="hidden"><div class="field"><label for="signatureCustomDate">Data</label><input id="signatureCustomDate" type="date"></div></div>
        <div class="field-row"><div class="field"><label for="signaturePageScope">Aplicar em</label><select id="signaturePageScope"><option value="manual">Somente onde posicionar</option><option value="current">Página atual</option><option value="all">Todas as páginas</option><option value="selected">Páginas informadas</option></select></div><div class="field"><label for="signatureRotation">Rotação</label><input id="signatureRotation" type="number" min="-180" max="180" value="0"></div></div>
        <div id="signatureSelectedPagesPanel" class="hidden"><div class="field"><label for="signatureSelectedPages">Páginas</label><input id="signatureSelectedPages" placeholder="Ex.: 1-3,5"></div></div>
        <div class="form-action-grid"><button id="signatureDuplicate" class="small-button" type="button">Duplicar selecionada</button><button id="signatureRubricAll" class="small-button" type="button">Rubricar todas</button><button id="signatureDelete" class="small-button danger" type="button">Excluir selecionada</button></div>
        <div id="signatureSummary" class="notice-card"><strong>0 assinaturas</strong><p>Adicione um PDF e prepare a assinatura.</p></div>
        <div class="notice-card warning"><strong>Validade jurídica</strong><p>Confirme as exigências do processo. Para assinatura digital com certificado, será necessário um módulo específico com certificado e validação criptográfica.</p></div>`
    },

    pdfToOffice: {
      title: 'PDF para Office', description: 'Converta PDFs para Word, Excel ou PowerPoint em modos controlados e totalmente locais.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Converter para Office', outputExt: 'auto', outputBase: 'arquivos_Office',
      settings: `<div class="conversion-engine-banner"><span class="conversion-mark">OFF</span><div><strong>Conversão local para Office</strong><p>Escolha entre texto editável simplificado, páginas como imagens ou apresentação visual. Nenhum documento é enviado.</p></div></div>
        <div class="field"><label for="officeExportFormat">Formato de saída</label><select id="officeExportFormat"><option value="docx">Word DOCX</option><option value="xlsx">Excel XLSX</option><option value="pptx">PowerPoint PPTX</option></select></div>
        <div id="officeDocxOptions"><div class="field"><label for="officeDocxMode">Modo do Word</label><select id="officeDocxMode"><option value="text">Texto editável simplificado</option><option value="image">Aparência preservada como imagem</option><option value="hybrid">Imagem + texto extraído</option></select></div></div>
        <div id="officeXlsxOptions" class="hidden"><div class="field"><label for="officeXlsxSheets">Organização do Excel</label><select id="officeXlsxSheets"><option value="page">Uma planilha por página</option><option value="document">Uma planilha por documento</option></select></div></div>
        <div class="field-row"><div class="field"><label for="officeExportPages">Páginas</label><input id="officeExportPages" value="all" placeholder="all ou 1-3,5"></div><div class="field"><label for="officeExportDpi">Qualidade visual</label><select id="officeExportDpi"><option value="110">110 DPI — leve</option><option value="144" selected>144 DPI — recomendado</option><option value="200">200 DPI — detalhado</option></select></div></div>
        <div id="pdfToOfficePlan" class="notice-card conversion-plan"><strong>Conversão para Office</strong><p>Adicione PDFs para calcular o plano.</p></div>
        <div class="notice-card warning"><strong>Fidelidade controlada</strong><p>Word e Excel priorizam conteúdo editável, não reprodução perfeita do layout. PowerPoint preserva a aparência de cada página como um slide.</p></div>`
    },
    documentsToPdf: {
      title: 'Documentos para PDF', description: 'Converta DOCX, XLSX, PPTX, HTML, TXT, CSV, Markdown, HEIC, TIFF e imagens para PDF.',
      accept: '.docx,.xlsx,.pptx,.html,.htm,.txt,.csv,.md,.markdown,image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,.heic,.heif', multiple: true, typeLabel: 'Documento ou imagem', button: 'Criar PDF(s)', outputExt: 'auto', outputBase: 'documentos_convertidos',
      settings: `<div class="conversion-engine-banner"><span class="conversion-mark">PDF</span><div><strong>Conversão local de documentos</strong><p>Extrai o texto de arquivos Office e cria um PDF limpo. Imagens são incorporadas preservando a proporção.</p></div></div>
        <label class="toggle-row"><input id="docToPdfCombine" type="checkbox"><span>Combinar todos os arquivos em um único PDF</span></label>
        <div class="field-row"><div class="field"><label for="docToPdfPageSize">Papel para documentos</label><select id="docToPdfPageSize"><option value="a4">A4</option><option value="letter">Carta</option></select></div><div class="field"><label for="docToPdfFontSize">Tamanho do texto</label><input id="docToPdfFontSize" type="number" min="8" max="18" value="11"></div></div>
        <div class="field"><label for="docToPdfImagePage">Página para imagens</label><select id="docToPdfImagePage"><option value="image">Ajustar ao tamanho da imagem</option><option value="a4">Colocar em página A4</option></select></div>
        <div id="documentsToPdfPlan" class="notice-card conversion-plan"><strong>Documentos para PDF</strong><p>Adicione documentos ou imagens para calcular o plano.</p></div>
        <div class="notice-card"><strong>Office em modo texto</strong><p>DOCX, XLSX e PPTX são convertidos pela estrutura textual interna. Elementos complexos, gráficos, fórmulas e layouts avançados podem ser simplificados.</p></div>`
    },
    extractImages: {
      title: 'Extrair imagens do PDF', description: 'Extraia imagens internas reais, páginas completas ou ambas, com filtros e manifesto.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Extrair imagens', outputExt: 'zip', outputBase: 'imagens_extraidas',
      settings: `<div class="conversion-engine-banner"><span class="conversion-mark">IMG</span><div><strong>Extração técnica pelo PDF.js</strong><p>Recupere imagens rasterizadas internas quando disponíveis ou gere páginas completas em alta qualidade.</p></div></div>
        <div class="field"><label for="extractImageMode">Conteúdo</label><select id="extractImageMode"><option value="internal">Somente imagens internas</option><option value="pages">Somente páginas completas</option><option value="both">Imagens internas + páginas completas</option></select></div>
        <div class="field-row"><div class="field"><label for="extractImageFormat">Formato</label><select id="extractImageFormat"><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WEBP</option></select></div><div class="field"><label for="extractImageQuality">Qualidade (%)</label><input id="extractImageQuality" type="number" min="30" max="100" value="90"></div></div>
        <div class="field-row"><div class="field"><label for="extractImageMinWidth">Largura mínima</label><input id="extractImageMinWidth" type="number" min="1" value="80"></div><div class="field"><label for="extractImageMinHeight">Altura mínima</label><input id="extractImageMinHeight" type="number" min="1" value="80"></div></div>
        <div class="field-row"><div class="field"><label for="extractImagePages">Páginas</label><input id="extractImagePages" value="all" placeholder="all ou 1-3,5"></div><div class="field"><label for="extractImageDpi">DPI das páginas</label><select id="extractImageDpi"><option value="110">110</option><option value="150" selected>150</option><option value="200">200</option><option value="300">300</option></select></div></div>
        <label class="toggle-row"><input id="extractImageDedupe" type="checkbox" checked><span>Remover imagens internas duplicadas</span></label>
        <div id="extractImagesPlan" class="notice-card conversion-plan"><strong>Extração de imagens</strong><p>Adicione PDFs para calcular o plano.</p></div>
        <div class="notice-card warning"><strong>Estrutura variável</strong><p>Alguns PDFs dividem uma imagem em blocos, usam máscaras ou armazenam somente vetores. Nesses casos, use “páginas completas”.</p></div>`
    },
    archivePdf: {
      title: 'Preparar para arquivamento', description: 'Crie uma cópia normalizada ou rasterizada, com hashes e manifesto técnico.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Criar pacote de arquivamento', outputExt: 'auto', outputBase: 'pacote_de_arquivamento',
      settings: `<div class="conversion-engine-banner"><span class="conversion-mark">ARC</span><div><strong>Pacote local para preservação</strong><p>Normaliza a estrutura ou reconstrói visualmente as páginas e registra hashes SHA-256 para conferência.</p></div></div>
        <div class="field"><label for="archiveMode">Modo</label><select id="archiveMode"><option value="normalize">Normalizar preservando texto e links</option><option value="raster">Reconstruir páginas como imagens</option></select></div>
        <div id="archiveRasterOptions" class="hidden"><div class="field"><label for="archiveDpi">Qualidade da reconstrução</label><select id="archiveDpi"><option value="150">150 DPI</option><option value="180" selected>180 DPI</option><option value="220">220 DPI</option><option value="300">300 DPI</option></select></div></div>
        <label class="toggle-row"><input id="archiveFlattenForms" type="checkbox"><span>Fixar campos de formulário preenchidos</span></label>
        <label class="toggle-row"><input id="archiveRemoveMetadata" type="checkbox"><span>Remover metadados descritivos anteriores</span></label>
        <label class="toggle-row"><input id="archiveManifest" type="checkbox" checked><span>Incluir manifesto JSON com hashes e diagnóstico</span></label>
        <div id="archivePdfPlan" class="notice-card conversion-plan"><strong>Arquivamento</strong><p>Adicione PDFs para calcular o plano.</p></div>
        <div class="archive-certification-note"><strong>Não é certificação PDF/A</strong><p>A ferramenta prepara uma cópia para arquivamento e verifica sinais comuns, mas não certifica conformidade ISO PDF/A. Uma validação oficial exige um motor especializado.</p></div>`
    },

    documentAssistant: {
      title: 'Assistente documental', description: 'Resuma documentos, localize cláusulas e responda perguntas com evidências por página.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Analisar documentos', outputExt: 'zip', outputBase: 'analise_documental',
      settings: `<div class="intelligence-banner"><span>IA</span><div><strong>Inteligência documental local e explicável</strong><p>O sistema usa extração de texto e classificação determinística. Cada resposta aponta o arquivo e a página de origem.</p></div></div>
        <div class="field"><label for="intelligenceQuestion">Pergunta ou informação procurada</label><textarea id="intelligenceQuestion" rows="4" placeholder="Ex.: Qual é o prazo de vigência e como funciona o reajuste?"></textarea></div>
        <div class="intelligence-grid"><div class="field"><label for="intelligenceFocus">Foco da análise</label><select id="intelligenceFocus"><option value="general">Geral</option><option value="contract">Contratos e aditivos</option><option value="fiscal">Fiscal e notas</option><option value="cnd">Certidões</option><option value="audit">Auditoria</option></select></div><div class="field"><label for="intelligenceSummarySize">Tamanho do resumo</label><select id="intelligenceSummarySize"><option value="5">Curto — 5 evidências</option><option value="8" selected>Médio — 8 evidências</option><option value="14">Detalhado — 14 evidências</option></select></div></div>
        <div class="field"><label for="intelligenceEvidenceCount">Evidências para a pergunta</label><input id="intelligenceEvidenceCount" type="number" min="3" max="20" value="6"></div>
        <label class="toggle-row"><input id="intelligenceIncludeSections" type="checkbox" checked><span>Localizar cláusulas, capítulos e seções</span></label>
        <label class="toggle-row"><input id="intelligenceIncludePatterns" type="checkbox" checked><span>Detectar CNPJ, CPF, datas, valores, códigos e números</span></label>
        <div id="intelligencePlan" class="notice-card intelligence-plan"><strong>Assistente documental</strong><p>Adicione PDFs para calcular a análise.</p></div>
        <div id="intelligenceLastSummary" class="notice-card hidden"></div>
        <div class="intelligence-warning"><strong>Análise assistiva</strong><p>O resumo é extrativo e não cria fatos. Documentos escaneados precisam passar pelo OCR antes.</p></div>`
    },
    structuredExtraction: {
      title: 'Extração estruturada', description: 'Extraia CNPJ, CPF, datas, valores, notas, contratos, códigos e validades para CSV e JSON.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Extrair dados', outputExt: 'zip', outputBase: 'dados_extraidos',
      settings: `<div class="intelligence-banner"><span>EXT</span><div><strong>Dados estruturados com rastreabilidade</strong><p>Cada ocorrência registra o arquivo e a página em que foi localizada.</p></div></div>
        <div class="field"><label for="extractionProfile">Perfil</label><select id="extractionProfile"><option value="general">Geral</option><option value="contracts">Contratos e aditivos</option><option value="fiscal">Notas e documentos fiscais</option><option value="cnd">Certidões e regularidade</option></select></div>
        <label class="toggle-row"><input id="extractionIncludePages" type="checkbox" checked><span>Registrar página de origem</span></label>
        <label class="toggle-row"><input id="extractionGroupByFile" type="checkbox" checked><span>Agrupar resultados por arquivo</span></label>
        <label class="toggle-row"><input id="extractionExportXlsx" type="checkbox"><span>Reservar estrutura para planilha avançada</span></label>
        <div class="field"><label for="extractionCustomRegex">Expressão regular personalizada (opcional)</label><input id="extractionCustomRegex" placeholder="Ex.: PED-[0-9]{6}"></div>
        <div class="intelligence-output-list"><span>CSV compatível com Excel</span><span>JSON para automação</span><span>Relatório HTML para conferência</span></div>
        <div id="extractionPlan" class="notice-card intelligence-plan"><strong>Extração estruturada</strong><p>Adicione PDFs para calcular a extração.</p></div>
        <div id="extractionLastSummary" class="notice-card hidden"></div>`
    },
    documentAudit: {
      title: 'Auditoria documental', description: 'Cruze documentos e destaque divergências de CNPJ, códigos, valores, datas e certidões.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Executar auditoria', outputExt: 'zip', outputBase: 'auditoria_documental',
      settings: `<div class="intelligence-banner"><span>AUD</span><div><strong>Regras locais para conferência documental</strong><p>Os achados mostram indícios e evidências. A decisão final permanece com o responsável pela auditoria.</p></div></div>
        <div class="field"><label for="auditProfile">Perfil de auditoria</label><select id="auditProfile"><option value="general">Geral</option><option value="procurement">Compras, contratos e pagamentos</option><option value="contracts">Contrato × aditivo</option><option value="fiscal">Medição × nota fiscal</option><option value="cnd">Certidões de regularidade</option></select></div>
        <div class="intelligence-grid"><div class="field"><label for="auditLaunchDate">Data de lançamento (opcional)</label><input id="auditLaunchDate" type="date"></div><div class="field"><label for="auditPaymentDate">Data do pagamento (opcional)</label><input id="auditPaymentDate" type="date"></div></div>
        <label class="toggle-row"><input id="auditDueFallback" type="checkbox" checked><span>Sem vencimento expresso, considerar 8 dias após o lançamento</span></label>
        <label class="toggle-row"><input id="auditCompareCnpj" type="checkbox" checked><span>Comparar CNPJ entre documentos</span></label>
        <label class="toggle-row"><input id="auditCompareCodes" type="checkbox" checked><span>Comparar contratos, processos e códigos</span></label>
        <label class="toggle-row"><input id="auditCompareAmounts" type="checkbox" checked><span>Mapear valores monetários coincidentes ou isolados</span></label>
        <label class="toggle-row"><input id="auditCheckCnd" type="checkbox" checked><span>Verificar situação e validade de certidões</span></label>
        <div id="auditPlan" class="notice-card intelligence-plan"><strong>Auditoria documental</strong><p>Adicione os documentos relacionados para cruzar as informações.</p></div>
        <div id="auditLastSummary" class="notice-card hidden"></div>
        <div class="intelligence-warning"><strong>Limite do controle automático</strong><p>Valores e códigos podem aparecer em contextos diferentes. Revise os achados no documento original.</p></div>`
    },
    classifyRename: {
      title: 'Classificar e renomear', description: 'Classifique documentos, sugira nomes e detecte possíveis páginas vazias ou duplicadas.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Classificar documentos', outputExt: 'zip', outputBase: 'documentos_classificados',
      settings: `<div class="intelligence-banner"><span>ORG</span><div><strong>Organização inteligente em lote</strong><p>Classifica pelo conteúdo e cria nomes padronizados sem alterar os arquivos originais.</p></div></div>
        <div class="field"><label for="renameTemplate">Modelo do nome</label><input id="renameTemplate" value="{tipo}_{data}_{numero}" placeholder="{tipo}_{data}_{numero}"><small class="field-hint">Variáveis: {tipo}, {data}, {numero}, {cnpj}, {original}</small></div>
        <div class="field"><label for="renameMaxLength">Tamanho máximo do nome</label><input id="renameMaxLength" type="number" min="30" max="180" value="100"></div>
        <label class="toggle-row"><input id="renameIncludeCopies" type="checkbox" checked><span>Incluir cópias com os nomes sugeridos no ZIP</span></label>
        <label class="toggle-row"><input id="renameDetectBlank" type="checkbox" checked><span>Detectar possíveis páginas em branco</span></label>
        <label class="toggle-row"><input id="renameDetectDuplicates" type="checkbox" checked><span>Detectar páginas possivelmente duplicadas</span></label>
        <label class="toggle-row"><input id="renameUseDate" type="checkbox" checked><span>Priorizar data localizada no documento</span></label>
        <div id="renamePlan" class="notice-card intelligence-plan"><strong>Classificação e renomeação</strong><p>Adicione PDFs para preparar as sugestões.</p></div>
        <div id="renameLastSummary" class="notice-card hidden"></div>
        <div class="intelligence-warning"><strong>Não substitua os originais automaticamente</strong><p>Confira os nomes, a classificação e as páginas apontadas antes de arquivar.</p></div>`
    },
    protect: {
      title: 'Proteger PDF', description: 'Criptografe um ou vários PDFs com AES-256 e uma senha para abertura.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Proteger PDF(s)', outputExt: 'auto', outputBase: 'PDFs_protegidos', professional: true,
      settings: '<div class="engine-banner"><strong>Motor profissional experimental</strong><p>Na primeira utilização, a biblioteca LibPDF é carregada pela internet. O processamento do arquivo ocorre no navegador.</p></div><div class="field"><label for="protectPassword">Senha para abrir</label><input id="protectPassword" type="password" autocomplete="new-password" placeholder="Digite uma senha forte" /></div><div class="field"><label for="protectPasswordConfirm">Confirmar senha</label><input id="protectPasswordConfirm" type="password" autocomplete="new-password" placeholder="Repita a senha" /></div><div class="field"><label for="protectOwnerPassword">Senha administrativa (opcional)</label><input id="protectOwnerPassword" type="password" autocomplete="new-password" placeholder="Permite remover restrições depois" /></div><div class="field"><label for="protectAlgorithm">Criptografia</label><select id="protectAlgorithm"><option value="AES-256" selected>AES-256 — recomendada</option><option value="AES-128">AES-128 — maior compatibilidade</option></select></div><div class="check-list"><label><input id="permPrint" type="checkbox" checked /> Permitir impressão</label><label><input id="permCopy" type="checkbox" /> Permitir copiar conteúdo</label><label><input id="permModify" type="checkbox" /> Permitir alterações</label><label><input id="permAnnotate" type="checkbox" checked /> Permitir comentários</label><label><input id="permForms" type="checkbox" checked /> Permitir preencher formulários</label></div><div class="notice-card warning"><strong>Guarde a senha</strong><p>Não há recuperação automática. Permissões de PDF são orientativas e alguns leitores podem não respeitá-las.</p></div>'
    },
    unlock: {
      title: 'Remover senha', description: 'Abra PDFs protegidos usando a senha conhecida e salve uma cópia sem criptografia.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF protegido', button: 'Remover proteção', outputExt: 'auto', outputBase: 'PDFs_desbloqueados', professional: true,
      settings: '<div class="engine-banner"><strong>Motor profissional experimental</strong><p>Use somente a senha que você conhece e tem autorização para utilizar.</p></div><div class="field"><label for="unlockPassword">Senha atual</label><input id="unlockPassword" type="password" autocomplete="current-password" placeholder="Senha do PDF" /></div><div class="notice-card"><strong>Acesso administrativo</strong><p>Alguns documentos exigem a senha de proprietário para remover completamente a proteção e as restrições.</p></div>'
    },
    diagnose: {
      title: 'Diagnosticar PDF', description: 'Gere um relatório técnico sobre estrutura, criptografia, permissões, formulários e assinaturas.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Gerar diagnóstico', outputExt: 'auto', outputBase: 'diagnostico_PDF', professional: true,
      settings: '<div class="engine-banner"><strong>Relatório local</strong><p>O relatório não altera o documento. Uma senha opcional permite inspecionar conteúdo protegido.</p></div><div class="field"><label for="diagnosePassword">Senha, caso exista (opcional)</label><input id="diagnosePassword" type="password" autocomplete="current-password" placeholder="Deixe vazio para inspeção básica" /></div><label class="toggle-row"><input id="diagnoseJson" type="checkbox" checked /> Incluir relatório JSON estruturado</label>'
    },
    repairAdvanced: {
      title: 'Recuperar PDF', description: 'Use análise tolerante para reconstruir PDFs com índice ou referências inconsistentes.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF', button: 'Tentar recuperação', outputExt: 'auto', outputBase: 'PDFs_recuperados', professional: true,
      settings: '<div class="engine-banner"><strong>Recuperação estrutural</strong><p>O motor tenta reconstruir referências e tabelas internas. Ele não recupera bytes que estejam ausentes do arquivo.</p></div><div class="field"><label for="repairPassword">Senha, caso exista (opcional)</label><input id="repairPassword" type="password" autocomplete="current-password" /></div><label class="toggle-row"><input id="repairRemoveProtection" type="checkbox" /> Remover proteção após abrir com senha administrativa</label><div class="notice-card warning"><strong>Use uma cópia</strong><p>O resultado é uma nova versão. Compare visualmente antes de substituir qualquer documento importante.</p></div>'
    },
    flattenForms: {
      title: 'Fixar formulários', description: 'Converta campos editáveis preenchidos em conteúdo estático nas páginas.',
      accept: 'application/pdf,.pdf', multiple: true, typeLabel: 'PDF com formulário', button: 'Fixar campos', outputExt: 'auto', outputBase: 'formularios_fixados', professional: true,
      settings: '<div class="engine-banner"><strong>Proteção contra edição acidental</strong><p>Depois de fixados, os campos deixam de ser editáveis. O conteúdo visual preenchido permanece na página.</p></div><div class="field"><label for="flattenPassword">Senha, caso exista (opcional)</label><input id="flattenPassword" type="password" autocomplete="current-password" /></div><div class="notice-card warning"><strong>Operação definitiva na cópia</strong><p>Baixe e confira o novo PDF antes de arquivar. Assinaturas existentes podem exigir salvamento incremental para permanecer válidas.</p></div>'
    }

  };

  const completionLabels = {
    organize: ['Continuar organizando', 'Nova organização'],
    editPdf: ['Continuar editando', 'Nova edição'],
    merge: ['Continuar juntando', 'Nova junção'],
    split: ['Continuar dividindo', 'Nova divisão'],
    extract: ['Continuar extraindo', 'Nova extração'],
    rotate: ['Continuar girando', 'Nova rotação'],
    watermark: ['Continuar ajustando', 'Nova marca-d’água'],
    pageNumbers: ['Continuar numerando', 'Nova numeração'],
    imagesToPdf: ['Continuar montando', 'Novo PDF de imagens'],
    imageConvert: ['Continuar convertendo', 'Nova conversão'],
    compress: ['Continuar comprimindo', 'Nova compressão'],
    pdfToImage: ['Continuar convertendo', 'Nova conversão em imagens'],
    crop: ['Continuar recortando', 'Novo recorte'],
    metadata: ['Continuar limpando', 'Nova limpeza'],
    normalize: ['Continuar normalizando', 'Nova normalização'],
    pdfToText: ['Continuar extraindo', 'Nova extração de texto'],
    ocr: ['Continuar reconhecendo', 'Novo OCR'],
    compare: ['Continuar comparando', 'Nova comparação'],
    redact: ['Continuar censurando', 'Nova censura'],
    formBuilder: ['Continuar criando', 'Novo formulário'],
    signPdf: ['Continuar assinando', 'Nova assinatura'],
    pdfToOffice: ['Continuar convertendo', 'Nova conversão para Office'],
    documentsToPdf: ['Continuar convertendo', 'Nova conversão para PDF'],
    extractImages: ['Continuar extraindo', 'Nova extração de imagens'],
    archivePdf: ['Continuar preparando', 'Novo arquivamento'],
    documentAssistant: ['Continuar analisando', 'Nova análise'],
    structuredExtraction: ['Continuar extraindo', 'Nova extração estruturada'],
    documentAudit: ['Continuar auditando', 'Nova auditoria'],
    classifyRename: ['Continuar classificando', 'Nova classificação'],
    protect: ['Continuar protegendo', 'Nova proteção'],
    unlock: ['Continuar desbloqueando', 'Nova remoção de senha'],
    diagnose: ['Continuar diagnosticando', 'Novo diagnóstico'],
    repairAdvanced: ['Continuar recuperando', 'Nova recuperação'],
    flattenForms: ['Continuar fixando', 'Nova fixação']
  };

  const state = {
    tool: 'organize',
    files: [],
    organizerPages: [],
    originalOrganizerPages: [],
    organizerSources: new Map(),
    organizerHistory: [],
    organizerFuture: [],
    selectedPageIds: new Set(),
    organizerPageIdSeq: 0,
    organizerSourceSeq: 0,
    organizerInsertIndex: null,
    previewCache: new Map(),
    filePreviewCache: new Map(),
    selectedFileKeys: new Set(),
    dragPageIndex: null,
    dragFileIndex: null,
    internalDragKind: null,
    coverZoom: 190,
    outputNameTouched: false,
    workerReady: false,
    libPdfEngine: null,
    libPdfEnginePromise: null,
    splitPageCount: 0,
    splitPlan: [],
    toolPageCount: 0,
    filePageCounts: new Map(),
    mergeExportRunning: false,
    mergeLastRepairCount: 0,
    mergeOriginalFileKeys: [],
    dragMergeSourceKey: null,
    organizerPreviewObserver: null,
    organizerPreviewPdfDocs: new Map(),
    organizerPreviewQueue: [],
    organizerPreviewActive: 0,
    taskCompleted: false
  };
  const PDFLIB_INGEST_TOOLS = new Set(['organize', 'editPdf', 'merge', 'split', 'extract', 'rotate', 'watermark', 'pageNumbers', 'compress', 'crop', 'metadata', 'normalize', 'redact', 'formBuilder', 'signPdf', 'archivePdf']);
  let fileIngestChain = Promise.resolve();

  const $ = selector => document.querySelector(selector);
  const fileInput = $('#fileInput');
  const dropzone = $('#dropzone');
  const fileList = $('#fileList');
  const fileCount = $('#fileCount');
  const settingsContent = $('#settingsContent');
  const processButton = $('#processButton');
  const statusBox = $('#statusBox');
  const organizerSection = $('#organizerSection');
  const pdfEditorSection = $('#pdfEditorSection');
  const pageGrid = $('#pageGrid');
  const progressTrack = $('#progressTrack');
  const progressBar = $('#progressBar');
  const completionActions = $('#completionActions');
  const completionTitle = $('#completionTitle');
  const completionMessage = $('#completionMessage');
  const continueEditingButton = $('#continueEditingButton');
  const clearButton = $('#clearButton');
  const appShell = $('.app-shell');
  const homeView = $('#homeView');
  const toolWorkspace = $('#toolWorkspace');
  const fileBulkToolbar = $('#fileBulkToolbar');
  const addMoreFilesButton = $('#addMoreFiles');
  const previewDialog = $('#filePreviewDialog');
  const organizerAddDialog = $('#organizerAddDialog');
  const organizerPagePreviewDialog = $('#organizerPagePreviewDialog');
  const workspaceDropOverlay = $('#workspaceDropOverlay');

  window.addEventListener?.('central-editor-progress', event => setProgress(Number(event.detail || 0)));

  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => selectTool(button.dataset.tool)));
  $('#backToTools')?.addEventListener('click', showHome);
  $('#homeBrand').addEventListener('click', showHome);
  let completionReturnFocus = null;

  clearButton.addEventListener('click', clearAll);
  continueEditingButton.addEventListener('click', continueEditing);
  fileInput.addEventListener('change', event => addFiles([...event.target.files], { source: 'picker' }));
  processButton.addEventListener('click', () => {
    completionReturnFocus = processButton;
    const runner = () => processCurrentTool();
    if (window.CentralPDFFoundation?.runTask) window.CentralPDFFoundation.runTask(runner);
    else runner();
  });
  $('#helpButton').addEventListener('click', () => $('#helpDialog').showModal());
  $('#closeHelp').addEventListener('click', () => $('#helpDialog').close());
  $('#closeFilePreview').addEventListener('click', () => previewDialog.close());
  addMoreFilesButton.addEventListener('click', () => fileInput.click());
  $('#selectAllFiles').addEventListener('click', toggleSelectAllFiles);
  $('#removeSelectedFiles').addEventListener('click', removeSelectedFiles);
  $('#coverZoom').addEventListener('input', event => {
    state.coverZoom = Number(event.target.value || 190);
    fileList.style.setProperty('--cover-card-width', `${state.coverZoom}px`);
  });
  $('#organizerAddPages').addEventListener('click', () => openOrganizerAddDialog('pdf'));
  $('#organizerAddBlank').addEventListener('click', () => openOrganizerAddDialog('blank'));
  $('#closeOrganizerAdd').addEventListener('click', closeOrganizerAddDialog);
  $('#cancelOrganizerAdd').addEventListener('click', closeOrganizerAddDialog);
  $('#confirmOrganizerAdd').addEventListener('click', confirmOrganizerAdd);
  $('#organizerAddType').addEventListener('change', updateOrganizerAddPanels);
  $('#organizerImportPdfInput').addEventListener('change', readOrganizerImportPdfInfo);
  $('#selectAllPages').addEventListener('click', toggleSelectAllPages);
  $('#rotateSelectedLeft').addEventListener('click', () => rotateSelectedPages(270));
  $('#rotateSelectedRight').addEventListener('click', () => rotateSelectedPages(90));
  $('#duplicateSelectedPages').addEventListener('click', duplicateSelectedPages);
  $('#moveSelectedStart').addEventListener('click', () => moveSelectedPagesToEdge('start'));
  $('#moveSelectedEnd').addEventListener('click', () => moveSelectedPagesToEdge('end'));
  $('#deleteSelectedPages').addEventListener('click', deleteSelectedPages);
  $('#organizerUndo').addEventListener('click', undoOrganizer);
  $('#organizerRedo').addEventListener('click', redoOrganizer);
  $('#restorePages').addEventListener('click', restoreOrganizer);
  $('#closeOrganizerPagePreview').addEventListener('click', () => organizerPagePreviewDialog.close());
  $('#toolSearch').addEventListener('input', filterToolCards);
  document.querySelectorAll('.category-tab').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.category-tab').forEach(item => item.classList.toggle('active', item === button));
    filterToolCards();
    window.CentralPDFUX?.decorateHome();
  }));
  document.addEventListener('keydown', event => {
    if (state.taskCompleted) {
      if (event.key === 'Tab') trapCompletionFocus(event);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      showHome();
      $('#toolSearch').focus();
    }
    if (state.tool === 'organize' && !toolWorkspace.classList.contains('hidden')) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redoOrganizer() : undoOrganizer(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redoOrganizer(); }
      if (event.key === 'Delete' && state.selectedPageIds.size && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); deleteSelectedPages(); }
    }
  });

  const INTERNAL_PAGE_DRAG_TYPE = 'application/x-centralpdf-page';
  const INTERNAL_FILE_DRAG_TYPE = 'application/x-centralpdf-file';

  function transferTypes(event) {
    return Array.from(event?.dataTransfer?.types || []);
  }

  function transferIsInternal(event) {
    const types = transferTypes(event);
    return Boolean(
      state.internalDragKind ||
      types.includes(INTERNAL_PAGE_DRAG_TYPE) ||
      types.includes(INTERNAL_FILE_DRAG_TYPE)
    );
  }

  function transferHasFiles(event) {
    if (!event?.dataTransfer || transferIsInternal(event)) return false;
    const types = transferTypes(event);
    return Boolean(types.includes('Files') || event.dataTransfer.files?.length);
  }

  function beginInternalDrag(kind, event, index) {
    state.internalDragKind = kind;
    hideExternalDropState();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(kind === 'page' ? INTERNAL_PAGE_DRAG_TYPE : INTERNAL_FILE_DRAG_TYPE, String(index));
    event.dataTransfer.setData('text/plain', String(index));
  }

  function endInternalDrag() {
    state.internalDragKind = null;
    hideExternalDropState();
  }

  function showExternalDropState() {
    workspaceDropOverlay?.classList.remove('hidden');
    toolWorkspace.classList.add('external-file-dragging');
  }

  function hideExternalDropState() {
    workspaceDropOverlay?.classList.add('hidden');
    toolWorkspace.classList.remove('external-file-dragging');
    dropzone.classList.remove('dragging');
  }

  ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => {
    if (!transferHasFiles(event)) return;
    event.preventDefault(); event.stopPropagation();
    dropzone.classList.add('dragging'); showExternalDropState();
    event.dataTransfer.dropEffect = 'copy';
  }));
  dropzone.addEventListener('dragleave', event => {
    if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('dragging');
  });
  dropzone.addEventListener('drop', event => {
    if (!transferHasFiles(event)) return;
    event.preventDefault(); event.stopPropagation(); hideExternalDropState();
    addFiles([...event.dataTransfer.files], { source: 'drop' });
  });

  toolWorkspace.addEventListener('dragenter', event => {
    if (!transferHasFiles(event)) return;
    event.preventDefault(); showExternalDropState();
  });
  toolWorkspace.addEventListener('dragover', event => {
    if (!transferHasFiles(event)) return;
    event.preventDefault(); showExternalDropState(); event.dataTransfer.dropEffect = 'copy';
  });
  toolWorkspace.addEventListener('dragleave', event => {
    if (!event.relatedTarget || !toolWorkspace.contains(event.relatedTarget)) hideExternalDropState();
  });
  toolWorkspace.addEventListener('drop', event => {
    if (!transferHasFiles(event)) return;
    event.preventDefault(); hideExternalDropState();
    addFiles([...event.dataTransfer.files], { source: 'drop' });
  });

  document.addEventListener('dragend', () => {
    if (state.internalDragKind) endInternalDrag();
  });
  window.addEventListener?.('blur', () => {
    if (state.internalDragKind) endInternalDrag();
  });

  function notifyFilesChanged(source = 'update') {
    window.dispatchEvent(new CustomEvent('centralpdf-files-changed', { detail: {
      tool: state.tool,
      source,
      fileCount: state.files.length,
      totalSize: state.files.reduce((sum, file) => sum + Number(file?.size || 0), 0)
    } }));
  }

  function selectTool(tool) {
    if (!toolConfig[tool]) return;
    state.tool = tool;
    document.body.dataset.activeTool = tool;
    state.files = [];
    state.splitPageCount = 0;
    state.splitPlan = [];
    state.toolPageCount = 0;
    state.filePageCounts.clear();
    resetOrganizer();
    updateOrganizerModeUI();
    window.PDFVisualEditor?.reset();
    homeView.classList.add('hidden');
    toolWorkspace.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.tool').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
    const config = toolConfig[tool];
    setCompletionState(false);
    window.CentralPDFUX?.renderTool(tool, config);
    $('#operationTitle').textContent = config.title;
    $('#operationDescription').textContent = config.description;
    $('#acceptedTypes').textContent = config.typeLabel;
    $('#dropTitle').textContent = config.multiple ? 'Escolha seus arquivos' : `Escolha um arquivo ${config.typeLabel === 'PDF' ? 'PDF' : ''}`.trim();
    fileInput.accept = config.accept;
    fileInput.multiple = config.multiple || tool === 'organize' || tool === 'editPdf';
    processButton.textContent = config.button;
    processButton.disabled = true;
    state.selectedFileKeys.clear();
    state.outputNameTouched = false;
    settingsContent.innerHTML = `${config.settings}${buildOutputNameField(config)}`;
    window.CentralPDFUX?.enhanceSettings(settingsContent, tool);
    const outputInput = $('#outputFileName');
    if (outputInput) outputInput.addEventListener('input', () => { state.outputNameTouched = true; });
    initializeToolSettings(tool);
    if (tool === 'ocr') window.CentralPDFOCR?.mount?.();
    if (tool === 'compare') window.CentralPDFCompare?.mount?.();
    if (tool === 'redact') window.CentralPDFRedaction?.mount?.();
    if (tool === 'formBuilder') window.CentralPDFForms?.mount?.();
    if (tool === 'signPdf') window.CentralPDFSignatures?.mount?.();
    if (['pdfToOffice','documentsToPdf','extractImages','archivePdf'].includes(tool)) window.CentralPDFConversions?.mount?.(tool);
    if (['documentAssistant','structuredExtraction','documentAudit','classifyRename'].includes(tool)) window.CentralPDFIntelligence?.mount?.(tool);
    addMoreFilesButton.classList.toggle('hidden', !(config.multiple || tool === 'organize' || tool === 'editPdf'));
    organizerSection.classList.toggle('hidden', !['organize', 'merge'].includes(tool));
    updateOrganizerModeUI();
    pdfEditorSection?.classList.toggle('hidden', tool !== 'editPdf');
    window.CentralPDFRedaction?.visible?.(tool === 'redact');
    window.CentralPDFForms?.visible?.(tool === 'formBuilder');
    window.CentralPDFSignatures?.visible?.(tool === 'signPdf');
    if (tool !== 'editPdf') window.PDFVisualEditor?.deactivate();
    $('#fileSection').classList.toggle('hidden', tool === 'merge');
    dropzone.classList.remove('compact');
    renderFiles();
    updateSteps(1);
    setStatus('Adicione um arquivo para continuar.');
    try { localStorage.setItem(HOME_STORAGE_KEY, tool); } catch (_) {}
    window.dispatchEvent(new CustomEvent('centralpdf-tool-selected', { detail: { tool, title: config.title } }));
    notifyFilesChanged('tool-selected');
  }

  function showHome() {
    toolWorkspace.classList.add('hidden');
    homeView.classList.remove('hidden');
    clearAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function filterToolCards() {
    const query = ($('#toolSearch').value || '').trim().toLocaleLowerCase('pt-BR');
    const activeCategory = document.querySelector('.category-tab.active')?.dataset.category || 'all';
    let visible = 0;
    document.querySelectorAll('.tool-card').forEach(card => {
      const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
      const haystack = `${card.dataset.search || ''} ${card.textContent || ''}`.toLocaleLowerCase('pt-BR');
      const matchesSearch = !query || haystack.includes(query);
      const show = matchesCategory && matchesSearch;
      card.classList.toggle('hidden', !show);
      if (show) visible += 1;
    });
    $('#noTools').classList.toggle('hidden', visible > 0);
    window.CentralPDFUX?.updateHomeCount();
  }

  function updateSteps(stage) {
    const steps = [$('#stepFiles'), $('#stepSettings'), $('#stepDownload')];
    steps.forEach((step, index) => {
      const number = index + 1;
      step.classList.toggle('active', number === stage);
      step.classList.toggle('complete', number < stage);
    });
    window.CentralPDFUX?.updateStage(stage);
  }

  function initializeHome() {
    homeView.classList.remove('hidden');
    toolWorkspace.classList.add('hidden');
    filterToolCards();
  }

  function clearAll() {
    setCompletionState(false);
    state.files = [];
    state.filePreviewCache.clear();
    state.selectedFileKeys.clear();
    state.outputNameTouched = false;
    state.splitPageCount = 0;
    state.splitPlan = [];
    state.toolPageCount = 0;
    state.filePageCounts.clear();
    resetOrganizer();
    window.PDFVisualEditor?.reset();
    fileInput.value = '';
    dropzone.classList.remove('compact');
    renderFiles();
    processButton.disabled = true;
    updateSteps(1);
    setStatus('Adicione um arquivo para continuar.');
    if (state.tool === 'ocr') window.CentralPDFOCR?.updatePlan?.([]);
    if (state.tool === 'compare') window.CentralPDFCompare?.updatePlan?.([]);
    if (state.tool === 'redact') window.CentralPDFRedaction?.updatePlan?.([]);
    if (state.tool === 'formBuilder') window.CentralPDFForms?.updatePlan?.([]);
    if (state.tool === 'signPdf') window.CentralPDFSignatures?.updatePlan?.([]);
    if (['pdfToOffice','documentsToPdf','extractImages','archivePdf'].includes(state.tool)) window.CentralPDFConversions?.updatePlan?.(state.tool, []);
    if (['documentAssistant','structuredExtraction','documentAudit','classifyRename'].includes(state.tool)) window.CentralPDFIntelligence?.updatePlan?.(state.tool, []);
    if (state.tool === 'split') {
      const info = $('#splitDocumentInfo');
      if (info) info.innerHTML = '<strong>Documento</strong><p>Adicione um PDF para calcular a divisão.</p>';
      updateSplitPlanPreview();
    }
    notifyFilesChanged('clear');
  }

  function setCompletionState(completed, message = '') {
    const wasCompleted = state.taskCompleted;
    state.taskCompleted = completed;
    document.body.classList.toggle('completion-open', completed);
    appShell.toggleAttribute('inert', completed);
    completionActions.classList.toggle('hidden', !completed);
    processButton.classList.toggle('hidden', completed);
    const labels = completionLabels[state.tool] || ['Continuar ajustando', 'Nova tarefa'];
    continueEditingButton.textContent = labels[0];
    clearButton.textContent = labels[1];
    if (completed) {
      completionReturnFocus ||= processButton;
      completionTitle.textContent = `Resultado de ${toolConfig[state.tool]?.title || 'tarefa'} pronto`;
      completionMessage.textContent = message || 'O download foi iniciado. Escolha como deseja continuar.';
      requestAnimationFrame(() => continueEditingButton.focus({ preventScroll: true }));
    } else if (wasCompleted) {
      const returnFocus = completionReturnFocus;
      completionReturnFocus = null;
      requestAnimationFrame(() => {
        const target = returnFocus?.isConnected && !returnFocus.disabled ? returnFocus : dropzone;
        target.focus({ preventScroll: true });
      });
    }
  }

  function trapCompletionFocus(event) {
    const focusable = [continueEditingButton, clearButton].filter(button => !button.disabled && !button.classList.contains('hidden'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!completionActions.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function continueEditing() {
    setCompletionState(false);
    updateSteps(2);
    if (state.tool === 'merge') updateMergePreview();
    else processButton.disabled = false;
    setStatus('Os arquivos e ajustes foram mantidos. Continue trabalhando e gere outro resultado quando quiser.', 'success');
  }

  function resetOrganizer() {
    if (state.organizerPreviewObserver) state.organizerPreviewObserver.disconnect();
    state.organizerPreviewObserver = null;
    state.organizerPreviewQueue = [];
    state.organizerPreviewActive = 0;
    for (const pdf of state.organizerPreviewPdfDocs.values()) { try { pdf.destroy?.(); } catch (_) {} }
    state.organizerPreviewPdfDocs.clear();
    state.organizerPages = [];
    state.originalOrganizerPages = [];
    state.organizerSources.clear();
    state.organizerHistory = [];
    state.organizerFuture = [];
    state.selectedPageIds.clear();
    state.organizerPageIdSeq = 0;
    state.organizerSourceSeq = 0;
    state.organizerInsertIndex = null;
    state.mergeOriginalFileKeys = [];
    state.dragMergeSourceKey = null;
    state.previewCache.clear();
    pageGrid.innerHTML = '';
    $('#pageCountLabel').textContent = '0 páginas';
    updateOrganizerBulkToolbar();
    updateOrganizerHistoryButtons();
  }

  function addFiles(files, options = {}) {
    const queuedFiles = Array.from(files || []);
    const queuedTool = state.tool;
    fileIngestChain = fileIngestChain.catch(error => {
      logPdfIngest('queue-recovered', null, error, 'queue');
    }).then(() => {
      if (state.tool !== queuedTool) {
        logPdfIngest('cancelled', null, new Error('A ferramenta mudou durante a leitura.'), 'queue');
        return;
      }
      return ingestFiles(queuedFiles, { ...options, queuedTool });
    });
    return fileIngestChain;
  }

  async function ingestFiles(files, options = {}) {
    if (window.CentralPDFEnginesReady) await window.CentralPDFEnginesReady.catch(() => null);
    const config = toolConfig[state.tool];
    const inspected = await inspectIncomingFiles(files, config);
    const valid = inspected.valid;
    const rejected = inspected.rejected;
    if (!valid.length) {
      setStatus(rejected.map(item => `${item.file.name}: ${item.message}`).join(' ') || 'Nenhum arquivo compatível foi selecionado.', 'error');
      notifyFilesChanged('rejected');
      return;
    }
    const prospectiveFiles = config.multiple ? [...state.files, ...valid] : valid;
    const qualityIssues = window.CentralPDFToolQuality?.validateFiles?.(state.tool, prospectiveFiles) || [];
    const blockingIssue = qualityIssues.find(item => item.level === 'error' && !/Adicione/i.test(item.message));
    if (blockingIssue) { setStatus(blockingIssue.message, 'error'); notifyFilesChanged('rejected'); return; }

    // Organizador: o primeiro PDF abre o documento; os demais entram como novas páginas.
    if (state.tool === 'organize') {
      if (!state.files.length) {
        const [base, ...additional] = valid;
        state.files = [base];
        fileInput.value = '';
        renderFiles(); syncOutputName(); updateSteps(2);
        await loadOrganizer(base);
        if (additional.length) await appendPdfFilesToOrganizer(additional, 'import');
      } else {
        await appendPdfFilesToOrganizer(valid, 'import');
      }
      processButton.disabled = !state.organizerPages.length;
      setStatus(ingestSummary(`${valid.length} PDF(s) adicionado(s). As páginas novas foram inseridas no final.`, rejected), rejected.length ? 'warning' : 'success');
      notifyFilesChanged(options.source || 'add');
      return;
    }

    // Editor visual: o primeiro PDF abre o editor; os demais são anexados como páginas.
    if (state.tool === 'editPdf') {
      try {
        if (!state.files.length) {
          const [base, ...additional] = valid;
          state.files = [base];
          fileInput.value = '';
          renderFiles(); syncOutputName(); updateSteps(2);
          await window.PDFVisualEditor?.loadFile(base);
          if (additional.length) await window.PDFVisualEditor?.addPdfPages(additional);
        } else {
          await window.PDFVisualEditor?.addPdfPages(valid);
        }
        processButton.disabled = !window.PDFVisualEditor?.hasDocument();
        setStatus(ingestSummary(`${valid.length} PDF(s) adicionado(s) ao editor.`, rejected), rejected.length ? 'warning' : 'success');
        notifyFilesChanged(options.source || 'add');
      } catch (error) {
        processButton.disabled = true; setStatus(readablePdfError(error), 'error');
      }
      return;
    }

    const added = [];
    if (config.multiple) {
      const keys = new Set(state.files.map(getFileCacheKey));
      valid.forEach(file => {
        const key = getFileCacheKey(file);
        if (!keys.has(key)) { state.files.push(file); added.push(file); keys.add(key); }
      });
    } else {
      state.files = [valid[0]]; added.push(valid[0]);
    }
    fileInput.value = '';
    renderFiles(); syncOutputName();
    updateSteps(2);

    if (state.tool === 'merge' && added.length) await appendPdfFilesToOrganizer(added, 'merge');
    if (state.tool === 'split') await loadSplitMetadata(state.files[0]);
    await loadAdvancedToolMetadata();
    if (state.tool === 'ocr') await window.CentralPDFOCR?.updatePlan?.(state.files);
    if (state.tool === 'compare') await window.CentralPDFCompare?.updatePlan?.(state.files);
    if (state.tool === 'redact') await window.CentralPDFRedaction?.updatePlan?.(state.files);
    if (state.tool === 'formBuilder') await window.CentralPDFForms?.updatePlan?.(state.files);
    if (state.tool === 'signPdf') await window.CentralPDFSignatures?.updatePlan?.(state.files);
    if (['pdfToOffice','documentsToPdf','extractImages','archivePdf'].includes(state.tool)) window.CentralPDFConversions?.updatePlan?.(state.tool, state.files);
    if (['documentAssistant','structuredExtraction','documentAudit','classifyRename'].includes(state.tool)) window.CentralPDFIntelligence?.updatePlan?.(state.tool, state.files);

    processButton.disabled = state.tool === 'merge' ? mergePdfSources().length < 2 || !state.organizerPages.length : state.tool === 'compare' ? state.files.length !== 2 : ['redact','formBuilder','signPdf'].includes(state.tool) ? state.files.length !== 1 : state.files.length === 0;
    setStatus(ingestSummary(`${added.length || valid.length} arquivo(s) adicionado(s). Você pode continuar arrastando outros arquivos para esta tela.`, rejected), rejected.length ? 'warning' : 'success');
    notifyFilesChanged(options.source || 'add');
  }

  async function inspectIncomingFiles(files, config) {
    const valid = [];
    const rejected = [];
    const acceptsPdf = /application\/pdf|\.pdf(?:,|$)/i.test(config.accept || '');
    for (const file of files) {
      if (!file || Number(file.size || 0) === 0) {
        const ingest = window.CentralPDFIngest;
        const message = ingest?.PdfIngestError
          ? ingest.describeError(new ingest.PdfIngestError('empty'))
          : 'O arquivo está vazio.';
        rejected.push({ file: file || { name: 'Arquivo' }, message, code: 'empty' });
        continue;
      }
      const acceptedNonPdf = isAcceptedNonPdf(file, config.accept);
      const explicitPdf = String(file.name || '').toLowerCase().endsWith('.pdf') || String(file.type || '').toLowerCase() === 'application/pdf';
      const inspectAsPdf = acceptsPdf && (explicitPdf || !acceptedNonPdf);
      if (!inspectAsPdf) {
        if (acceptedNonPdf) valid.push(file);
        else rejected.push({ file, message: 'O tipo de arquivo não é compatível com esta ferramenta.', code: 'unsupported' });
        continue;
      }
      try {
        logPdfIngest('received', file, null, 'received');
        const result = await window.CentralPDFIngest.inspectPdfFile(file, { parse: parsePdfForIngest });
        state.filePageCounts.set(getFileCacheKey(file), result.pageCount);
        valid.push(file);
        logPdfIngest('metadata-ready', file, null, 'metadata');
      } catch (error) {
        const recoverableForTool = (
          ['unlock', 'diagnose', 'repairAdvanced'].includes(state.tool)
          && ['encrypted', 'unsupportedEncryption'].includes(error?.code)
        ) || (
          ['diagnose', 'repairAdvanced'].includes(state.tool)
          && error?.code === 'corrupted'
        );
        if (recoverableForTool) {
          valid.push(file);
          rejected.push({ file, message: `${error.message} O arquivo foi mantido para esta ferramenta.`, code: error.code, warning: true });
        } else {
          rejected.push({ file, message: window.CentralPDFIngest?.describeError?.(error) || readablePdfError(error), code: error?.code || 'corrupted' });
        }
        logPdfIngest('failed', file, error, error?.stage || 'inspect');
      }
    }
    if (rejected.length) {
      window.CentralPDFStable?.addLog?.('aviso', `${rejected.length} arquivo(s) não passaram pela inspeção de entrada.`, `entrada: ${state.tool}`);
    }
    return { valid, rejected };
  }

  async function parsePdfForIngest(ownedBytes) {
    if (PDFLIB_INGEST_TOOLS.has(state.tool)) {
      if (!window.PDFLib?.PDFDocument) throw Object.assign(new Error('pdf-lib não está disponível.'), { name: 'PDFLibUnavailableError', engine: 'pdf-lib' });
      try {
        const document = await window.PDFLib.PDFDocument.load(ownedBytes, { ignoreEncryption: false, updateMetadata: false });
        return { pageCount: document.getPageCount() };
      } catch (error) {
        try { error.engine = 'pdf-lib'; } catch (_) {}
        throw error;
      }
    }
    await ensurePdfWorker();
    if (window.pdfjsLib?.getDocument) {
      const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(ownedBytes) });
      try {
        const documentProxy = await loadingTask.promise;
        return { pageCount: documentProxy.numPages };
      } finally {
        await loadingTask.destroy?.();
      }
    }
    if (window.PDFLib?.PDFDocument) {
      const document = await window.PDFLib.PDFDocument.load(ownedBytes, { ignoreEncryption: false, updateMetadata: false });
      return { pageCount: document.getPageCount() };
    }
    throw Object.assign(new Error('PDF.js e pdf-lib não estão disponíveis.'), { name: 'WorkerError' });
  }

  function ingestSummary(success, rejected) {
    if (!rejected.length) return success;
    const details = rejected.map(item => `${item.file.name}: ${item.message}`).join(' ');
    return `${success} ${rejected.length} arquivo(s) não carregado(s) ou com aviso. ${details}`;
  }

  function logPdfIngest(event, file, error, stage) {
    if (!window.CentralPDFDebugPdfIngest) return;
    console.debug(`[pdf-ingest] ${event}`, {
      stage, engine: error?.engine || 'pdfjs', errorName: error?.name || '',
      errorMessage: error?.technicalMessage || error?.message || '', fileName: file?.name || '',
      fileSize: Number(file?.size || 0), fileType: file?.type || '', runtime: 'legacy',
      workerMode: window.CentralPDFGetPdfWorkerStatus?.().mode || ''
    });
  }

  function isAccepted(file, accept) {
    if (accept.includes('application/pdf') && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) return true;
    if (accept.includes('image/') && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name))) return true;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return accept.toLowerCase().includes(ext);
  }

  function isAcceptedNonPdf(file, accept) {
    const entries = String(accept || '').split(',').map(item => item.trim().toLowerCase()).filter(item => item && item !== 'application/pdf' && item !== '.pdf');
    const type = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    return entries.some(entry => entry.endsWith('/*') ? type.startsWith(entry.slice(0, -1)) : entry.startsWith('.') ? name.endsWith(entry) : type === entry);
  }

  function renderFiles() {
    const config = toolConfig[state.tool];
    const showVisualCards = Boolean(config?.multiple && state.files.length);
    fileCount.textContent = `${state.files.length} ${state.files.length === 1 ? 'arquivo' : 'arquivos'}`;
    fileList.classList.toggle('file-card-grid', showVisualCards);
    fileBulkToolbar.classList.toggle('hidden', !showVisualCards);
    addMoreFilesButton.classList.toggle('hidden', !(config?.multiple || state.tool === 'organize' || state.tool === 'editPdf'));
    fileList.style.setProperty('--cover-card-width', `${state.coverZoom}px`);
    if (!state.files.length) {
      fileList.innerHTML = '<div class="empty-state">Nenhum arquivo selecionado.</div>';
      updateBulkToolbar();
      return;
    }
    fileList.innerHTML = '';
    state.files.forEach((file, index) => {
      const extension = (file.name.split('.').pop() || 'ARQ').slice(0, 4).toUpperCase();
      const key = getFileCacheKey(file);
      if (showVisualCards) {
        const card = document.createElement('article');
        card.className = `file-card${state.selectedFileKeys.has(key) ? ' selected' : ''}`;
        card.draggable = true;
        card.dataset.index = String(index);
        card.innerHTML = `
          <div class="file-card-order">${index + 1}</div>
          <label class="file-card-select" title="Selecionar arquivo"><input type="checkbox" ${state.selectedFileKeys.has(key) ? 'checked' : ''} /><span></span></label>
          <button class="file-card-remove" type="button" aria-label="Remover">×</button>
          <button class="file-card-cover loading" type="button" aria-label="Ampliar prévia de ${escapeHtml(file.name)}">
            <div class="file-cover-placeholder">
              <div class="file-cover-badge">${escapeHtml(extension)}</div>
              <strong>${config.typeLabel === 'PDF' ? 'Capa do PDF' : 'Prévia da imagem'}</strong>
              <span>Carregando miniatura...</span>
            </div>
          </button>
          <div class="file-card-body">
            <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
            <div class="file-card-meta-row"><span class="file-meta">${formatBytes(file.size)}</span><span class="file-page-count">Carregando...</span></div>
          </div>
          <div class="file-card-actions">
            <button class="icon-button move-up" type="button" aria-label="Mover para a esquerda" ${index === 0 ? 'disabled' : ''}>←</button>
            <span>Arraste para ordenar</span>
            <button class="icon-button move-down" type="button" aria-label="Mover para a direita" ${index === state.files.length - 1 ? 'disabled' : ''}>→</button>
          </div>`;
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => toggleFileSelection(file, checkbox.checked));
        card.querySelector('.move-up').addEventListener('click', event => { event.stopPropagation(); moveFile(index, -1); });
        card.querySelector('.move-down').addEventListener('click', event => { event.stopPropagation(); moveFile(index, 1); });
        card.querySelector('.file-card-remove').addEventListener('click', event => { event.stopPropagation(); removeFile(index); });
        card.querySelector('.file-card-cover').addEventListener('click', () => openFilePreview(file));
        card.addEventListener('dragstart', event => {
          if (event.target.closest('button, input, label')) { event.preventDefault(); return; }
          state.dragFileIndex = index;
          card.classList.add('dragging');
          beginInternalDrag('file', event, index);
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          document.querySelectorAll('.file-card').forEach(item => item.classList.remove('drop-target', 'external-drop-target'));
          state.dragFileIndex = null;
          endInternalDrag();
        });
        card.addEventListener('dragover', event => {
          event.preventDefault();
          if (transferHasFiles(event)) { card.classList.add('external-drop-target'); event.dataTransfer.dropEffect = 'copy'; }
          else card.classList.add('drop-target');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drop-target', 'external-drop-target'));
        card.addEventListener('drop', event => {
          event.preventDefault(); event.stopPropagation(); card.classList.remove('drop-target', 'external-drop-target');
          if (transferHasFiles(event)) { hideExternalDropState(); addFiles([...event.dataTransfer.files], { source: 'drop' }); return; }
          const from = state.dragFileIndex ?? Number(event.dataTransfer.getData(INTERNAL_FILE_DRAG_TYPE) || event.dataTransfer.getData('text/plain'));
          moveFileTo(from, index);
          endInternalDrag();
        });
        fileList.appendChild(card);
        renderFileCardPreview(file, card, extension);
      } else {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `
          <div class="file-type">${escapeHtml(extension)}</div>
          <div class="file-info"><div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div><div class="file-meta">${formatBytes(file.size)}</div></div>
          <div class="file-order">
            <button class="icon-button move-up" type="button" aria-label="Mover para cima" ${index === 0 || !config.multiple ? 'disabled' : ''}>↑</button>
            <button class="icon-button move-down" type="button" aria-label="Mover para baixo" ${index === state.files.length - 1 || !config.multiple ? 'disabled' : ''}>↓</button>
          </div>
          <button class="remove-button" type="button" aria-label="Remover">×</button>`;
        row.querySelector('.move-up').addEventListener('click', () => moveFile(index, -1));
        row.querySelector('.move-down').addEventListener('click', () => moveFile(index, 1));
        row.querySelector('.remove-button').addEventListener('click', () => removeFile(index));
        fileList.appendChild(row);
      }
    });
    updateBulkToolbar();
  }

  function moveFile(index, direction) {
    moveFileTo(index, index + direction);
  }

  function moveFileTo(from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to || from < 0 || to < 0 || from >= state.files.length || to >= state.files.length) return;
    const [file] = state.files.splice(from, 1);
    state.files.splice(to, 0, file);
    renderFiles();
    refreshAdvancedPreviews();
    setStatus('Ordem atualizada. O resultado seguirá a sequência das capas.');
    notifyFilesChanged('reorder');
  }

  function removeFile(index) {
    const file = state.files[index];
    if (state.tool === 'split') { state.splitPageCount = 0; state.splitPlan = []; }
    if (file) state.selectedFileKeys.delete(getFileCacheKey(file));
    state.files.splice(index, 1);
    if (!state.files.length) state.toolPageCount = 0;
    if (state.tool === 'merge' && file) removeMergeFilePages(file);
    else if (state.tool !== 'merge') resetOrganizer();
    if (state.tool === 'editPdf') window.PDFVisualEditor?.reset();
    renderFiles();
    syncOutputName();
    dropzone.classList.remove('compact');
    processButton.disabled = state.tool === 'compare' ? state.files.length !== 2 : state.tool === 'redact' ? state.files.length !== 1 : state.files.length === 0;
    updateSteps(state.files.length ? 2 : 1);
    setStatus(state.files.length ? 'Arquivos atualizados. Revise os ajustes.' : 'Adicione um arquivo para continuar.');
    if (state.tool === 'split') {
      const info = $('#splitDocumentInfo');
      if (info) info.innerHTML = '<strong>Documento</strong><p>Adicione um PDF para calcular a divisão.</p>';
      updateSplitPlanPreview();
    }
    refreshAdvancedPreviews();
    notifyFilesChanged('remove');
  }

  function toggleFileSelection(file, selected) {
    const key = getFileCacheKey(file);
    if (selected) state.selectedFileKeys.add(key);
    else state.selectedFileKeys.delete(key);
    document.querySelectorAll('.file-card').forEach(card => {
      const index = Number(card.dataset.index);
      const current = state.files[index];
      card.classList.toggle('selected', Boolean(current && state.selectedFileKeys.has(getFileCacheKey(current))));
    });
    updateBulkToolbar();
  }

  function toggleSelectAllFiles() {
    const allSelected = state.files.length > 0 && state.files.every(file => state.selectedFileKeys.has(getFileCacheKey(file)));
    state.selectedFileKeys.clear();
    if (!allSelected) state.files.forEach(file => state.selectedFileKeys.add(getFileCacheKey(file)));
    renderFiles();
  }

  function removeSelectedFiles() {
    if (!state.selectedFileKeys.size) return;
    const removedFiles = state.files.filter(file => state.selectedFileKeys.has(getFileCacheKey(file)));
    state.files = state.files.filter(file => !state.selectedFileKeys.has(getFileCacheKey(file)));
    if (state.tool === 'merge') removedFiles.forEach(removeMergeFilePages);
    state.selectedFileKeys.clear();
    renderFiles();
    syncOutputName();
    processButton.disabled = state.tool === 'compare' ? state.files.length !== 2 : state.tool === 'redact' ? state.files.length !== 1 : state.files.length === 0;
    updateSteps(state.files.length ? 2 : 1);
    if (!state.files.length) state.toolPageCount = 0;
    refreshAdvancedPreviews();
    setStatus(state.files.length ? 'Arquivos selecionados removidos.' : 'Adicione um arquivo para continuar.');
  }

  function updateBulkToolbar() {
    const selected = state.files.filter(file => state.selectedFileKeys.has(getFileCacheKey(file))).length;
    $('#selectedFilesCount').textContent = `${selected} selecionado${selected === 1 ? '' : 's'}`;
    $('#removeSelectedFiles').disabled = selected === 0;
    const allSelected = state.files.length > 0 && selected === state.files.length;
    $('#selectAllFiles').textContent = allSelected ? 'Limpar seleção' : 'Selecionar todos';
  }

  function getFileCacheKey(file) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  async function renderFileCardPreview(file, card, extension) {
    if (!card) return;
    const key = getFileCacheKey(file);
    let preview = state.filePreviewCache.get(key);
    try {
      if (!preview) {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) preview = await buildPdfCoverData(file, extension);
        else if (file.type.startsWith('image/')) preview = await buildImageCoverData(file, extension);
        if (!preview) throw new Error('sem miniatura');
        state.filePreviewCache.set(key, preview);
      }
      applyFileCardPreview(card, file, preview, extension);
    } catch (error) {
      console.warn('Miniatura indisponível para', file.name, error);
      let pageCount = null;
      if ((file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && window.PDFLib) {
        try { pageCount = (await PDFLib.PDFDocument.load(await file.arrayBuffer())).getPageCount(); } catch (_) {}
      }
      preview = { dataUrl: '', pageCount, type: extension };
      state.filePreviewCache.set(key, preview);
      applyFileCardPreview(card, file, preview, extension);
    }
  }

  function applyFileCardPreview(card, file, preview, extension) {
    const cover = card.querySelector('.file-card-cover');
    cover.classList.remove('loading');
    cover.innerHTML = preview.dataUrl
      ? `<img src="${preview.dataUrl}" alt="Capa de ${escapeHtml(file.name)}" class="file-cover-image" draggable="false" /><div class="file-cover-badge floating">${escapeHtml(extension)}</div><span class="cover-expand-hint">Ampliar</span>`
      : `<div class="file-cover-placeholder"><div class="file-cover-badge">${escapeHtml(extension)}</div><strong>${escapeHtml(extension)}</strong><span>Prévia indisponível</span></div>`;
    const pages = card.querySelector('.file-page-count');
    pages.textContent = preview.pageCount ? `${preview.pageCount} ${preview.pageCount === 1 ? 'página' : 'páginas'}` : 'Imagem';
  }

  async function buildPdfCoverData(file, extension) {
    await window.CentralPDFEnginesReady;
    if (!window.pdfjsLib) throw new Error('pdfjs indisponível');
    await ensurePdfWorker();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    try {
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(220 / baseViewport.width, 290 / baseViewport.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return { dataUrl: canvas.toDataURL('image/jpeg', .9), pageCount: pdf.numPages, type: extension };
    } finally {
      await pdf.destroy();
    }
  }

  async function buildImageCoverData(file, extension) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(220 / bitmap.width, 290 / bitmap.height, 1);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      return { dataUrl: canvas.toDataURL('image/jpeg', .9), pageCount: null, type: extension };
    } finally {
      bitmap.close();
    }
  }

  async function openFilePreview(file) {
    const preview = state.filePreviewCache.get(getFileCacheKey(file));
    if (!preview?.dataUrl) {
      setStatus('A prévia ampliada não está disponível para este arquivo.', 'error');
      return;
    }
    $('#previewFileName').textContent = file.name;
    $('#previewLargeImage').src = preview.dataUrl;
    $('#previewFileType').textContent = preview.type || 'Arquivo';
    $('#previewFilePages').textContent = preview.pageCount ? `${preview.pageCount} ${preview.pageCount === 1 ? 'página' : 'páginas'}` : 'Imagem';
    $('#previewFileSize').textContent = formatBytes(file.size);
    previewDialog.showModal();
  }

  function initializeToolSettings(tool) {
    if (tool === 'editPdf') { window.PDFVisualEditor?.activate(); return; }
    if (tool === 'split') {
      bindSettingChanges(['splitMode','splitCustomGroups','splitIncludeUnmentioned','splitPartCount','splitPagesPerFile','splitCuts'], () => {
        updateSplitPanels(); updateSplitPlanPreview();
      });
      updateSplitPanels(); updateSplitPlanPreview();
      return;
    }
    if (tool === 'merge') {
      bindSettingChanges(['mergePreserveMetadata'], updateMergePreview);
      updateMergeModePanels();
      updateMergePreview();
      return;
    }
    if (tool === 'extract') {
      bindSettingChanges(['extractMode','extractPages','extractGroups','extractRemovePages','extractAllowDuplicates','extractManifest'], () => {
        updateExtractPanels(); updateExtractPreview();
      });
      updateExtractPanels(); updateExtractPreview();
      return;
    }
    if (tool === 'rotate') {
      bindSettingChanges(['rotateMode'], () => $('#rotatePagesPanel')?.classList.toggle('hidden', $('#rotateMode')?.value !== 'selected'));
      $('#rotatePagesPanel')?.classList.toggle('hidden', $('#rotateMode')?.value !== 'selected');
      return;
    }
    if (tool === 'watermark') {
      bindSettingChanges(['watermarkType','watermarkPattern','watermarkPosition','watermarkScope','watermarkText','watermarkSize','watermarkOpacity','watermarkRotation'], updateWatermarkPanels);
      updateWatermarkPanels(); return;
    }
    if (tool === 'pageNumbers') {
      bindSettingChanges(['numberFormat','numberScope'], updateNumberPanels); updateNumberPanels(); return;
    }
    if (tool === 'imagesToPdf') {
      bindSettingChanges(['imagePageMode'], () => $('#imageCustomPagePanel')?.classList.toggle('hidden', $('#imagePageMode')?.value !== 'custom'));
      $('#imageCustomPagePanel')?.classList.toggle('hidden', $('#imagePageMode')?.value !== 'custom'); return;
    }
    if (tool === 'compress') {
      bindSettingChanges(['compressionMode','compressionScope'], updateCompressionPanels); updateCompressionPanels(); return;
    }
    if (tool === 'pdfToImage') {
      bindSettingChanges(['pdfImageScope','pdfImageOutputMode','pdfImageFormat'], updatePdfImagePanels); updatePdfImagePanels(); return;
    }
    if (tool === 'crop') {
      bindSettingChanges(['cropMode','cropScope'], updateCropPanels); updateCropPanels();
    }
  }

  function bindSettingChanges(ids, callback) {
    ids.forEach(id => {
      const element = $(`#${id}`);
      if (!element) return;
      const eventName = element.tagName === 'SELECT' || element.type === 'checkbox' || element.type === 'file' || element.type === 'color' ? 'change' : 'input';
      element.addEventListener(eventName, callback);
    });
  }

  async function loadAdvancedToolMetadata() {
    if (!window.PDFLib || !state.files.length) { refreshAdvancedPreviews(); return; }
    const pdfTools = new Set(['merge','extract','rotate','watermark','pageNumbers','compress','pdfToImage','crop']);
    if (!pdfTools.has(state.tool)) return;
    for (const file of state.files) {
      const key = getFileCacheKey(file);
      if (state.filePageCounts.has(key)) continue;
      try {
        const doc = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false, updateMetadata: false });
        state.filePageCounts.set(key, doc.getPageCount());
      } catch (_) {
        state.filePageCounts.set(key, 0);
      }
    }
    state.toolPageCount = state.files[0] ? Number(state.filePageCounts.get(getFileCacheKey(state.files[0])) || 0) : 0;
    refreshAdvancedPreviews();
  }

  function refreshAdvancedPreviews() {
    if (state.tool === 'merge') updateMergePreview();
    if (state.tool === 'extract') updateExtractPreview();
    if (state.tool === 'watermark') updateWatermarkPanels();
    if (state.tool === 'compare') window.CentralPDFCompare?.updatePlan?.(state.files);
    if (state.tool === 'redact') window.CentralPDFRedaction?.updatePlan?.(state.files);
    if (state.tool === 'formBuilder') window.CentralPDFForms?.updatePlan?.(state.files);
    if (state.tool === 'signPdf') window.CentralPDFSignatures?.updatePlan?.(state.files);
    if (['pdfToOffice','documentsToPdf','extractImages','archivePdf'].includes(state.tool)) window.CentralPDFConversions?.updatePlan?.(state.tool, state.files);
    if (['documentAssistant','structuredExtraction','documentAudit','classifyRename'].includes(state.tool)) window.CentralPDFIntelligence?.updatePlan?.(state.tool, state.files);
  }

  function findFileForOrganizerPage(page) {
    if (typeof File !== 'undefined' && page?.sourceFile instanceof File) return page.sourceFile;
    if (page?.sourceFileKey) {
      const exact = state.files.find(file => getFileCacheKey(file) === page.sourceFileKey);
      if (exact) return exact;
    }
    const currentSource = page?.sourceKey ? state.organizerSources.get(page.sourceKey) : null;
    if (typeof File !== 'undefined' && currentSource?.file instanceof File) return currentSource.file;
    if (page?.origin) {
      const matches = state.files.filter(file => file.name === page.origin);
      if (matches.length === 1) return matches[0];
    }
    return null;
  }

  function repairOrganizerSourceLinks() {
    let repaired = 0;
    const missing = [];
    for (let index = 0; index < state.organizerPages.length; index++) {
      const page = state.organizerPages[index];
      if (page.kind !== 'pdf') continue;
      let source = state.organizerSources.get(page.sourceKey);
      if (source?.file) {
        page.sourceFile = source.file;
        page.sourceFileKey = source.fileKey || getFileCacheKey(source.file);
        continue;
      }
      const file = findFileForOrganizerPage(page);
      if (!file) {
        missing.push({ index, page });
        continue;
      }
      const sourceKey = page.sourceKey || nextOrganizerSourceKey('recovered');
      source = {
        kind: 'pdf',
        file,
        fileKey: getFileCacheKey(file),
        name: file.name,
        pageCount: Number(page.pageCount || 0)
      };
      state.organizerSources.set(sourceKey, source);
      page.sourceKey = sourceKey;
      page.sourceFile = file;
      page.sourceFileKey = source.fileKey;
      repaired += 1;
    }
    state.mergeLastRepairCount = repaired;
    return { repaired, missing };
  }

  function createPdfDocumentPool(PDFDocument, limit = 3) {
    const cache = new Map();
    return {
      async get(page) {
        const source = state.organizerSources.get(page.sourceKey);
        const file = source?.file || findFileForOrganizerPage(page);
        if (!file) return null;
        const cacheKey = page.sourceKey || getFileCacheKey(file);
        if (cache.has(cacheKey)) {
          const document = cache.get(cacheKey);
          cache.delete(cacheKey);
          cache.set(cacheKey, document);
          return document;
        }
        const document = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
        cache.set(cacheKey, document);
        while (cache.size > limit) cache.delete(cache.keys().next().value);
        return document;
      },
      first() {
        return cache.values().next().value || null;
      },
      clear() { cache.clear(); }
    };
  }

  async function yieldToBrowser() {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  function mergePdfSources() {
    const entries = [...state.organizerSources.entries()].filter(([, source]) => source?.kind === 'pdf' && source?.file);
    const byFileKey = new Map(entries.map(entry => [entry[1].fileKey, entry]));
    const ordered = [];
    state.files.forEach(file => {
      const entry = byFileKey.get(getFileCacheKey(file));
      if (entry) { ordered.push(entry); byFileKey.delete(entry[1].fileKey); }
    });
    byFileKey.forEach(entry => ordered.push(entry));
    return ordered;
  }

  function mergeSourcePageCount(sourceKey) {
    return state.organizerPages.reduce((count, page) => count + (page.sourceKey === sourceKey ? 1 : 0), 0);
  }

  function mergeSourceNumber(name) {
    const match = String(name || '').match(/\d+/);
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
  }

  function reorderPagesBySourceKeys(pages, sourceKeys) {
    const groups = new Map();
    pages.forEach(page => {
      if (!groups.has(page.sourceKey)) groups.set(page.sourceKey, []);
      groups.get(page.sourceKey).push(page);
    });
    const ordered = [];
    const emitted = new Set();
    sourceKeys.forEach(sourceKey => {
      const group = groups.get(sourceKey);
      if (group) { ordered.push(...group); emitted.add(sourceKey); }
    });
    pages.forEach(page => {
      if (emitted.has(page.sourceKey)) return;
      const group = groups.get(page.sourceKey);
      if (group) { ordered.push(...group); emitted.add(page.sourceKey); }
    });
    return ordered;
  }

  function applyDefaultMergeNameOrder() {
    const entries = mergePdfSources();
    if (entries.length < 2) return;
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    const ordered = [...entries].sort((a, b) => collator.compare(a[1]?.name || a[1]?.file?.name || '', b[1]?.name || b[1]?.file?.name || ''));
    const sourceKeys = ordered.map(([key]) => key);
    const sources = new Map(entries);
    const orderedFiles = sourceKeys.map(key => sources.get(key)?.file).filter(Boolean);
    const orderedFileKeys = new Set(orderedFiles.map(getFileCacheKey));
    state.files = [...orderedFiles, ...state.files.filter(file => !orderedFileKeys.has(getFileCacheKey(file)))];
    state.organizerPages = reorderPagesBySourceKeys(state.organizerPages, sourceKeys);
    state.originalOrganizerPages = reorderPagesBySourceKeys(state.originalOrganizerPages, sourceKeys);
    const selector = $('#mergeSourceSort');
    if (selector) selector.value = 'nameAsc';
  }

  function applyMergeSourceOrder(sourceKeys, options = {}) {
    const currentSources = new Map(mergePdfSources());
    const validKeys = sourceKeys.filter(key => currentSources.has(key));
    mergePdfSources().forEach(([key]) => { if (!validKeys.includes(key)) validKeys.push(key); });
    if (validKeys.length < 2) return;

    if (options.recordHistory !== false) pushOrganizerHistory();
    const orderedFiles = validKeys.map(key => currentSources.get(key)?.file).filter(Boolean);
    const mergeFileKeys = new Set(orderedFiles.map(getFileCacheKey));
    state.files = [...orderedFiles, ...state.files.filter(file => !mergeFileKeys.has(getFileCacheKey(file)))];
    state.organizerPages = reorderPagesBySourceKeys(state.organizerPages, validKeys);
    state.originalOrganizerPages = reorderPagesBySourceKeys(state.originalOrganizerPages, validKeys);
    state.selectedPageIds.clear();
    renderFiles();
    renderPageGridFromCache();
    updateMergePreview();
    syncOutputName();
    if (options.status !== false) setStatus(options.message || 'Ordem dos documentos atualizada. As páginas foram agrupadas por origem.');
  }

  function reorderMergeSource(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    const keys = mergePdfSources().map(([key]) => key);
    const from = keys.indexOf(fromKey);
    const to = keys.indexOf(toKey);
    if (from < 0 || to < 0) return;
    keys.splice(to, 0, keys.splice(from, 1)[0]);
    const selector = $('#mergeSourceSort');
    if (selector) selector.value = 'manual';
    applyMergeSourceOrder(keys, { message: 'Ordem manual dos documentos atualizada.' });
  }

  function sortMergeSources(mode) {
    if (!mode || mode === 'manual') return;
    const entries = mergePdfSources();
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    const originalIndex = new Map(state.mergeOriginalFileKeys.map((key, index) => [key, index]));
    const decorated = entries.map(([key, source], index) => ({
      key, source, index,
      name: source.name || source.file?.name || '',
      pages: mergeSourcePageCount(key),
      size: Number(source.file?.size || 0),
      modified: Number(source.file?.lastModified || 0),
      number: mergeSourceNumber(source.name || source.file?.name)
    }));
    const stable = comparator => decorated.sort((a, b) => comparator(a, b) || a.index - b.index);
    if (mode === 'added') stable((a, b) => (originalIndex.get(a.source.fileKey) ?? 1e9) - (originalIndex.get(b.source.fileKey) ?? 1e9));
    else if (mode === 'nameAsc') stable((a, b) => collator.compare(a.name, b.name));
    else if (mode === 'nameDesc') stable((a, b) => collator.compare(b.name, a.name));
    else if (mode === 'numberAsc') stable((a, b) => a.number - b.number || collator.compare(a.name, b.name));
    else if (mode === 'numberDesc') stable((a, b) => b.number - a.number || collator.compare(a.name, b.name));
    else if (mode === 'pagesDesc') stable((a, b) => b.pages - a.pages || collator.compare(a.name, b.name));
    else if (mode === 'pagesAsc') stable((a, b) => a.pages - b.pages || collator.compare(a.name, b.name));
    else if (mode === 'sizeDesc') stable((a, b) => b.size - a.size || collator.compare(a.name, b.name));
    else if (mode === 'sizeAsc') stable((a, b) => a.size - b.size || collator.compare(a.name, b.name));
    else if (mode === 'newest') stable((a, b) => b.modified - a.modified || collator.compare(a.name, b.name));
    else if (mode === 'oldest') stable((a, b) => a.modified - b.modified || collator.compare(a.name, b.name));
    applyMergeSourceOrder(decorated.map(item => item.key), { message: `Documentos ordenados por ${$('#mergeSourceSort')?.selectedOptions?.[0]?.textContent || 'critério selecionado'}.` });
  }

  function reverseMergeSources() {
    const keys = mergePdfSources().map(([key]) => key).reverse();
    const selector = $('#mergeSourceSort');
    if (selector) selector.value = 'manual';
    applyMergeSourceOrder(keys, { message: 'Ordem dos documentos invertida.' });
  }

  function removeMergeSource(sourceKey) {
    const source = state.organizerSources.get(sourceKey);
    if (!source) return;
    pushOrganizerHistory();
    state.organizerPages = state.organizerPages.filter(page => page.sourceKey !== sourceKey);
    state.originalOrganizerPages = state.originalOrganizerPages.filter(page => page.sourceKey !== sourceKey);
    state.organizerSources.delete(sourceKey);
    state.selectedPageIds.clear();
    state.dragMergeSourceKey = null;
    const sortSelect = $('#mergeSourceSort');
    if (sortSelect) sortSelect.value = 'manual';
    if (source.fileKey) {
      const stillUsed = [...state.organizerSources.values()].some(item => item?.fileKey === source.fileKey);
      if (!stillUsed) state.files = state.files.filter(file => getFileCacheKey(file) !== source.fileKey);
    }
    renderFiles();
    renderPageGridFromCache();
    updateMergePreview();
    syncOutputName();
    updateSteps(mergePdfSources().length ? 2 : 1);
    setStatus(mergePdfSources().length ? 'Documento removido da união.' : 'Adicione os PDFs para continuar.');
  }

  function updateMergePreview() {
    const preview = $('#mergePlanPreview');
    const count = $('#mergePlanCount');
    if (!preview || !count) return;
    const integrity = repairOrganizerSourceLinks();
    const total = state.organizerPages.length;
    const sources = mergePdfSources();
    const totalBytes = state.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    const largeBatch = total >= 250 || totalBytes >= 150 * 1024 * 1024;
    const notice = $('#mergeLargeBatchNotice');
    const noticeText = $('#mergeLargeBatchText');
    if (notice) notice.classList.toggle('hidden', !largeBatch);
    if (noticeText && largeBatch) noticeText.textContent = `${total} páginas e ${formatBytes(totalBytes)} serão processados em etapas. Mantenha esta aba aberta até o download começar.`;
    count.textContent = `${total} ${total === 1 ? 'página' : 'páginas'}`;
    if (!sources.length) {
      preview.innerHTML = '<div class="split-plan-empty">Adicione pelo menos dois PDFs. As páginas aparecerão diretamente no organizador central.</div>';
      processButton.disabled = true;
      return;
    }
    preview.innerHTML = sources.map(([sourceKey, source], index) => {
      const pages = state.organizerPages.filter(page => page.sourceKey === sourceKey).length;
      return `<div class="merge-source-item" draggable="true" data-merge-source-key="${escapeHtml(sourceKey)}" data-merge-source-index="${index}"><span class="merge-source-drag" aria-hidden="true" title="Arraste para mudar a ordem">⋮⋮</span><span class="merge-source-index">${index + 1}</span><div><strong title="${escapeHtml(source.name || 'Documento PDF')}">${escapeHtml(source.name || 'Documento PDF')}</strong><small>${pages} ${pages === 1 ? 'página restante' : 'páginas restantes'} • ${formatBytes(source.file?.size || 0)}</small></div><button type="button" data-remove-merge-source="${escapeHtml(sourceKey)}" aria-label="Remover ${escapeHtml(source.name || 'documento')}" title="Remover documento inteiro">×</button></div>`;
    }).join('');
    if (integrity.missing.length) {
      preview.insertAdjacentHTML('afterbegin', `<div class="split-plan-error">${integrity.missing.length} página(s) perderam o vínculo com o arquivo de origem. Remova essas páginas ou adicione novamente o PDF correspondente.</div>`);
    } else if (integrity.repaired) {
      preview.insertAdjacentHTML('afterbegin', `<div class="notice-card success"><strong>Vínculo recuperado</strong><p>${integrity.repaired} página(s) foram religadas automaticamente aos arquivos de origem.</p></div>`);
    }
    preview.querySelectorAll('[data-remove-merge-source]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); removeMergeSource(button.dataset.removeMergeSource); }));
    preview.querySelectorAll('.merge-source-item').forEach(item => {
      item.addEventListener('dragstart', event => {
        state.dragMergeSourceKey = item.dataset.mergeSourceKey;
        item.classList.add('dragging');
        beginInternalDrag('file', event, Number(item.dataset.mergeSourceIndex || 0));
      });
      item.addEventListener('dragover', event => {
        if (!state.dragMergeSourceKey) return;
        event.preventDefault(); event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        item.classList.add('drop-target');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
      item.addEventListener('drop', event => {
        if (!state.dragMergeSourceKey) return;
        event.preventDefault(); event.stopPropagation();
        const fromKey = state.dragMergeSourceKey;
        const toKey = item.dataset.mergeSourceKey;
        item.classList.remove('drop-target');
        reorderMergeSource(fromKey, toKey);
        state.dragMergeSourceKey = null;
        endInternalDrag();
      });
      item.addEventListener('dragend', () => {
        state.dragMergeSourceKey = null;
        item.classList.remove('dragging');
        preview.querySelectorAll('.merge-source-item').forEach(row => row.classList.remove('drop-target'));
        endInternalDrag();
      });
    });
    const sortSelect = $('#mergeSourceSort');
    if (sortSelect && !sortSelect.dataset.bound) {
      sortSelect.dataset.bound = 'true';
      sortSelect.addEventListener('change', () => sortMergeSources(sortSelect.value));
    }
    const reverseButton = $('#mergeReverseSources');
    if (reverseButton && !reverseButton.dataset.bound) {
      reverseButton.dataset.bound = 'true';
      reverseButton.addEventListener('click', reverseMergeSources);
    }
    processButton.disabled = sources.length < 2 || total < 1 || integrity.missing.length > 0 || state.mergeExportRunning;
  }

  function updateExtractPreview() {
    const preview = $('#extractPlanPreview'); const count = $('#extractPlanCount'); const info = $('#extractDocumentInfo');
    if (!preview || !count) return;
    const pageCount = state.toolPageCount;
    if (!pageCount) { count.textContent = '0 arquivos'; preview.innerHTML = '<div class="split-plan-empty">Adicione um PDF para visualizar o resultado.</div>'; if (info) info.innerHTML = '<strong>Documento</strong><p>Adicione um PDF para calcular o resultado.</p>'; processButton.disabled = true; return; }
    if (info) info.innerHTML = `<strong>${escapeHtml(state.files[0].name)}</strong><p>${pageCount} página(s) • ${formatBytes(state.files[0].size)}</p>`;
    try {
      const mode = $('#extractMode')?.value || 'single';
      const groups = AdvancedPlanner.buildExtractPlan(mode, pageCount, { pages: mode === 'remove' ? $('#extractRemovePages')?.value : $('#extractPages')?.value, groups: $('#extractGroups')?.value, allowDuplicates: Boolean($('#extractAllowDuplicates')?.checked) });
      count.textContent = `${groups.length} ${groups.length === 1 ? 'arquivo' : 'arquivos'}`;
      preview.innerHTML = groups.map((pages, index) => `<div class="split-plan-item"><span>${String(index + 1).padStart(2,'0')}</span><div><strong>Páginas ${AdvancedPlanner.formatPages(pages)}</strong><small>${pages.length} página(s)</small></div></div>`).join('');
      processButton.disabled = false;
    } catch (error) { count.textContent = 'Plano incompleto'; preview.innerHTML = `<div class="split-plan-error">${escapeHtml(error.message)}</div>`; processButton.disabled = true; }
  }

  function updateExtractPanels() {
    const mode = $('#extractMode')?.value || 'single';
    document.querySelectorAll('[data-extract-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.extractPanel !== mode);
    });
  }

  function updateWatermarkPanels() {
    const type = $('#watermarkType')?.value || 'text';
    $('#watermarkTextPanel')?.classList.toggle('hidden', type !== 'text');
    $('#watermarkImagePanel')?.classList.toggle('hidden', type !== 'image');
    $('#watermarkPagesPanel')?.classList.toggle('hidden', $('#watermarkScope')?.value !== 'selected');
    const summary = $('#watermarkSummary');
    if (summary) summary.textContent = `${$('#watermarkPattern')?.value === 'tile' ? 'Marcas repetidas' : 'Uma marca'} de ${type === 'text' ? 'texto' : 'imagem'}, ${$('#watermarkPosition')?.selectedOptions?.[0]?.textContent?.toLowerCase() || 'no centro'}, com ${$('#watermarkOpacity')?.value || 20}% de opacidade.`;
  }

  function updateNumberPanels() {
    $('#numberCustomPanel')?.classList.toggle('hidden', $('#numberFormat')?.value !== 'custom');
    $('#numberPagesPanel')?.classList.toggle('hidden', $('#numberScope')?.value !== 'selected');
  }

  function updateCompressionPanels() {
    $('#compressionCustomPanel')?.classList.toggle('hidden', $('#compressionMode')?.value !== 'custom');
    $('#compressionPagesPanel')?.classList.toggle('hidden', $('#compressionScope')?.value !== 'selected');
  }

  function updatePdfImagePanels() {
    $('#pdfImagePagesPanel')?.classList.toggle('hidden', $('#pdfImageScope')?.value !== 'selected');
    $('#pdfImageContactPanel')?.classList.toggle('hidden', $('#pdfImageOutputMode')?.value !== 'contact');
    const transparent = $('#pdfImageTransparent'); if (transparent) transparent.disabled = $('#pdfImageFormat')?.value !== 'image/png';
  }

  function updateCropPanels() {
    const mode = $('#cropMode')?.value || 'margins';
    $('#cropMarginsPanel')?.classList.toggle('hidden', !['margins','percent'].includes(mode));
    $('#cropCenterPanel')?.classList.toggle('hidden', mode !== 'center');
    const hint = $('#cropUnitHint'); if (hint) hint.textContent = mode === 'percent' ? 'Valores em percentual da largura ou altura.' : 'Valores em milímetros.';
    $('#cropPagesPanel')?.classList.toggle('hidden', $('#cropScope')?.value !== 'selected');
  }

  function updateSplitPanels() {
    const mode = $('#splitMode')?.value || 'custom';
    document.querySelectorAll('[data-split-panel]').forEach(panel => {
      panel.classList.toggle('hidden', panel.dataset.splitPanel !== mode);
    });
  }

  async function loadSplitMetadata(file) {
    if (!file || !window.PDFLib) return;
    const info = $('#splitDocumentInfo');
    try {
      if (info) info.innerHTML = '<strong>Documento</strong><p>Lendo a quantidade de páginas...</p>';
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      state.splitPageCount = document.getPageCount();
      const groupsInput = $('#splitCustomGroups');
      if (groupsInput && !groupsInput.value.trim()) {
        if (state.splitPageCount === 1) groupsInput.value = '1';
        else {
          const midpoint = Math.ceil(state.splitPageCount / 2);
          groupsInput.value = `1-${midpoint};${midpoint + 1}-${state.splitPageCount}`;
        }
      }
      if (info) info.innerHTML = `<strong>${escapeHtml(file.name)}</strong><p>${state.splitPageCount} página(s) • ${formatBytes(file.size)}</p>`;
      updateSplitPlanPreview();
    } catch (error) {
      state.splitPageCount = 0;
      state.splitPlan = [];
      if (info) info.innerHTML = `<strong>Não foi possível analisar</strong><p>${escapeHtml(readablePdfError(error))}</p>`;
      updateSplitPlanPreview();
    }
  }

  function currentSplitOptions() {
    return {
      groups: $('#splitCustomGroups')?.value || '',
      includeUnmentioned: Boolean($('#splitIncludeUnmentioned')?.checked),
      parts: Number($('#splitPartCount')?.value || 2),
      pagesPerFile: Number($('#splitPagesPerFile')?.value || 2),
      cuts: $('#splitCuts')?.value || ''
    };
  }

  function calculateSplitPlan(pageCount) {
    if (!window.SplitPlanner) throw new Error('O planejador de divisão não carregou.');
    const mode = $('#splitMode')?.value || 'custom';
    return window.SplitPlanner.buildSplitPlan(mode, pageCount, currentSplitOptions());
  }

  function updateSplitPlanPreview() {
    const preview = $('#splitPlanPreview');
    const count = $('#splitPlanCount');
    if (!preview || !count) return;
    if (!state.splitPageCount) {
      state.splitPlan = [];
      if (state.tool === 'split') processButton.disabled = true;
      count.textContent = '0 arquivos';
      preview.innerHTML = '<div class="split-plan-empty">Adicione um PDF para visualizar o resultado.</div>';
      return;
    }
    try {
      const groups = calculateSplitPlan(state.splitPageCount);
      state.splitPlan = groups;
      processButton.disabled = false;
      const described = window.SplitPlanner.describePlan(groups);
      count.textContent = `${groups.length} ${groups.length === 1 ? 'arquivo' : 'arquivos'}`;
      preview.innerHTML = described.map(item => `
        <div class="split-plan-item">
          <span>${String(item.index + 1).padStart(2, '0')}</span>
          <div><strong>Páginas ${escapeHtml(item.label)}</strong><small>${item.pageCount} ${item.pageCount === 1 ? 'página' : 'páginas'}</small></div>
        </div>`).join('');
    } catch (error) {
      state.splitPlan = [];
      processButton.disabled = true;
      count.textContent = 'Plano inválido';
      preview.innerHTML = `<div class="split-plan-error">${escapeHtml(error.message || String(error))}</div>`;
    }
  }

  function nextOrganizerPageId() { return `page-${++state.organizerPageIdSeq}`; }
  function nextOrganizerSourceKey(prefix = 'source') { return `${prefix}-${++state.organizerSourceSeq}`; }
  function cloneOrganizerPage(page) { return { ...page, id: nextOrganizerPageId() }; }
  function organizerPreviewKey(page) {
    if (page.kind === 'pdf') return `pdf:${page.sourceKey}:${page.sourceIndex}`;
    if (page.kind === 'image') return `image:${page.sourceKey}`;
    return `blank:${page.width}x${page.height}`;
  }
  function snapshotOrganizerPages() { return state.organizerPages.map(page => ({ ...page })); }
  function pushOrganizerHistory() {
    state.organizerHistory.push(snapshotOrganizerPages());
    if (state.organizerHistory.length > 50) state.organizerHistory.shift();
    state.organizerFuture = [];
    updateOrganizerHistoryButtons();
  }
  function updateOrganizerHistoryButtons() {
    const undo = $('#organizerUndo'), redo = $('#organizerRedo');
    if (undo) undo.disabled = state.organizerHistory.length === 0;
    if (redo) redo.disabled = state.organizerFuture.length === 0;
  }
  function undoOrganizer() {
    if (!state.organizerHistory.length) return;
    state.organizerFuture.push(snapshotOrganizerPages());
    state.organizerPages = state.organizerHistory.pop().map(page => ({ ...page }));
    state.selectedPageIds.clear();
    renderPageGridFromCache();
    updateOrganizerHistoryButtons();
    setStatus('Última alteração desfeita.');
  }
  function redoOrganizer() {
    if (!state.organizerFuture.length) return;
    state.organizerHistory.push(snapshotOrganizerPages());
    state.organizerPages = state.organizerFuture.pop().map(page => ({ ...page }));
    state.selectedPageIds.clear();
    renderPageGridFromCache();
    updateOrganizerHistoryButtons();
    setStatus('Alteração refeita.');
  }

  function updateOrganizerModeUI() {
    const title = $('#organizerEditorTitle');
    const help = $('#organizerHelpText');
    if (!title || !help) return;
    if (state.tool === 'merge') {
      title.textContent = 'Organização única da união';
      help.innerHTML = '<strong>Este é o único fluxo da união:</strong> arraste qualquer miniatura para definir a ordem final, inclusive entre PDFs diferentes. Gire, exclua, duplique ou selecione várias páginas. Novos PDFs soltos na tela entram no final.';
      const addButton = $('#organizerAddPages');
      if (addButton) addButton.textContent = '＋ Adicionar PDF, imagem ou página';
    } else {
      const addButton = $('#organizerAddPages');
      if (addButton) addButton.textContent = '＋ Adicionar páginas';
      title.textContent = 'Editor de páginas';
      help.innerHTML = '<strong>Como usar:</strong> clique na caixa de uma ou várias páginas para aplicar ações em lote. Arraste para reordenar. Em cada miniatura você pode visualizar, mover, girar, duplicar, inserir depois ou excluir individualmente.';
    }
  }

  async function appendPdfFilesToOrganizer(files, prefix = 'import') {
    if (!files.length) return;
    if (!window.PDFLib) throw new Error('O motor de PDF não carregou.');
    const additions = [];
    for (const file of files) {
      const fileKey = getFileCacheKey(file);
      if (prefix === 'merge') {
        const existing = [...state.organizerSources.values()].some(source => source.fileKey === fileKey);
        if (existing) continue;
      }
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      const sourceKey = nextOrganizerSourceKey(prefix);
      const pageSizes = document.getPageIndices().map(index => document.getPage(index).getSize());
      state.organizerSources.set(sourceKey, { kind: 'pdf', file, fileKey, name: file.name, pageCount: document.getPageCount(), pageSizes });
      if (prefix === 'merge' && !state.mergeOriginalFileKeys.includes(fileKey)) state.mergeOriginalFileKeys.push(fileKey);
      document.getPageIndices().forEach(sourceIndex => {
        const size = pageSizes[sourceIndex];
        additions.push({ id: nextOrganizerPageId(), kind: 'pdf', sourceKey, sourceIndex, sourceFileKey: fileKey, sourceFile: file, rotation: 0, origin: file.name, width: size.width, height: size.height });
      });
    }
    if (!additions.length) return;
    if (state.organizerPages.length) pushOrganizerHistory();
    state.organizerPages.push(...additions);
    state.originalOrganizerPages = snapshotOrganizerPages();
    if (prefix === 'merge' && ($('#mergeSourceSort')?.value || 'nameAsc') === 'nameAsc') applyDefaultMergeNameOrder();
    dropzone.classList.add('compact');
    await renderOrganizerPreviews();
    updateMergePreview();
  }

  function mergeSourceKeyForFile(file) {
    const key = getFileCacheKey(file);
    for (const [sourceKey, source] of state.organizerSources.entries()) if (source.fileKey === key) return sourceKey;
    return null;
  }

  function removeMergeFilePages(file) {
    const sourceKey = mergeSourceKeyForFile(file);
    if (!sourceKey) return;
    state.organizerPages = state.organizerPages.filter(page => page.sourceKey !== sourceKey);
    state.originalOrganizerPages = state.originalOrganizerPages.filter(page => page.sourceKey !== sourceKey);
    state.organizerSources.delete(sourceKey);
    state.selectedPageIds.clear();
    renderPageGridFromCache(); updateMergePreview();
  }

  function reorderPagesByFileOrder(pages) {
    const pageGroups = new Map();
    pages.forEach(page => {
      if (!pageGroups.has(page.sourceKey)) pageGroups.set(page.sourceKey, []);
      pageGroups.get(page.sourceKey).push(page);
    });
    const ordered = [];
    state.files.forEach(file => {
      const sourceKey = mergeSourceKeyForFile(file);
      if (sourceKey && pageGroups.has(sourceKey)) { ordered.push(...pageGroups.get(sourceKey)); pageGroups.delete(sourceKey); }
    });
    pageGroups.forEach(group => ordered.push(...group));
    return ordered;
  }

  function reorderMergeSourceBlocks() {
    if (state.tool !== 'merge' || !state.organizerPages.length) return;
    pushOrganizerHistory();
    state.organizerPages = reorderPagesByFileOrder(state.organizerPages);
    state.originalOrganizerPages = reorderPagesByFileOrder(state.originalOrganizerPages);
    renderPageGridFromCache(); updateMergePreview();
  }

  function updateMergeModePanels() {
    organizerSection.classList.toggle('hidden', !['organize', 'merge'].includes(state.tool));
  }

  async function loadOrganizer(file) {
    if (!file) return;
    if (!window.PDFLib) { setStatus('O motor de PDF não carregou. Verifique a conexão com a internet.', 'error'); return; }
    setStatus('Lendo as páginas do documento...', 'processing');
    setProgress(8);
    try {
      resetOrganizer();
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      const sourceKey = 'main';
      state.organizerSources.set(sourceKey, { kind: 'pdf', file, fileKey: getFileCacheKey(file), name: file.name, pageCount: document.getPageCount(), pageSizes: document.getPageIndices().map(index => document.getPage(index).getSize()) });
      state.organizerPages = document.getPageIndices().map(sourceIndex => { const size = document.getPage(sourceIndex).getSize(); return { id: nextOrganizerPageId(), kind: 'pdf', sourceKey, sourceIndex, sourceFileKey: getFileCacheKey(file), sourceFile: file, rotation: 0, origin: file.name, width: size.width, height: size.height }; });
      state.originalOrganizerPages = snapshotOrganizerPages();
      dropzone.classList.add('compact');
      await renderOrganizerPreviews();
      setStatus(`${state.organizerPages.length} página(s) carregada(s). Você pode editar cada página individualmente ou em lote.`, 'success');
    } catch (error) { console.error(error); setStatus(readablePdfError(error), 'error'); }
    finally { setProgress(null); }
  }

  async function ensurePdfWorker() {
    if (state.workerReady) return;
    if (window.CentralPDFEnginesReady) await window.CentralPDFEnginesReady.catch(() => null);
    if (window.CentralPDFPdfWorkerReady) await window.CentralPDFPdfWorkerReady.catch(() => null);
    if (!window.pdfjsLib) return;
    const options = window.pdfjsLib.GlobalWorkerOptions;
    if (options && !options.workerPort && !options.workerSrc) options.workerSrc = window.CentralPDFResolvePdfWorker?.() || '';
    state.workerReady = Boolean(options?.workerPort || options?.workerSrc);
  }

  async function renderOrganizerPreviews() {
    if (state.organizerPreviewObserver) state.organizerPreviewObserver.disconnect();
    state.organizerPreviewObserver = null;
    state.organizerPreviewQueue = [];
    state.organizerPreviewActive = 0;
    pageGrid.innerHTML = '';
    updateOrganizerPageCount();
    const total = state.organizerPages.length;
    const lazyMode = total >= 180 && 'IntersectionObserver' in window;

    if (lazyMode) {
      for (let index = 0; index < total; index++) {
        const page = state.organizerPages[index];
        createPageCard(index, state.previewCache.get(organizerPreviewKey(page)), true);
      }
      setupOrganizerLazyPreviews();
      setProgress(null);
      setStatus(`${total} páginas carregadas. As miniaturas serão renderizadas conforme você rolar a tela, economizando memória.`, 'success');
      updateOrganizerBulkToolbar();
      return;
    }

    const pdfDocs = new Map();
    if (window.pdfjsLib) {
      try {
        await ensurePdfWorker();
        const keys = [...new Set(state.organizerPages.filter(page => page.kind === 'pdf').map(page => page.sourceKey))];
        for (const key of keys) {
          const source = state.organizerSources.get(key);
          if (!source?.file) continue;
          try { pdfDocs.set(key, await window.pdfjsLib.getDocument({ data: new Uint8Array(await source.file.arrayBuffer()) }).promise); }
          catch (error) { console.warn('Falha ao abrir fonte de miniaturas', source.name, error); }
        }
      } catch (error) { console.warn('Miniaturas PDF indisponíveis.', error); }
    }
    for (let index = 0; index < total; index++) {
      const page = state.organizerPages[index];
      const key = organizerPreviewKey(page);
      let preview = state.previewCache.get(key);
      if (!preview) {
        try {
          if (page.kind === 'pdf' && pdfDocs.get(page.sourceKey)) preview = await renderPdfPagePreview(pdfDocs.get(page.sourceKey), page.sourceIndex);
          else if (page.kind === 'image') preview = await renderImagePagePreview(state.organizerSources.get(page.sourceKey)?.file);
          else if (page.kind === 'blank') preview = createBlankPagePreview(page);
          if (preview) state.previewCache.set(key, preview);
        } catch (error) { console.warn('Falha ao renderizar página do organizador', error); }
      }
      createPageCard(index, preview);
      setProgress(10 + Math.round(((index + 1) / Math.max(1, total)) * 85));
      if ((index + 1) % 30 === 0) await yieldToBrowser();
    }
    for (const pdf of pdfDocs.values()) { try { await pdf.destroy(); } catch (_) {} }
    updateOrganizerBulkToolbar();
  }

  function setupOrganizerLazyPreviews() {
    if (state.organizerPreviewObserver) state.organizerPreviewObserver.disconnect();
    state.organizerPreviewObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        state.organizerPreviewObserver.unobserve(entry.target);
        state.organizerPreviewQueue.push(entry.target);
      });
      processOrganizerPreviewQueue();
    }, { root: null, rootMargin: '700px 0px', threshold: 0.01 });
    pageGrid.querySelectorAll('.page-card[data-preview-pending="true"]').forEach(card => state.organizerPreviewObserver.observe(card));
  }

  async function ensureOrganizerPreviewPdf(sourceKey) {
    if (state.organizerPreviewPdfDocs.has(sourceKey)) return state.organizerPreviewPdfDocs.get(sourceKey);
    const source = state.organizerSources.get(sourceKey);
    if (!source?.file || !window.pdfjsLib) return null;
    await ensurePdfWorker();
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await source.file.arrayBuffer()) }).promise;
    state.organizerPreviewPdfDocs.set(sourceKey, pdf);
    return pdf;
  }

  function processOrganizerPreviewQueue() {
    while (state.organizerPreviewActive < 2 && state.organizerPreviewQueue.length) {
      const card = state.organizerPreviewQueue.shift();
      if (!card?.isConnected) continue;
      state.organizerPreviewActive += 1;
      loadOrganizerCardPreview(card)
        .catch(error => console.warn('Miniatura sob demanda indisponível.', error))
        .finally(() => { state.organizerPreviewActive -= 1; processOrganizerPreviewQueue(); });
    }
  }

  async function loadOrganizerCardPreview(card) {
    const pageId = card.dataset.pageId;
    const page = state.organizerPages.find(item => item.id === pageId);
    if (!page) return;
    const key = organizerPreviewKey(page);
    let preview = state.previewCache.get(key);
    if (!preview) {
      if (page.kind === 'pdf') {
        const pdf = await ensureOrganizerPreviewPdf(page.sourceKey);
        if (pdf) preview = await renderPdfPagePreview(pdf, page.sourceIndex);
      } else if (page.kind === 'image') preview = await renderImagePagePreview(state.organizerSources.get(page.sourceKey)?.file);
      else preview = createBlankPagePreview(page);
      if (preview) state.previewCache.set(key, preview);
    }
    if (!preview || !card.isConnected) return;
    const button = card.querySelector('.page-preview');
    if (!button) return;
    button.innerHTML = `<img src="${preview}" alt="Miniatura da página ${Number(card.dataset.index) + 1}" draggable="false" />`;
    const image = button.querySelector('img');
    if (image) image.style.transform = `rotate(${page.rotation}deg)`;
    card.dataset.previewPending = 'false';
    card.classList.remove('preview-pending');
  }

  async function renderPdfPagePreview(pdf, sourceIndex) {
    const page = await pdf.getPage(sourceIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(170 / base.width, 220 / base.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas.toDataURL('image/jpeg', .86);
  }
  async function renderImagePagePreview(file) {
    if (!file) return null;
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(170 / bitmap.width, 220 / bitmap.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', .88);
    } finally { bitmap.close(); }
  }
  function createBlankPagePreview(page) {
    const canvas = document.createElement('canvas'); canvas.width = 170; canvas.height = Math.max(120, Math.round(170 * page.height / page.width));
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.strokeStyle='#d9dee7'; context.strokeRect(.5,.5,canvas.width-1,canvas.height-1);
    return canvas.toDataURL('image/png');
  }

  function createPageCard(index, preview, allowLazy = false) {
    const pageInfo = state.organizerPages[index];
    const selected = state.selectedPageIds.has(pageInfo.id);
    const card = document.createElement('article');
    const previewPending = Boolean(allowLazy && !preview);
    card.className = `page-card${selected ? ' selected' : ''}${previewPending ? ' preview-pending' : ''}`; card.draggable = true; card.dataset.index = String(index); card.dataset.pageId = pageInfo.id; card.dataset.previewPending = previewPending ? 'true' : 'false';
    const originalLabel = pageInfo.kind === 'pdf' ? `${pageInfo.origin || 'PDF'} · pág. ${pageInfo.sourceIndex + 1}` : pageInfo.kind === 'image' ? `${pageInfo.origin || 'Imagem'}` : 'Página em branco';
    card.innerHTML = `
      <label class="page-select" title="Selecionar página"><input type="checkbox" ${selected ? 'checked' : ''}/><span></span></label>
      <button class="page-position" type="button" title="Visualizar página">${index + 1}</button>
      <button class="page-preview" type="button" title="Abrir prévia ampliada">${preview ? `<img src="${preview}" alt="Miniatura da página ${index + 1}" draggable="false" />` : `<div class="page-placeholder">${previewPending ? 'Carregando ao visualizar' : 'Página'}<br><strong>${index + 1}</strong></div>`}</button>
      <div class="page-caption"><div><strong>Página ${index + 1}</strong><small title="${escapeHtml(originalLabel)}">${escapeHtml(originalLabel)}</small></div></div>
      <div class="page-actions page-actions-grid">
        <button class="page-action move-left" type="button" title="Mover uma posição para a esquerda" ${index === 0 ? 'disabled' : ''}>←</button>
        <button class="page-action move-right" type="button" title="Mover uma posição para a direita" ${index === state.organizerPages.length - 1 ? 'disabled' : ''}>→</button>
        <button class="page-action left" type="button" title="Girar para a esquerda">↶</button>
        <button class="page-action right" type="button" title="Girar para a direita">↷</button>
        <button class="page-action duplicate" type="button" title="Duplicar página">⧉</button>
        <button class="page-action insert" type="button" title="Inserir página depois">＋</button>
        <button class="page-action delete" type="button" title="Excluir página">×</button>
      </div>`;
    const image = card.querySelector('.page-preview img'); if (image) image.style.transform = `rotate(${pageInfo.rotation}deg)`;
    card.querySelector('.page-select input').addEventListener('change', event => { state.selectedPageIds[event.target.checked ? 'add' : 'delete'](pageInfo.id); card.classList.toggle('selected', event.target.checked); updateOrganizerBulkToolbar(); });
    card.querySelector('.page-preview').addEventListener('click', async event => { event.stopPropagation(); if (!state.previewCache.get(organizerPreviewKey(pageInfo))) await loadOrganizerCardPreview(card); openOrganizerPagePreview(pageInfo, index, state.previewCache.get(organizerPreviewKey(pageInfo))); });
    card.querySelector('.page-position').addEventListener('click', async () => { if (!state.previewCache.get(organizerPreviewKey(pageInfo))) await loadOrganizerCardPreview(card); openOrganizerPagePreview(pageInfo, index, state.previewCache.get(organizerPreviewKey(pageInfo))); });
    card.querySelector('.move-left').addEventListener('click', event => { event.stopPropagation(); movePage(index,index-1); });
    card.querySelector('.move-right').addEventListener('click', event => { event.stopPropagation(); movePage(index,index+1); });
    card.querySelector('.left').addEventListener('click', event => { event.stopPropagation(); rotatePage(index,270); });
    card.querySelector('.right').addEventListener('click', event => { event.stopPropagation(); rotatePage(index,90); });
    card.querySelector('.duplicate').addEventListener('click', event => { event.stopPropagation(); duplicatePage(index); });
    card.querySelector('.insert').addEventListener('click', event => { event.stopPropagation(); state.organizerInsertIndex=index+1; openOrganizerAddDialog('pdf', index+1); });
    card.querySelector('.delete').addEventListener('click', event => { event.stopPropagation(); deletePage(index); });
    card.addEventListener('dragstart', event => {
      state.dragPageIndex=index;
      card.classList.add('dragging');
      beginInternalDrag('page', event, index);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.page-card').forEach(item=>item.classList.remove('drop-target','external-drop-target'));
      state.dragPageIndex=null;
      endInternalDrag();
    });
    card.addEventListener('dragover', event => {
      event.preventDefault();
      if (transferHasFiles(event)) { card.classList.add('external-drop-target'); event.dataTransfer.dropEffect='copy'; }
      else card.classList.add('drop-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target','external-drop-target'));
    card.addEventListener('drop', event => {
      event.preventDefault(); event.stopPropagation(); card.classList.remove('drop-target','external-drop-target');
      if (transferHasFiles(event)) { hideExternalDropState(); addFiles([...event.dataTransfer.files], { source:'drop' }); return; }
      const from=state.dragPageIndex ?? Number(event.dataTransfer.getData(INTERNAL_PAGE_DRAG_TYPE) || event.dataTransfer.getData('text/plain'));
      movePage(from,index);
      endInternalDrag();
    });
    pageGrid.appendChild(card);
  }

  function openOrganizerPagePreview(page,index,preview) {
    if (!preview) return;
    $('#organizerPreviewTitle').textContent = `Página ${index + 1}`;
    const image=$('#organizerPreviewImage'); image.src=preview; image.style.transform=`rotate(${page.rotation}deg)`;
    const source = page.kind === 'pdf' ? `${page.origin || 'PDF'} — página original ${page.sourceIndex + 1}` : page.kind === 'image' ? page.origin || 'Imagem importada' : 'Página em branco';
    $('#organizerPreviewDetails').innerHTML=`<span>${page.kind.toUpperCase()}</span><strong>${escapeHtml(source)}</strong><small>Rotação aplicada: ${page.rotation}°</small>`;
    organizerPagePreviewDialog.showModal();
  }

  function renderPageGridFromCache() {
    if (state.organizerPreviewObserver) state.organizerPreviewObserver.disconnect();
    pageGrid.innerHTML='';
    const lazyMode = state.organizerPages.length >= 180 && 'IntersectionObserver' in window;
    state.organizerPages.forEach((page,index)=>createPageCard(index,state.previewCache.get(organizerPreviewKey(page)),lazyMode));
    if (lazyMode) setupOrganizerLazyPreviews();
    updateOrganizerPageCount(); updateOrganizerBulkToolbar(); updateOrganizerHistoryButtons();
  }
  function updateOrganizerPageCount() { const total=state.organizerPages.length; $('#pageCountLabel').textContent=`${total} ${total===1?'página':'páginas'}`; }
  function selectedOrganizerIndexes() { return state.organizerPages.map((page,index)=>state.selectedPageIds.has(page.id)?index:-1).filter(index=>index>=0); }
  function updateOrganizerBulkToolbar() {
    const count=state.selectedPageIds.size; const total=state.organizerPages.length;
    const label=$('#selectedPagesCount'); if(label) label.textContent=`${count} ${count===1?'selecionada':'selecionadas'}`;
    const select=$('#selectAllPages'); if(select) select.textContent=count===total && total?'Limpar seleção':'Selecionar todas';
    ['rotateSelectedLeft','rotateSelectedRight','duplicateSelectedPages','moveSelectedStart','moveSelectedEnd','deleteSelectedPages'].forEach(id=>{ const button=$(`#${id}`); if(button) button.disabled=count===0; });
  }
  function toggleSelectAllPages() { const all=state.organizerPages.length && state.selectedPageIds.size===state.organizerPages.length; state.selectedPageIds.clear(); if(!all) state.organizerPages.forEach(page=>state.selectedPageIds.add(page.id)); renderPageGridFromCache(); }

  function movePage(from,to) { if(!Number.isInteger(from)||from===to||from<0||to<0||from>=state.organizerPages.length||to>=state.organizerPages.length)return; pushOrganizerHistory(); const [page]=state.organizerPages.splice(from,1); state.organizerPages.splice(to,0,page); renderPageGridFromCache(); }
  function rotatePage(index,angle) { const page=state.organizerPages[index]; if(!page)return; pushOrganizerHistory(); page.rotation=(page.rotation+angle)%360; renderPageGridFromCache(); }
  function duplicatePage(index) { const page=state.organizerPages[index]; if(!page)return; pushOrganizerHistory(); state.organizerPages.splice(index+1,0,cloneOrganizerPage(page)); renderPageGridFromCache(); setStatus('Página duplicada.'); }
  function deletePage(index) { if(state.organizerPages.length<=1){setStatus('O PDF precisa manter pelo menos uma página.','error');return;} pushOrganizerHistory(); const [removed]=state.organizerPages.splice(index,1); state.selectedPageIds.delete(removed.id); renderPageGridFromCache(); setStatus('Página removida da versão final. O original continua intacto.'); }
  function rotateSelectedPages(angle) { const indexes=selectedOrganizerIndexes(); if(!indexes.length)return; pushOrganizerHistory(); indexes.forEach(index=>state.organizerPages[index].rotation=(state.organizerPages[index].rotation+angle)%360); renderPageGridFromCache(); setStatus(`${indexes.length} página(s) girada(s).`); }
  function duplicateSelectedPages() { const indexes=selectedOrganizerIndexes(); if(!indexes.length)return; pushOrganizerHistory(); state.organizerPages=OrganizerPlanner.duplicateIndexes(state.organizerPages,indexes,page=>cloneOrganizerPage(page)); state.selectedPageIds.clear(); renderPageGridFromCache(); setStatus(`${indexes.length} página(s) duplicada(s).`); }
  function deleteSelectedPages() { const indexes=selectedOrganizerIndexes(); if(!indexes.length)return; if(state.organizerPages.length-indexes.length<1){setStatus('O PDF precisa manter pelo menos uma página.','error');return;} pushOrganizerHistory(); state.organizerPages=OrganizerPlanner.deleteIndexes(state.organizerPages,indexes); state.selectedPageIds.clear(); renderPageGridFromCache(); setStatus(`${indexes.length} página(s) removida(s).`); }
  function moveSelectedPagesToEdge(edge) { const indexes=selectedOrganizerIndexes(); if(!indexes.length)return; pushOrganizerHistory(); state.organizerPages=OrganizerPlanner.moveIndexesToEdge(state.organizerPages,indexes,edge); renderPageGridFromCache(); setStatus(`Páginas selecionadas movidas para o ${edge==='start'?'início':'fim'}.`); }

  function openOrganizerAddDialog(type='pdf', fixedIndex=null) {
    state.organizerInsertIndex=Number.isInteger(fixedIndex)?fixedIndex:null;
    $('#organizerAddType').value=type; $('#organizerImportPdfInput').value=''; $('#organizerImportImageInput').value=''; $('#organizerImportPdfPages').value='all'; $('#organizerBlankCount').value='1';
    $('#organizerImportPdfInfo').innerHTML='<strong>Nenhum PDF escolhido</strong><p>Escolha um arquivo para selecionar as páginas.</p>';
    $('#organizerAddStatus').textContent=Number.isInteger(fixedIndex)?`As novas páginas serão inseridas na posição ${fixedIndex+1}.`:'Escolha a origem e a posição.';
    $('#organizerInsertMode').disabled=Number.isInteger(fixedIndex); updateOrganizerAddPanels(); organizerAddDialog.showModal();
  }
  function closeOrganizerAddDialog(){ organizerAddDialog.close(); state.organizerInsertIndex=null; }
  function updateOrganizerAddPanels(){ const type=$('#organizerAddType').value; document.querySelectorAll('[data-organizer-add-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.organizerAddPanel!==type)); }
  async function readOrganizerImportPdfInfo(){ const file=$('#organizerImportPdfInput').files?.[0]; const info=$('#organizerImportPdfInfo'); if(!file){info.innerHTML='<strong>Nenhum PDF escolhido</strong><p>Escolha um arquivo para selecionar as páginas.</p>';return;} try{const doc=await PDFLib.PDFDocument.load(await file.arrayBuffer()); info.innerHTML=`<strong>${escapeHtml(file.name)}</strong><p>${doc.getPageCount()} página(s). Use “all” ou informe intervalos.</p>`;}catch(error){info.innerHTML=`<strong>Não foi possível abrir</strong><p>${escapeHtml(readablePdfError(error))}</p>`;} }
  function organizerInsertIndex() { if(Number.isInteger(state.organizerInsertIndex))return state.organizerInsertIndex; return OrganizerPlanner.calculateInsertIndex($('#organizerInsertMode').value,selectedOrganizerIndexes(),state.organizerPages.length); }
  async function confirmOrganizerAdd() {
    const type=$('#organizerAddType').value; const status=$('#organizerAddStatus'); const additions=[];
    try {
      status.className='status-box processing'; status.textContent='Preparando páginas...';
      if(type==='pdf'){
        const file=$('#organizerImportPdfInput').files?.[0]; if(!file)throw new Error('Escolha um PDF para importar.');
        const doc=await PDFLib.PDFDocument.load(await file.arrayBuffer()); const count=doc.getPageCount(); const text=($('#organizerImportPdfPages').value||'all').trim().toLowerCase(); const indexes=text==='all'?doc.getPageIndices():parsePages(text,count,true);
        const fileKey=getFileCacheKey(file); const key=nextOrganizerSourceKey('pdf'); state.organizerSources.set(key,{kind:'pdf',file,fileKey,name:file.name,pageCount:count});
        if(state.tool==='merge' && !state.files.some(item=>getFileCacheKey(item)===fileKey)) state.files.push(file);
        indexes.forEach(sourceIndex=>{ const size=doc.getPage(sourceIndex).getSize(); additions.push({id:nextOrganizerPageId(),kind:'pdf',sourceKey:key,sourceIndex,sourceFileKey:fileKey,sourceFile:file,rotation:0,origin:file.name,width:size.width,height:size.height}); });
      } else if(type==='images'){
        const files=[...($('#organizerImportImageInput').files||[])]; if(!files.length)throw new Error('Escolha pelo menos uma imagem.');
        for(const file of files){const bitmap=await createImageBitmap(file); const scale=Math.min(1600/bitmap.width,1600/bitmap.height,1); const width=bitmap.width*scale,height=bitmap.height*scale; bitmap.close(); const key=nextOrganizerSourceKey('image'); state.organizerSources.set(key,{kind:'image',file,name:file.name}); additions.push({id:nextOrganizerPageId(),kind:'image',sourceKey:key,rotation:0,origin:file.name,width,height});}
      } else {
        const count=Math.max(1,Math.min(100,Number($('#organizerBlankCount').value||1))); const size=$('#organizerBlankSize').value; const landscape=$('#organizerBlankOrientation').value==='landscape'; let width=595.28,height=841.89;
        if(size==='letter'){width=612;height=792;} else if(size==='same'){const selected=selectedOrganizerIndexes()[0]; const ref=state.organizerPages[selected>=0?selected:0]; if(ref?.width&&ref?.height){width=ref.width;height=ref.height;} }
        if(landscape&&height>width)[width,height]=[height,width]; if(!landscape&&width>height)[width,height]=[height,width];
        for(let i=0;i<count;i++) additions.push({id:nextOrganizerPageId(),kind:'blank',rotation:0,origin:'Página em branco',width,height});
      }
      if(!additions.length)throw new Error('Nenhuma página foi preparada.'); pushOrganizerHistory(); const at=organizerInsertIndex(); state.organizerPages=OrganizerPlanner.insertItems(state.organizerPages,additions,at); state.selectedPageIds.clear(); closeOrganizerAddDialog(); await renderOrganizerPreviews();
      if(state.tool==='merge'){ renderFiles(); updateMergePreview(); syncOutputName(); processButton.disabled=mergePdfSources().length<2||!state.organizerPages.length; }
      setStatus(`${additions.length} página(s) adicionada(s) na posição ${at+1}.`,'success');
    } catch(error){status.className='status-box error';status.textContent=error.message||String(error);}
  }

  function restoreOrganizer() { if(!state.originalOrganizerPages.length)return; pushOrganizerHistory(); state.organizerPages=state.originalOrganizerPages.map(page=>({...page})); state.selectedPageIds.clear(); renderPageGridFromCache(); setStatus('Documento restaurado ao estado original.'); }

  function getToolHandlers() {
    return { organize, editPdf, merge, split, extract, rotate, watermark, pageNumbers, imagesToPdf, imageConvert, compress, pdfToImage, crop, metadata, normalize, pdfToText, ocr, compare, redact, formBuilder, signPdf, pdfToOffice, documentsToPdf, extractImages, archivePdf, documentAssistant, structuredExtraction, documentAudit, classifyRename, protect, unlock, diagnose, repairAdvanced, flattenForms };
  }

  async function processCurrentTool() {
    setCompletionState(false);
    if (window.CentralPDFEnginesReady) await window.CentralPDFEnginesReady.catch(() => null);
    const professionalTools = new Set(['protect', 'unlock', 'diagnose', 'repairAdvanced', 'flattenForms']);
    if (!professionalTools.has(state.tool) && !window.PDFLib) { const error = new Error('O motor de PDF não carregou. Abra o diagnóstico do sistema e prepare o modo offline.'); setStatus(error.message, 'error'); return { ok: false, error }; }
    if (!state.files.length) { const error = new Error('Selecione pelo menos um arquivo.'); setStatus(error.message, 'error'); return { ok: false, error }; }
    const qualityRun = window.CentralPDFToolQuality?.beginRun?.({ tool: state.tool, files: Array.from(state.files), settings: collectSettingsValues() });
    if (qualityRun && qualityRun.ok === false) {
      const error = new Error(qualityRun.preflight?.issues?.find(item => item.level === 'error')?.message || 'A pré-verificação impediu o processamento.');
      setStatus(error.message, 'error');
      return { ok: false, error };
    }
    processButton.disabled = true;
    setStatus('Processando. Não feche esta janela...', 'processing');
    setProgress(8);
    try {
      const handlers = getToolHandlers();
      const handler = handlers[state.tool];
      if (typeof handler !== 'function') throw new Error('O processador desta ferramenta não está disponível.');
      const result = await handler();
      setProgress(100);
      updateSteps(3);
      setStatus(result?.message || 'Concluído. O download foi iniciado. Você pode processar novamente ou escolher outra ferramenta.', 'success');
      setCompletionState(true, result?.message);
      window.CentralPDFToolQuality?.finishRun?.(result || {});
      return { ok: true, result };
    } catch (error) {
      console.error(error);
      window.CentralPDFToolQuality?.failRun?.(error);
      setStatus(readablePdfError(error), 'error');
      return { ok: false, error };
    } finally {
      if (state.taskCompleted) processButton.disabled = true;
      else if (state.tool === 'merge') updateMergePreview();
      else processButton.disabled = false;
      setTimeout(() => setProgress(null), 700);
    }
  }

  async function editPdf() {
    if (!window.PDFVisualEditor?.hasDocument()) throw new Error('Carregue o PDF e aguarde o editor abrir.');
    const result = await window.PDFVisualEditor.exportPdf();
    downloadBytes(result.bytes, `${outputBaseName('PDF_editado')}.pdf`, 'application/pdf');
    return { message: result.message || 'PDF editado e baixado.' };
  }

  async function organize() {
    if (!state.organizerPages.length) throw new Error('Carregue o PDF e aguarde as páginas aparecerem.');
    const { PDFDocument, degrees } = PDFLib;
    const output = await PDFDocument.create();
    const documents = new Map();
    for (const [key, source] of state.organizerSources.entries()) {
      if (source.kind === 'pdf') documents.set(key, await PDFDocument.load(await source.file.arrayBuffer()));
    }
    const main = documents.get('main');
    if ($('#organizerPreserveMetadata')?.checked && main) copyDocumentMetadata(main, output);
    const embeddedImages = new Map();
    for (let index = 0; index < state.organizerPages.length; index++) {
      const item = state.organizerPages[index];
      if (item.kind === 'pdf') {
        const source = documents.get(item.sourceKey); if (!source) throw new Error('Uma das fontes PDF adicionadas não está mais disponível.');
        const [page] = await output.copyPages(source, [item.sourceIndex]);
        if (item.rotation) page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360));
        output.addPage(page);
      } else if (item.kind === 'image') {
        const source = state.organizerSources.get(item.sourceKey); if (!source?.file) throw new Error('Uma imagem adicionada não está mais disponível.');
        let embedded = embeddedImages.get(item.sourceKey);
        if (!embedded) { const normalized = await normalizeImage(source.file,'image/jpeg',.94); embedded = normalized.mime==='image/png' ? await output.embedPng(normalized.bytes) : await output.embedJpg(normalized.bytes); embeddedImages.set(item.sourceKey,embedded); }
        const sourceWidth=item.width||embedded.width, sourceHeight=item.height||embedded.height;
        let pageWidth=sourceWidth,pageHeight=sourceHeight,x=0,y=0;
        if(item.rotation===90){pageWidth=sourceHeight;pageHeight=sourceWidth;x=sourceHeight;y=0;}
        else if(item.rotation===180){x=sourceWidth;y=sourceHeight;}
        else if(item.rotation===270){pageWidth=sourceHeight;pageHeight=sourceWidth;x=0;y=sourceWidth;}
        const page=output.addPage([pageWidth,pageHeight]); page.drawImage(embedded,{x,y,width:sourceWidth,height:sourceHeight,rotate:degrees(item.rotation||0)});
      } else {
        const page=output.addPage([item.width||595.28,item.height||841.89]); if(item.rotation)page.setRotation(degrees(item.rotation));
      }
      setProgress(10+Math.round(((index+1)/state.organizerPages.length)*80));
    }
    downloadBytes(await output.save(), `${outputBaseName(`${baseName(state.files[0].name)}_organizado`)}.pdf`, 'application/pdf');
  }

  async function mergeVisualPages() {
    if (!state.organizerPages.length) throw new Error('Aguarde as miniaturas das páginas carregarem.');
    const integrity = repairOrganizerSourceLinks();
    if (integrity.missing.length) {
      const first = integrity.missing[0];
      throw new Error(`A página ${first.index + 1} perdeu o vínculo com seu PDF de origem. Adicione novamente o documento “${first.page.origin || 'desconhecido'}”.`);
    }
    const { PDFDocument, degrees } = PDFLib;
    state.mergeExportRunning = true;
    updateMergePreview();
    setStatus(`Preparando a união de ${state.organizerPages.length} páginas...`, 'processing');
    const output = await PDFDocument.create();
    const documentPool = createPdfDocumentPool(PDFDocument, state.organizerPages.length >= 250 ? 2 : 4);
    const embeddedImages = new Map();
    let firstPdfDocument = null;
    try {
      for (let index = 0; index < state.organizerPages.length; index++) {
        const item = state.organizerPages[index];
        if (item.kind === 'pdf') {
          const sourceDocument = await documentPool.get(item);
          if (!sourceDocument) throw new Error(`Não foi possível reabrir o PDF de origem da página ${index + 1}.`);
          if (!firstPdfDocument) firstPdfDocument = sourceDocument;
          if (item.sourceIndex < 0 || item.sourceIndex >= sourceDocument.getPageCount()) {
            throw new Error(`A página original ${item.sourceIndex + 1} não existe mais em “${item.origin || 'PDF'}”.`);
          }
          const [page] = await output.copyPages(sourceDocument, [item.sourceIndex]);
          if (item.rotation) page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360));
          output.addPage(page);
        } else if (item.kind === 'image') {
          const source = state.organizerSources.get(item.sourceKey);
          if (!source?.file) throw new Error(`A imagem usada na página ${index + 1} não está mais disponível.`);
          let embedded = embeddedImages.get(item.sourceKey);
          if (!embedded) {
            const normalized = await normalizeImage(source.file, 'image/jpeg', .94);
            embedded = normalized.mime === 'image/png' ? await output.embedPng(normalized.bytes) : await output.embedJpg(normalized.bytes);
            embeddedImages.set(item.sourceKey, embedded);
          }
          const width = item.width || embedded.width;
          const height = item.height || embedded.height;
          const page = output.addPage([width, height]);
          page.drawImage(embedded, { x: 0, y: 0, width, height, rotate: degrees(item.rotation || 0) });
        } else {
          const page = output.addPage([item.width || 595.28, item.height || 841.89]);
          if (item.rotation) page.setRotation(degrees(item.rotation));
        }
        if ((index + 1) % 8 === 0) {
          setStatus(`Unindo páginas ${index + 1} de ${state.organizerPages.length}...`, 'processing');
          await yieldToBrowser();
        }
        setProgress(8 + Math.round(((index + 1) / state.organizerPages.length) * 82));
      }
      if ($('#mergePreserveMetadata')?.checked && firstPdfDocument) copyDocumentMetadata(firstPdfDocument, output);
      setStatus('Finalizando e preparando o download...', 'processing');
      await yieldToBrowser();
      const bytes = await output.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 25 });
      downloadBytes(bytes, `${outputBaseName('PDF_unido')}.pdf`, 'application/pdf');
      const repairedMessage = integrity.repaired ? ` ${integrity.repaired} vínculo(s) de origem foram recuperados automaticamente.` : '';
      return { message: `${mergePdfSources().length} PDFs unidos em ${output.getPageCount()} página(s).${repairedMessage}` };
    } finally {
      documentPool.clear();
      state.mergeExportRunning = false;
      updateMergePreview();
    }
  }

  async function merge() {
    if (mergePdfSources().length < 2) throw new Error('Selecione pelo menos dois PDFs.');
    return mergeVisualPages();
  }

  async function split() {
    if (!window.JSZip) throw new Error('O componente ZIP não carregou.');
    if (!window.SplitPlanner) throw new Error('O planejador de divisão não carregou.');
    const allOutputs = [];
    const reports = [];
    for (let fileIndex = 0; fileIndex < state.files.length; fileIndex++) {
      const file = state.files[fileIndex];
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const pageCount = source.getPageCount();
      const groups = calculateSplitPlan(pageCount);
      const described = window.SplitPlanner.describePlan(groups);
      const base = state.files.length === 1 ? outputBaseName(`${baseName(file.name)}_dividido`) : `${baseName(file.name)}_dividido`;
      const digits = Math.max(2, String(groups.length).length);
      for (let index = 0; index < groups.length; index++) {
        const output = await PDFLib.PDFDocument.create();
        const pages = await output.copyPages(source, groups[index]); pages.forEach(page => output.addPage(page)); copyDocumentMetadata(source, output);
        const label = window.SplitPlanner.formatPages(groups[index]).replace(/,/g,'_').replace(/[^0-9_-]/g,'');
        allOutputs.push({ filename:`${base}_parte_${String(index+1).padStart(digits,'0')}_paginas_${label}.pdf`, bytes:await output.save({useObjectStreams:true}) });
      }
      reports.push(`Arquivo: ${file.name}\nTotal: ${pageCount} página(s)\n${described.map(item => `${item.index+1}. páginas ${item.label}`).join('\n')}`);
      setProgress(10 + Math.round(((fileIndex + 1) / state.files.length) * 72));
    }
    if (allOutputs.length === 1) { downloadBytes(allOutputs[0].bytes, allOutputs[0].filename, 'application/pdf'); return {message:'Divisão concluída: 1 PDF gerado.'}; }
    const zip = new JSZip(); allOutputs.forEach(item => zip.file(item.filename,item.bytes));
    if ($('#splitIncludeManifest')?.checked) zip.file('RELATORIO_DA_DIVISAO.txt', `CENTRAL PDF & IMAGEM — RELATÓRIO DE DIVISÃO\n\n${reports.join('\n\n')}`);
    downloadBlob(await zip.generateAsync({type:'blob'}, metadata => setProgress(82 + Math.round(metadata.percent*.16))), `${outputBaseName('PDFs_divididos')}.zip`);
    return {message:`Divisão concluída: ${allOutputs.length} PDFs gerados a partir de ${state.files.length} arquivo(s).`};
  }

  function copyDocumentMetadata(source, output) {
    try {
      const title = source.getTitle(); if (title) output.setTitle(title);
      const author = source.getAuthor(); if (author) output.setAuthor(author);
      const subject = source.getSubject(); if (subject) output.setSubject(subject);
      const keywords = source.getKeywords(); if (keywords) output.setKeywords(Array.isArray(keywords) ? keywords : String(keywords).split(/[,;]+/).map(item => item.trim()).filter(Boolean));
      const creator = source.getCreator(); if (creator) output.setCreator(creator);
      const producer = source.getProducer(); if (producer) output.setProducer(producer);
    } catch (_) {}
  }

  async function extract() {
    const allOutputs = []; const reports = [];
    for (let fileIndex=0; fileIndex<state.files.length; fileIndex++) {
      const file=state.files[fileIndex];
      const source=await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const mode=$('#extractMode')?.value||'single';
      const groups=AdvancedPlanner.buildExtractPlan(mode,source.getPageCount(),{pages:mode==='remove'?$('#extractRemovePages')?.value:$('#extractPages')?.value,groups:$('#extractGroups')?.value,allowDuplicates:Boolean($('#extractAllowDuplicates')?.checked)});
      for(let index=0;index<groups.length;index++){
        const output=await PDFLib.PDFDocument.create(); copyDocumentMetadata(source,output);
        const pages=await output.copyPages(source,groups[index]); pages.forEach(page=>output.addPage(page));
        allOutputs.push({name:`${baseName(file.name)}_extracao_${String(index+1).padStart(2,'0')}.pdf`,bytes:await output.save({useObjectStreams:true})});
      }
      reports.push(`${file.name}: ${groups.map(pages=>AdvancedPlanner.formatPages(pages)).join(' | ')}`);
      setProgress(10+Math.round(((fileIndex+1)/state.files.length)*75));
    }
    if(allOutputs.length===1) downloadBytes(allOutputs[0].bytes, allOutputs[0].name, 'application/pdf');
    else { if(!window.JSZip)throw new Error('O componente ZIP não carregou.'); const zip=new JSZip(); allOutputs.forEach(item=>zip.file(item.name,item.bytes)); if($('#extractManifest')?.checked)zip.file('RELATORIO_DA_EXTRACAO.txt',reports.join('\n')); downloadBlob(await zip.generateAsync({type:'blob'}),`${outputBaseName('paginas_extraidas')}.zip`); }
    return {message:`${allOutputs.length} arquivo(s) gerado(s) a partir de ${state.files.length} PDF(s).`};
  }

  async function rotate() {
    const angle = Number($('#rotationAngle')?.value || 90);
    const mode = $('#rotateMode')?.value || 'all';
    const behavior = $('#rotateBehavior')?.value || 'relative';
    const selection = $('#rotatePages')?.value || '';
    return processPdfBatch(async file => {
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      let indexes;
      if (mode === 'portrait' || mode === 'landscape') {
        indexes = document.getPageIndices().filter(index => {
          const { width, height } = document.getPage(index).getSize();
          return mode === 'portrait' ? height >= width : width > height;
        });
      } else indexes = AdvancedPlanner.resolveScope(mode, document.getPageCount(), selection);
      indexes.forEach(index => {
        const page = document.getPage(index);
        const next = behavior === 'absolute' || angle === 0 ? angle : (page.getRotation().angle + angle) % 360;
        page.setRotation(PDFLib.degrees(next));
      });
      return await document.save({ useObjectStreams: true });
    }, 'girado', 'PDFs_girados.zip', 'Rotação aplicada.');
  }

  async function watermark() {
    const type = $('#watermarkType')?.value || 'text';
    const text = String($('#watermarkText')?.value || '').trim();
    if (type === 'text' && !text) throw new Error('Informe o texto da marca-d’água.');
    const imageFile = $('#watermarkImageFile')?.files?.[0];
    if (type === 'image' && !imageFile) throw new Error('Selecione uma imagem PNG ou JPG para a marca-d’água.');
    const sizePercent = clamp(Number($('#watermarkSize')?.value || 45), 5, 100) / 100;
    const opacity = clamp(Number($('#watermarkOpacity')?.value || 20) / 100, .03, 1);
    const rotation = clamp(Number($('#watermarkRotation')?.value || 0), -180, 180);
    const pattern = $('#watermarkPattern')?.value || 'single';
    const position = $('#watermarkPosition')?.value || 'center';
    const scope = $('#watermarkScope')?.value || 'all';
    const pageText = $('#watermarkPages')?.value || '';
    const color = hexToRgb($('#watermarkColor')?.value || '#777777');
    return processPdfBatch(async file => {
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const indexes = AdvancedPlanner.resolveScope(scope, document.getPageCount(), pageText);
      const font = type === 'text' ? await document.embedFont($('#watermarkFont')?.value === 'regular' ? PDFLib.StandardFonts.Helvetica : PDFLib.StandardFonts.HelveticaBold) : null;
      let embeddedImage = null;
      if (type === 'image') {
        const bytes = await imageFile.arrayBuffer();
        embeddedImage = imageFile.type === 'image/png' ? await document.embedPng(bytes) : await document.embedJpg(bytes);
      }
      for (const pageIndex of indexes) {
        const page = document.getPage(pageIndex); const { width, height } = page.getSize();
        let itemWidth, itemHeight, fontSize;
        if (type === 'text') {
          const unitWidth = Math.max(1, font.widthOfTextAtSize(text, 1));
          itemWidth = width * sizePercent; fontSize = Math.max(8, itemWidth / unitWidth); itemHeight = fontSize;
        } else {
          itemWidth = width * sizePercent; itemHeight = itemWidth * embeddedImage.height / embeddedImage.width;
          if (itemHeight > height * .8) { itemHeight = height * .8; itemWidth = itemHeight * embeddedImage.width / embeddedImage.height; }
        }
        const points = pattern === 'tile' ? watermarkTilePoints(width, height, itemWidth, itemHeight) : [positionPoint(position, width, height, itemWidth, itemHeight, 24)];
        for (const point of points) {
          if (type === 'text') page.drawText(text, { x: point.x, y: point.y, size: fontSize, font, color: PDFLib.rgb(color.r,color.g,color.b), opacity, rotate: PDFLib.degrees(rotation) });
          else page.drawImage(embeddedImage, { x: point.x, y: point.y, width: itemWidth, height: itemHeight, opacity, rotate: PDFLib.degrees(rotation) });
        }
      }
      return await document.save({ useObjectStreams: true });
    }, 'marca_dagua', 'PDFs_com_marca_dagua.zip', 'Marca-d’água aplicada.');
  }

  async function pageNumbers() {
    let format = $('#numberFormat')?.value || '{n}';
    if (format === 'custom') format = $('#numberCustomFormat')?.value || '{n}';
    const scope = $('#numberScope')?.value || 'all'; const pageText = $('#numberPages')?.value || '';
    const skip = Math.max(0, Number($('#numberSkip')?.value || 0)); const start = Number($('#numberStart')?.value || 1);
    const size = clamp(Number($('#numberSize')?.value || 10), 6, 48); const position = $('#numberPosition')?.value || 'bottom-center';
    const margin = clamp(Number($('#numberMargin')?.value || 24), 5, 100); const color = hexToRgb($('#numberColor')?.value || '#333333');
    const useBackground = Boolean($('#numberBackground')?.checked); const totalMode = $('#numberTotalMode')?.value || 'numbered';
    return processPdfBatch(async file => {
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer()); const font = await document.embedFont(PDFLib.StandardFonts.Helvetica);
      let indexes = AdvancedPlanner.resolveScope(scope, document.getPageCount(), pageText).filter(index => index >= skip);
      const totalShown = totalMode === 'document' ? document.getPageCount() : indexes.length;
      indexes.forEach((pageIndex, orderIndex) => {
        const page = document.getPage(pageIndex); const n = start + orderIndex;
        const text = format.replaceAll('{n}',String(n)).replaceAll('{total}',String(totalShown)).replaceAll('{page}',String(pageIndex + 1));
        const { width, height } = page.getSize(); const textWidth = font.widthOfTextAtSize(text,size);
        const resolvedPosition = resolveAlternatingPosition(position, pageIndex); const pos = calculateTextPosition(resolvedPosition,width,height,textWidth,size,margin);
        if (useBackground) page.drawRectangle({ x: pos.x - 4, y: pos.y - 3, width: textWidth + 8, height: size + 6, color: PDFLib.rgb(1,1,1), opacity: .78 });
        page.drawText(text,{x:pos.x,y:pos.y,size,font,color:PDFLib.rgb(color.r,color.g,color.b)});
      });
      return await document.save({ useObjectStreams: true });
    }, 'numerado', 'PDFs_numerados.zip', 'Numeração aplicada.');
  }

  function calculateTextPosition(position, width, height, textWidth, size, margin) {
    const top = position.startsWith('top');
    let x = margin;
    if (position.endsWith('center')) x = (width - textWidth) / 2;
    if (position.endsWith('right')) x = width - textWidth - margin;
    return { x: Math.max(margin, x), y: top ? height - margin - size : margin };
  }

  async function imagesToPdf() {
    const outputMode = $('#imageOutputMode')?.value || 'combined';
    const outputs = [];
    if (outputMode === 'combined') {
      const output = await PDFLib.PDFDocument.create();
      for (let index = 0; index < state.files.length; index++) { await addImagePage(output, state.files[index]); setProgress(10 + Math.round(((index + 1) / state.files.length) * 80)); }
      outputs.push({ name: `${outputBaseName('imagens_convertidas')}.pdf`, bytes: await output.save({ useObjectStreams: true }) });
    } else {
      for (let index = 0; index < state.files.length; index++) {
        const output = await PDFLib.PDFDocument.create(); await addImagePage(output, state.files[index]);
        outputs.push({ name: `${baseName(state.files[index].name)}.pdf`, bytes: await output.save({ useObjectStreams: true }) });
        setProgress(10 + Math.round(((index + 1) / state.files.length) * 80));
      }
    }
    await downloadPdfOutputs(outputs, outputBaseName('imagens_em_pdf'));
    return { message: outputMode === 'combined' ? `${state.files.length} imagem(ns) reunida(s) em um PDF.` : `${outputs.length} PDFs individuais gerados.` };
  }

  async function addImagePage(output, file) {
    const normalized = await normalizeImage(file, 'image/jpeg', .94);
    const image = normalized.mime === 'image/png' ? await output.embedPng(normalized.bytes) : await output.embedJpg(normalized.bytes);
    const pageMode = $('#imagePageMode')?.value || 'image'; const orientation = $('#imageOrientation')?.value || 'auto';
    const margin = mmToPoints(Math.max(0, Number($('#imageMargin')?.value || 0))); const fit = $('#imageFit')?.value || 'contain';
    let pageWidth, pageHeight;
    if (pageMode === 'image') { pageWidth = image.width + margin * 2; pageHeight = image.height + margin * 2; }
    else if (pageMode === 'letter') { pageWidth = 612; pageHeight = 792; }
    else if (pageMode === 'custom') { pageWidth = mmToPoints(Number($('#imageCustomWidth')?.value || 210)); pageHeight = mmToPoints(Number($('#imageCustomHeight')?.value || 297)); }
    else { pageWidth = 595.28; pageHeight = 841.89; }
    const shouldLandscape = orientation === 'landscape' || (orientation === 'auto' && image.width > image.height && pageMode !== 'image');
    if (shouldLandscape && pageHeight > pageWidth) [pageWidth,pageHeight] = [pageHeight,pageWidth];
    if (orientation === 'portrait' && pageWidth > pageHeight) [pageWidth,pageHeight] = [pageHeight,pageWidth];
    const page = output.addPage([pageWidth,pageHeight]); const bg = hexToRgb($('#imageBackground')?.value || '#ffffff');
    page.drawRectangle({ x:0,y:0,width:pageWidth,height:pageHeight,color:PDFLib.rgb(bg.r,bg.g,bg.b) });
    const boxW = Math.max(1,pageWidth-margin*2); const boxH = Math.max(1,pageHeight-margin*2);
    let drawW=image.width, drawH=image.height;
    if (fit === 'stretch') { drawW=boxW; drawH=boxH; }
    else { let scale = fit === 'cover' ? Math.max(boxW/image.width,boxH/image.height) : Math.min(boxW/image.width,boxH/image.height); if ($('#imageNoUpscale')?.checked && scale>1) scale=1; drawW=image.width*scale; drawH=image.height*scale; }
    const align=$('#imageAlign')?.value||'center'; const x=(pageWidth-drawW)/2; let y=(pageHeight-drawH)/2; if(align==='top') y=pageHeight-margin-drawH; if(align==='bottom') y=margin;
    page.drawImage(image,{x,y,width:drawW,height:drawH});
  }

  async function imageConvert() {
    if (!window.JSZip && state.files.length > 1) throw new Error('O componente ZIP não carregou.');
    const format = $('#outputFormat')?.value || 'image/jpeg';
    const maxWidth = Math.max(1, Number($('#maxWidth')?.value || 1920));
    const maxHeight = Math.max(1, Number($('#maxHeight')?.value || 1080));
    const quality = clamp(Number($('#quality')?.value || 88) / 100, .1, 1);
    const extension = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
    if (state.files.length === 1) {
      const blob = await resizeImage(state.files[0], maxWidth, maxHeight, format, quality);
      downloadBlob(blob, `${outputBaseName(`${baseName(state.files[0].name)}_convertida`)}.${extension}`);
      return;
    }
    const zip = new JSZip();
    for (let index = 0; index < state.files.length; index++) {
      const blob = await resizeImage(state.files[index], maxWidth, maxHeight, format, quality);
      zip.file(`${baseName(state.files[index].name)}.${extension}`, blob);
      setProgress(10 + Math.round(((index + 1) / state.files.length) * 75));
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `${outputBaseName('imagens_convertidas')}.zip`);
  }

  function buildOutputNameField(config) {
    const extLabel = config.outputLabel || (config.outputExt === 'auto' ? 'formato escolhido' : config.outputExt.toUpperCase());
    return `<div class="field output-name-field"><label for="outputFileName">Nome do arquivo final</label><div class="output-name-input"><input id="outputFileName" value="${escapeHtml(config.outputBase)}" autocomplete="off" /><span>${escapeHtml(extLabel)}</span></div><p class="field-hint">Você pode alterar o nome antes de baixar.</p></div>`;
  }

  function syncOutputName() {
    const input = $('#outputFileName');
    if (!input || state.outputNameTouched) return;
    const config = toolConfig[state.tool];
    let value = config.outputBase;
    if (state.files.length === 1) {
      const original = baseName(state.files[0].name);
      const suffixes = {
        organize: '_organizado', editPdf: '_editado', split: '_dividido', extract: '_extraido', rotate: '_girado',
        watermark: '_marca_dagua', pageNumbers: '_numerado', imageConvert: '_convertida', protect: '_protegido', unlock: '_desbloqueado', repairAdvanced: '_recuperado', flattenForms: '_fixado', formBuilder: '_formulario', signPdf: '_assinado_visual'
      };
      if (suffixes[state.tool]) value = `${original}${suffixes[state.tool]}`;
    }
    input.value = value;
  }

  function outputBaseName(fallback) {
    const raw = ($('#outputFileName')?.value || fallback || 'resultado').trim().replace(/\.[a-z0-9]{2,5}$/i, '');
    const safe = baseName(raw);
    return safe || baseName(fallback || 'resultado');
  }

  async function structuralCompressPdfBytes(file, stripMetadata) {
    const doc = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
    if (stripMetadata) cleanPdfMetadata(doc);
    return await doc.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 40 });
  }

  async function analyzeCompressionPages(file, scope, pageText, fileIndex, fileTotal) {
    await ensurePdfWorker();
    if (!window.CentralPDFCompressionEngine) throw new Error('O analisador inteligente de compressão não carregou.');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    let rendered = null;
    try {
      rendered = await loadingTask.promise;
      const selectedPages = new Set(AdvancedPlanner.resolveScope(scope, rendered.numPages, pageText));
      const metricsByPage = Array(rendered.numPages).fill(null);
      let completed = 0;
      for (const pageIndex of selectedPages) {
        const page = await rendered.getPage(pageIndex + 1);
        try {
          metricsByPage[pageIndex] = await window.CentralPDFCompressionEngine.analyzePage(page, pdfjsLib);
        } catch (_) {
          metricsByPage[pageIndex] = {
            imageCount: 1, textOps: 0, vectorOps: 0,
            imageCoverage: 1, maxImageCoverage: 1, likelyScanned: true,
            analysisFallback: true
          };
        } finally {
          try { page.cleanup(); } catch (_) {}
        }
        completed += 1;
        setProgress(5 + Math.round(((fileIndex + (completed / Math.max(1, selectedPages.size)) * .18) / fileTotal) * 80));
      }
      return { metricsByPage, selectedPages, numPages: rendered.numPages };
    } finally {
      try { await rendered?.cleanup?.(); } catch (_) {}
      try { await loadingTask.destroy(); } catch (_) {}
    }
  }

  async function rasterCompressPdfAdaptive(file, profile, scope, pageText, stripMetadata, fileIndex, fileTotal) {
    const configuredAttempts = profile.attempts?.length ? profile.attempts : [{
      dpi: profile.dpi || 72,
      quality: profile.quality || .42,
      minImageCoverage: profile.minImageCoverage ?? 0
    }];
    const analysis = await analyzeCompressionPages(file, scope, pageText, fileIndex, fileTotal);
    const largeDocument = analysis.numPages >= 250 || file.size >= 8 * 1024 * 1024;
    const attempts = largeDocument && profile.largeDocumentAttempt
      ? [profile.largeDocumentAttempt]
      : configuredAttempts;
    let bestCandidate = null;
    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
      const attempt = { ...attempts[attemptIndex], grayscale: Boolean(profile.grayscale) };
      const result = await rasterCompressPdfAdvanced(file, attempt, scope, pageText, stripMetadata, fileIndex, fileTotal, analysis);
      const candidate = {
        ...attempt,
        bytes: result.bytes,
        stats: result.stats,
        reduction: file.size ? 1 - result.bytes.byteLength / file.size : 0
      };
      if (!bestCandidate || candidate.bytes.byteLength < bestCandidate.bytes.byteLength) bestCandidate = candidate;
      if (!profile.adaptive || candidate.reduction >= (profile.targetReduction || 0)) return candidate;
    }
    return bestCandidate;
  }
  async function compress() {
    if (!window.pdfjsLib) throw new Error('O motor de renderização PDF.js não carregou.');
    const mode = $('#compressionMode')?.value || 'recommended';
    const profile = AdvancedPlanner.compressionProfile(mode, { dpi: $('#compressionDpi')?.value, quality: $('#compressionQuality')?.value, grayscale: $('#compressionGrayscale')?.checked });
    const scope = $('#compressionScope')?.value || 'all';
    const pageText = $('#compressionPages')?.value || '';
    const stripMetadata = Boolean($('#compressionStripMetadata')?.checked);
    const keepSmaller = Boolean($('#compressionKeepSmaller')?.checked);
    const includeReport = Boolean($('#compressionReport')?.checked);
    const outputs = [];
    const reportLines = ['CENTRAL PDF & IMAGEM - RELATÓRIO DE COMPRESSÃO ADAPTATIVA',''];
    let totalOriginal = 0, totalFinal = 0;

    for (let fileIndex = 0; fileIndex < state.files.length; fileIndex++) {
      const file = state.files[fileIndex];
      totalOriginal += file.size;
      const originalBytes = new Uint8Array(await file.arrayBuffer());
      let selected;

      if (!profile.rasterize) {
        const bytes = await structuralCompressPdfBytes(file, stripMetadata);
        selected = { bytes, dpi: null, quality: null, reduction: file.size ? 1 - bytes.byteLength / file.size : 0, method: 'estrutural' };
      } else {
        selected = await rasterCompressPdfAdaptive(file, profile, scope, pageText, stripMetadata, fileIndex, state.files.length);
        selected.method = 'raster inteligente por conteúdo';
      }

      let usedOriginal = false;
      if (keepSmaller && originalBytes.byteLength <= selected.bytes.byteLength) {
        selected = { bytes: originalBytes, dpi: null, quality: null, reduction: 0, method: 'original preservado' };
        usedOriginal = true;
      }

      totalFinal += selected.bytes.byteLength;
      outputs.push({ name: `${baseName(file.name)}_comprimido.pdf`, bytes: selected.bytes });
      const reduction = file.size ? Math.round((1 - selected.bytes.byteLength / file.size) * 100) : 0;
      const pageStats = selected.stats ? window.CentralPDFCompressionEngine.describeStats(selected.stats) : '';
      const details = selected.dpi ? `${selected.dpi} DPI, JPG ${Math.round(selected.quality * 100)}%${pageStats ? `; ${pageStats}` : ''}` : selected.method;
      reportLines.push(
        `Arquivo: ${file.name}`,
        `Perfil: ${mode}`,
        `Método escolhido: ${details}`,
        `Antes: ${formatBytes(file.size)}`,
        `Depois: ${formatBytes(selected.bytes.byteLength)}`,
        `Redução: ${reduction}%${usedOriginal ? ' (original mantido porque já era menor)' : ''}`,
        ''
      );
    }

    if (outputs.length === 1 && !includeReport) downloadBytes(outputs[0].bytes, outputs[0].name, 'application/pdf');
    else {
      if (!window.JSZip) throw new Error('O componente ZIP não carregou.');
      const zip = new JSZip();
      outputs.forEach(item => zip.file(item.name, item.bytes));
      if (includeReport) zip.file('RELATORIO_DE_COMPRESSAO.txt', reportLines.join('\n'));
      downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }), `${outputBaseName('PDFs_comprimidos')}.zip`);
    }
    const reduction = totalOriginal ? Math.round((1 - totalFinal / totalOriginal) * 100) : 0;
    return { message: `Compressão concluída: ${formatBytes(totalOriginal)} → ${formatBytes(totalFinal)} (${reduction}% de redução total).` };
  }

  async function rasterCompressPdfAdvanced(file, profile, scope, pageText, stripMetadata, fileIndex, fileTotal, analysis = null) {
    await ensurePdfWorker();
    const originalBytes = new Uint8Array(await file.arrayBuffer());
    const pdfJsBytes = originalBytes.slice();
    const pdfLibBytes = originalBytes.slice();
    const loadingTask = pdfjsLib.getDocument({ data: pdfJsBytes });
    let rendered = null;
    try {
      rendered = await loadingTask.promise;
      const source = await PDFLib.PDFDocument.load(pdfLibBytes, { updateMetadata: false });
      const output = await PDFLib.PDFDocument.create();
      if (!stripMetadata) copyDocumentMetadata(source, output);
      const selectedPages = analysis?.selectedPages || new Set(AdvancedPlanner.resolveScope(scope, rendered.numPages, pageText));
      const metricsByPage = analysis?.metricsByPage || Array(rendered.numPages).fill(null);
      let rasterizedPages = 0;
      let preservedPages = 0;
      for (let pageIndex = 0; pageIndex < rendered.numPages; pageIndex++) {
        const metrics = metricsByPage[pageIndex];
        const shouldRasterize = selectedPages.has(pageIndex)
          && window.CentralPDFCompressionEngine.shouldRasterizePage(metrics, profile);
        if (!shouldRasterize) {
          const [copied] = await output.copyPages(source, [pageIndex]);
          output.addPage(copied);
          if (selectedPages.has(pageIndex)) preservedPages += 1;
        } else {
          const page = await rendered.getPage(pageIndex + 1);
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: profile.dpi / 72 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.ceil(viewport.width));
          canvas.height = Math.max(1, Math.ceil(viewport.height));
          const context = canvas.getContext('2d', { alpha: false });
          context.fillStyle = '#fff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport, intent: 'print' }).promise;
          if (profile.grayscale) grayscaleCanvas(canvas);
          const blob = await canvasToBlob(canvas, 'image/jpeg', profile.quality);
          const image = await output.embedJpg(await blob.arrayBuffer());
          const newPage = output.addPage([baseViewport.width, baseViewport.height]);
          newPage.drawImage(image, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
          rasterizedPages += 1;
          canvas.width = 1;
          canvas.height = 1;
          try { page.cleanup(); } catch (_) {}
        }
        setProgress(20 + Math.round(((fileIndex + (pageIndex + 1) / rendered.numPages) / fileTotal) * 75));
      }
      const bytes = await output.save({ useObjectStreams: true, objectsPerTick: 40 });
      return {
        bytes,
        stats: {
          selectedPages: selectedPages.size,
          rasterizedPages,
          preservedPages,
          totalPages: rendered.numPages,
          scannedPages: metricsByPage.filter(item => item?.likelyScanned).length,
          textOnlyPages: metricsByPage.filter(item => item && item.imageCount === 0).length
        }
      };
    } finally {
      try { await rendered?.cleanup?.(); } catch (_) {}
      try { await loadingTask.destroy(); } catch (_) {}
    }
  }
  async function pdfToImage() {
    if (!window.pdfjsLib) throw new Error('O motor PDF.js não carregou.');
    await ensurePdfWorker();
    const mime=$('#pdfImageFormat')?.value||'image/jpeg'; const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
    const dpi=Number($('#pdfImageDpi')?.value||150); const quality=clamp(Number($('#pdfImageQuality')?.value||88)/100,.3,1);
    const scope=$('#pdfImageScope')?.value||'all'; const pageText=$('#pdfImagePages')?.value||''; const outputMode=$('#pdfImageOutputMode')?.value||'pages';
    const grayscale=Boolean($('#pdfImageGrayscale')?.checked); const transparent=Boolean($('#pdfImageTransparent')?.checked)&&mime==='image/png';
    const prefix=baseName($('#pdfImagePrefix')?.value||'pagina'); const columns=clamp(Number($('#pdfImageColumns')?.value||3),1,6);
    const outputs=[]; let completed=0; let total=0; const docs=[];
    for(const file of state.files){const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; const indexes=AdvancedPlanner.resolveScope(scope,pdf.numPages,pageText); docs.push({file,pdf,indexes}); total+=indexes.length;}
    try{
      for(const item of docs){
        if(outputMode==='contact'){
          const canvases=[];
          for(const index of item.indexes){canvases.push(await renderPdfPageCanvas(item.pdf,index,dpi,transparent,grayscale)); completed++; setProgress(10+Math.round((completed/total)*75));}
          const sheet=buildContactSheet(canvases,columns); outputs.push({name:`${baseName(item.file.name)}_contato.${extension}`,blob:await canvasToBlob(sheet,mime,quality)});
        }else{
          const digits=String(item.pdf.numPages).length;
          for(const index of item.indexes){const canvas=await renderPdfPageCanvas(item.pdf,index,dpi,transparent,grayscale); outputs.push({name:`${baseName(item.file.name)}_${prefix}_${String(index+1).padStart(digits,'0')}.${extension}`,blob:await canvasToBlob(canvas,mime,quality)}); completed++; setProgress(10+Math.round((completed/total)*75));}
        }
      }
      if(outputs.length===1) downloadBlob(outputs[0].blob,outputs[0].name);
      else{if(!window.JSZip) throw new Error('O componente ZIP não carregou.'); const zip=new JSZip(); outputs.forEach(item=>zip.file(item.name,item.blob)); downloadBlob(await zip.generateAsync({type:'blob'}),`${outputBaseName('PDF_para_imagens')}.zip`);}
      return {message:`${outputs.length} imagem(ns) ${extension.toUpperCase()} gerada(s) a partir de ${completed} página(s).`};
    }finally{for(const item of docs) await item.pdf.destroy();}
  }

  async function renderPdfPageCanvas(pdf,index,dpi,transparent,grayscale){
    const page=await pdf.getPage(index+1); const viewport=page.getViewport({scale:dpi/72}); const canvas=document.createElement('canvas'); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
    const context=canvas.getContext('2d',{alpha:transparent}); if(!transparent){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);} await page.render({canvasContext:context,viewport}).promise; if(grayscale) grayscaleCanvas(canvas); return canvas;
  }

  function buildContactSheet(canvases,columns){
    const gap=18; const thumbWidth=280; const scaled=canvases.map(canvas=>({canvas,width:thumbWidth,height:Math.round(canvas.height*(thumbWidth/canvas.width))})); const rows=Math.ceil(scaled.length/columns);
    const rowHeights=Array.from({length:rows},(_,row)=>Math.max(...scaled.slice(row*columns,(row+1)*columns).map(item=>item.height),0)); const width=columns*thumbWidth+(columns+1)*gap; const height=rowHeights.reduce((sum,value)=>sum+value,0)+(rows+1)*gap;
    const sheet=document.createElement('canvas'); sheet.width=width; sheet.height=height; const context=sheet.getContext('2d'); context.fillStyle='#fff';context.fillRect(0,0,width,height); let y=gap;
    for(let row=0;row<rows;row++){for(let col=0;col<columns;col++){const item=scaled[row*columns+col];if(!item)continue;const x=gap+col*(thumbWidth+gap);context.drawImage(item.canvas,x,y,item.width,item.height);}y+=rowHeights[row]+gap;} return sheet;
  }

  async function crop() {
    const mode=$('#cropMode')?.value||'margins'; const scope=$('#cropScope')?.value||'all'; const pageText=$('#cropPages')?.value||''; const behavior=$('#cropBehavior')?.value||'visual';
    return processPdfBatch(async file=>{
      const source=await PDFLib.PDFDocument.load(await file.arrayBuffer()); const indexes=new Set(AdvancedPlanner.resolveScope(scope,source.getPageCount(),pageText));
      if(behavior==='visual'){
        source.getPages().forEach((page,index)=>{if(!indexes.has(index))return;const box=page.getCropBox();const crop=calculateCropBox(mode,box);page.setCropBox(crop.x,crop.y,crop.width,crop.height);});
        return await source.save({useObjectStreams:true});
      }
      const output=await PDFLib.PDFDocument.create(); copyDocumentMetadata(source,output);
      for(let index=0;index<source.getPageCount();index++){
        if(!indexes.has(index)){const [copied]=await output.copyPages(source,[index]);output.addPage(copied);continue;}
        const page=source.getPage(index); const crop=calculateCropBox(mode,page.getCropBox());
        const embedded=await output.embedPage(page,{left:crop.x,bottom:crop.y,right:crop.x+crop.width,top:crop.y+crop.height}); const target=output.addPage([crop.width,crop.height]); target.drawPage(embedded,{x:0,y:0,width:crop.width,height:crop.height});
      }
      return await output.save({useObjectStreams:true});
    },'recortado','PDFs_recortados.zip','Recorte aplicado.');
  }

  function calculateCropBox(mode,box){
    let top=0,right=0,bottom=0,left=0;
    if(mode==='presetHeader') top=mmToPoints(25); else if(mode==='presetFooter') bottom=mmToPoints(25); else if(mode==='presetEdges') top=right=bottom=left=mmToPoints(10);
    else if(mode==='center') {const width=mmToPoints(Number($('#cropCenterWidth')?.value||180));const height=mmToPoints(Number($('#cropCenterHeight')?.value||250));if(width>box.width||height>box.height)throw new Error('A área central informada é maior que a página.');return{x:box.x+(box.width-width)/2,y:box.y+(box.height-height)/2,width,height};}
    else {const factor=mode==='percent'?null:mmToPoints(1);const t=Number($('#cropTop')?.value||0),r=Number($('#cropRight')?.value||0),b=Number($('#cropBottom')?.value||0),l=Number($('#cropLeft')?.value||0);if([t,r,b,l].some(v=>v<0))throw new Error('Os valores de recorte não podem ser negativos.');if(mode==='percent'){top=box.height*t/100;bottom=box.height*b/100;left=box.width*l/100;right=box.width*r/100;}else{top=t*factor;right=r*factor;bottom=b*factor;left=l*factor;}}
    const width=box.width-left-right,height=box.height-top-bottom;if(width<20||height<20)throw new Error('O recorte informado é maior que a página.');return{x:box.x+left,y:box.y+bottom,width,height};
  }

  async function metadata() {
    return processPdfBatch(async file=>{
      const doc=await PDFLib.PDFDocument.load(await file.arrayBuffer());
      cleanPdfMetadata(doc);
      return await doc.save({useObjectStreams:true});
    },'sem_metadados','PDFs_sem_metadados.zip', 'Metadados básicos removidos.');
  }

  async function normalize() {
    const removeMeta=Boolean($('#normalizeMetadata')?.checked);
    return processPdfBatch(async file=>{
      const doc=await PDFLib.PDFDocument.load(await file.arrayBuffer(),{updateMetadata:false});
      if(removeMeta) cleanPdfMetadata(doc);
      return await doc.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:30});
    },'normalizado','PDFs_normalizados.zip','Estrutura dos PDFs regravada com sucesso.');
  }

  async function runIntelligenceTool(tool) {
    if (!window.CentralPDFIntelligence?.process) throw new Error('O módulo de inteligência documental não foi carregado.');
    const result = await window.CentralPDFIntelligence.process(tool, { files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    for (const output of result.outputs || []) downloadBlob(output.blob, output.filename);
    return { message: result.message || 'Análise documental concluída.' };
  }
  async function documentAssistant() { return runIntelligenceTool('documentAssistant'); }
  async function structuredExtraction() { return runIntelligenceTool('structuredExtraction'); }
  async function documentAudit() { return runIntelligenceTool('documentAudit'); }
  async function classifyRename() { return runIntelligenceTool('classifyRename'); }

  async function compare() {
    if (!window.CentralPDFCompare?.process) throw new Error('O módulo de comparação não foi carregado.');
    const result = await window.CentralPDFCompare.process({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    for (const output of result.outputs || []) downloadBlob(output.blob, output.filename);
    return { message: result.message || 'Comparação concluída.' };
  }

  async function redact() {
    if (!window.CentralPDFRedaction?.process) throw new Error('O módulo de censura não foi carregado.');
    const result = await window.CentralPDFRedaction.process({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    const outputs = result.outputs || [];
    if (outputs.length === 1) downloadBlob(outputs[0].blob, outputs[0].filename);
    else if (outputs.length) {
      const zip = new JSZip(); for (const o of outputs) zip.file(o.filename, o.blob);
      downloadBlob(await zip.generateAsync({type:'blob'}), `${outputBaseName('Censura_resultados')}.zip`);
      const pdfOutput = outputs.find(o => o.blob?.type === 'application/pdf' || /\.pdf$/i.test(o.filename));
      if (pdfOutput) window.dispatchEvent(new CustomEvent('centralpdf-result', { detail: {
        filename: pdfOutput.filename, size: pdfOutput.blob.size, type: 'application/pdf', blob: pdfOutput.blob,
        held: Boolean(window.CentralPDFExperience?.shouldHoldResult?.()), tool: state.tool, toolTitle: toolConfig[state.tool]?.title || state.tool
      } }));
    }
    return { message: result.message || 'Censura definitiva concluída.' };
  }

  async function formBuilder() {
    if (!window.CentralPDFForms?.process) throw new Error('O designer de formulários não foi carregado.');
    const result = await window.CentralPDFForms.process({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    for (const output of result.outputs || []) downloadBlob(output.blob, output.filename);
    return { message: result.message || 'Formulário preenchível criado.' };
  }

  async function signPdf() {
    if (!window.CentralPDFSignatures?.process) throw new Error('O módulo de assinaturas não foi carregado.');
    const result = await window.CentralPDFSignatures.process({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    for (const output of result.outputs || []) downloadBlob(output.blob, output.filename);
    return { message: result.message || 'Assinatura visual aplicada.' };
  }

  async function ocr() {
    if (!window.CentralPDFOCR?.process) throw new Error('O módulo OCR não foi carregado.');
    const result = await window.CentralPDFOCR.process({
      files: state.files,
      progress: setProgress,
      status: setStatus,
      cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.())
    });
    for (const output of result.outputs || []) downloadBlob(output.blob, output.filename);
    return { message: result.message || 'OCR concluído.' };
  }

  async function pdfToText() {
    if(!window.pdfjsLib) throw new Error('O motor PDF.js não carregou.');
    await ensurePdfWorker();
    const headers=Boolean($('#textPageHeaders')?.checked);
    const outputs=[];
    let totalChars=0;
    for(let fileIndex=0;fileIndex<state.files.length;fileIndex++){
      const file=state.files[fileIndex];
      const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      const chunks=[];
      try{
        for(let pageIndex=1;pageIndex<=pdf.numPages;pageIndex++){
          const page=await pdf.getPage(pageIndex);
          const content=await page.getTextContent();
          const text=content.items.map(item=>item.str).join(' ').replace(/\s+/g,' ').trim();
          if(headers) chunks.push(`===== PÁGINA ${pageIndex} =====`);
          chunks.push(text,''); totalChars+=text.length;
          setProgress(10+Math.round(((fileIndex+(pageIndex/pdf.numPages))/state.files.length)*80));
        }
      }finally{await pdf.destroy();}
      outputs.push({name:`${baseName(file.name)}.txt`,blob:new Blob([chunks.join('\n')],{type:'text/plain;charset=utf-8'})});
    }
    if(outputs.length===1) downloadBlob(outputs[0].blob,`${outputBaseName(baseName(outputs[0].name))}.txt`);
    else{
      if(!window.JSZip) throw new Error('O componente ZIP não carregou.');
      const zip=new JSZip(); outputs.forEach(item=>zip.file(item.name,item.blob));
      downloadBlob(await zip.generateAsync({type:'blob'}),`${outputBaseName('textos_extraidos')}.zip`);
    }
    return {message:`Texto extraído: ${totalChars.toLocaleString('pt-BR')} caracteres.`};
  }



  async function pdfToOffice() {
    if (!window.CentralPDFConversions?.processPdfToOffice) throw new Error('O módulo de conversões 0.19 não foi carregado.');
    const result = await window.CentralPDFConversions.processPdfToOffice({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    await deliverConversionOutputs(result.outputs || [], 'arquivos_Office.zip');
    return { message: result.message || 'Conversão para Office concluída.' };
  }

  async function documentsToPdf() {
    if (!window.CentralPDFConversions?.processDocumentsToPdf) throw new Error('O módulo de conversões 0.19 não foi carregado.');
    const result = await window.CentralPDFConversions.processDocumentsToPdf({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    await deliverConversionOutputs(result.outputs || [], 'documentos_convertidos.zip');
    return { message: result.message || 'Documentos convertidos para PDF.' };
  }

  async function extractImages() {
    if (!window.CentralPDFConversions?.processExtractImages) throw new Error('O módulo de conversões 0.19 não foi carregado.');
    const result = await window.CentralPDFConversions.processExtractImages({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    await deliverConversionOutputs(result.outputs || [], 'imagens_extraidas.zip');
    return { message: result.message || 'Extração de imagens concluída.' };
  }

  async function archivePdf() {
    if (!window.CentralPDFConversions?.processArchivePdf) throw new Error('O módulo de conversões 0.19 não foi carregado.');
    const result = await window.CentralPDFConversions.processArchivePdf({ files: state.files, progress: setProgress, cancelled: () => Boolean(window.CentralPDFFoundation?.isCancellationRequested?.()) });
    await deliverConversionOutputs(result.outputs || [], 'pacote_de_arquivamento.zip');
    return { message: result.message || 'Pacote de arquivamento criado.' };
  }

  async function deliverConversionOutputs(outputs, zipName) {
    if (!outputs.length) throw new Error('Nenhum arquivo foi produzido.');
    if (outputs.length === 1) { downloadBlob(outputs[0].blob, outputs[0].filename); return; }
    const zip = new JSZip(); for (const output of outputs) zip.file(output.filename, output.blob);
    downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), zipName);
  }

  async function loadLibPdfEngine() {
    if (state.libPdfEngine) return state.libPdfEngine;
    if (state.libPdfEnginePromise) return state.libPdfEnginePromise;
    state.libPdfEnginePromise = (async () => {
      setStatus('Carregando o motor profissional LibPDF...', 'processing');
      try {
        let module;
        try { module = await import(new URL('vendor/libpdf-core.mjs', document.baseURI).href); }
        catch (_) {
          if (!window.CentralPDFRemoteEngines?.isAllowed?.()) {
            throw new Error('O motor LibPDF local não foi encontrado. Execute PREPARAR_OFFLINE.bat ou autorize o download em Sistema > Preparar uso offline.');
          }
          module = await import('https://esm.sh/@libpdf/core@0.4.1?bundle');
        }
        if (!module?.PDF) throw new Error('A biblioteca foi carregada, mas a API PDF não foi encontrada.');
        state.libPdfEngine = module;
        return module;
      } catch (error) {
        state.libPdfEnginePromise = null;
        throw new Error(`Não foi possível carregar o motor profissional. Abra pelo inicializador local e execute PREPARAR_OFFLINE.bat ou verifique a internet. Detalhe: ${error?.message || error}`);
      }
    })();
    return state.libPdfEnginePromise;
  }

  function libPdfCredentials(password) {
    const value = String(password || '').trim();
    return value ? { credentials: value } : {};
  }

  async function protect() {
    const password = String($('#protectPassword')?.value || '');
    const confirm = String($('#protectPasswordConfirm')?.value || '');
    const ownerPassword = String($('#protectOwnerPassword')?.value || '');
    if (password.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.');
    if (password !== confirm) throw new Error('A confirmação da senha não corresponde.');
    if (ownerPassword && ownerPassword === password) throw new Error('A senha administrativa deve ser diferente da senha de abertura.');
    const algorithm = $('#protectAlgorithm')?.value || 'AES-256';
    const { PDF } = await loadLibPdfEngine();
    const permissions = {
      print: Boolean($('#permPrint')?.checked),
      printHighQuality: Boolean($('#permPrint')?.checked),
      copy: Boolean($('#permCopy')?.checked),
      modify: Boolean($('#permModify')?.checked),
      annotate: Boolean($('#permAnnotate')?.checked),
      fillForms: Boolean($('#permForms')?.checked),
      accessibility: true,
      assemble: Boolean($('#permModify')?.checked),
    };
    const outputs = [];
    for (let index = 0; index < state.files.length; index++) {
      const file = state.files[index];
      const pdf = await PDF.load(new Uint8Array(await file.arrayBuffer()));
      if (pdf.isEncrypted) throw new Error(`${file.name} já possui criptografia. Remova a proteção ou informe outro arquivo.`);
      const protection = { userPassword: password, algorithm, permissions };
      if (ownerPassword) protection.ownerPassword = ownerPassword;
      pdf.setProtection(protection);
      outputs.push({ name: `${baseName(file.name)}_protegido.pdf`, bytes: await pdf.save() });
      setProgress(10 + Math.round(((index + 1) / state.files.length) * 80));
    }
    await downloadPdfOutputs(outputs, outputBaseName('PDFs_protegidos'));
    return { message: `${outputs.length} PDF(s) protegido(s) com ${algorithm}. Guarde a senha em local seguro.` };
  }

  async function unlock() {
    const password = String($('#unlockPassword')?.value || '');
    if (!password) throw new Error('Informe a senha atual do PDF.');
    const { PDF } = await loadLibPdfEngine();
    const outputs = [];
    for (let index = 0; index < state.files.length; index++) {
      const file = state.files[index];
      const pdf = await PDF.load(new Uint8Array(await file.arrayBuffer()), { credentials: password });
      if (!pdf.isEncrypted) throw new Error(`${file.name} não está protegido por senha.`);
      if (!pdf.isAuthenticated) throw new Error(`Senha incorreta para ${file.name}.`);
      try { pdf.removeProtection(); }
      catch (error) { throw new Error(`Não foi possível remover a proteção de ${file.name}. Tente a senha administrativa/proprietário. ${error?.message || ''}`); }
      outputs.push({ name: `${baseName(file.name)}_desbloqueado.pdf`, bytes: await pdf.save() });
      setProgress(10 + Math.round(((index + 1) / state.files.length) * 80));
    }
    await downloadPdfOutputs(outputs, outputBaseName('PDFs_desbloqueados'));
    return { message: `${outputs.length} PDF(s) salvos sem proteção. Os arquivos originais não foram alterados.` };
  }

  async function diagnose() {
    const password = String($('#diagnosePassword')?.value || '').trim();
    const includeJson = Boolean($('#diagnoseJson')?.checked);
    const { PDF } = await loadLibPdfEngine();
    const reports = [];
    for (let index = 0; index < state.files.length; index++) {
      const file = state.files[index];
      let pdf;
      try {
        pdf = await PDF.load(new Uint8Array(await file.arrayBuffer()), { ...libPdfCredentials(password), lenient: true });
      } catch (error) {
        reports.push({ arquivo: file.name, tamanhoBytes: file.size, erro: error?.message || String(error) });
        continue;
      }
      const report = {
        arquivo: file.name,
        tamanhoBytes: file.size,
        tamanhoFormatado: formatBytes(file.size),
        versaoPDF: String(pdf.version || 'não informada'),
        paginas: safeCall(() => pdf.getPageCount(), null),
        criptografado: Boolean(pdf.isEncrypted),
        autenticado: Boolean(pdf.isAuthenticated),
        recuperadoPorVarredura: Boolean(pdf.recoveredViaBruteForce),
        permissoes: safeCall(() => pdf.isEncrypted && pdf.isAuthenticated ? pdf.getPermissions() : null, null),
        formulario: null,
      };
      try {
        const form = pdf.getForm();
        const fields = form?.getFields?.() || [];
        const signatures = form?.getSignatureFields?.() || [];
        report.formulario = {
          totalCampos: fields.length,
          tipos: fields.reduce((acc, field) => { const type = field.type || 'desconhecido'; acc[type] = (acc[type] || 0) + 1; return acc; }, {}),
          assinaturas: signatures.map(field => ({ nome: field.name, assinada: Boolean(field.isSigned?.()) })),
        };
      } catch (error) {
        report.formulario = { indisponivel: true, motivo: error?.message || String(error) };
      }
      reports.push(report);
      setProgress(10 + Math.round(((index + 1) / state.files.length) * 75));
    }
    const text = buildDiagnosticText(reports);
    if (includeJson) {
      if (!window.JSZip) throw new Error('O componente ZIP não carregou.');
      const zip = new JSZip();
      zip.file('diagnostico.txt', text);
      zip.file('diagnostico.json', JSON.stringify({ geradoEm: new Date().toISOString(), relatorios: reports }, null, 2));
      downloadBlob(await zip.generateAsync({ type: 'blob' }), `${outputBaseName('diagnostico_PDF')}.zip`);
    } else {
      downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${outputBaseName('diagnostico_PDF')}.txt`);
    }
    const encrypted = reports.filter(item => item.criptografado).length;
    const recovered = reports.filter(item => item.recuperadoPorVarredura).length;
    return { message: `Diagnóstico concluído: ${reports.length} arquivo(s), ${encrypted} criptografado(s) e ${recovered} recuperado(s) por varredura.` };
  }

  async function repairAdvanced() {
    const password = String($('#repairPassword')?.value || '').trim();
    const removeProtection = Boolean($('#repairRemoveProtection')?.checked);
    const { PDF } = await loadLibPdfEngine();
    const outputs = [];
    let recoveredCount = 0;
    for (let index = 0; index < state.files.length; index++) {
      const file = state.files[index];
      const pdf = await PDF.load(new Uint8Array(await file.arrayBuffer()), { ...libPdfCredentials(password), lenient: true });
      if (pdf.isEncrypted && !pdf.isAuthenticated) throw new Error(`${file.name} exige uma senha válida para ser recuperado.`);
      if (pdf.recoveredViaBruteForce) recoveredCount += 1;
      if (removeProtection && pdf.isEncrypted) {
        try { pdf.removeProtection(); }
        catch (error) { throw new Error(`A proteção de ${file.name} não pôde ser removida. Use a senha administrativa. ${error?.message || ''}`); }
      }
      const recoveredBytes = await pdf.save();
      await validateRecoveredPdfBytes(recoveredBytes, file.name, password);
      outputs.push({ name: `${baseName(file.name)}_recuperado.pdf`, bytes: recoveredBytes });
      setProgress(10 + Math.round(((index + 1) / state.files.length) * 80));
    }
    await downloadPdfOutputs(outputs, outputBaseName('PDFs_recuperados'));
    return { message: `Recuperação concluída para ${outputs.length} PDF(s). ${recoveredCount} exigiram reconstrução por varredura.` };
  }

  async function validateRecoveredPdfBytes(bytes, sourceName, password = '') {
    const recoveredBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const validationErrors = [];
    if (window.PDFLib?.PDFDocument?.load) {
      try {
        const document = await window.PDFLib.PDFDocument.load(recoveredBytes.slice(), { ignoreEncryption: false, updateMetadata: false });
        if (document.getPageCount() < 1) throw new Error('o documento reconstruído não possui páginas');
        return;
      } catch (error) {
        validationErrors.push(error?.message || String(error));
      }
    }
    if (window.pdfjsLib?.getDocument) {
      let task;
      try {
        task = window.pdfjsLib.getDocument({ data: recoveredBytes.slice(), password: password || undefined, isEvalSupported: false });
        const document = await task.promise;
        if (document.numPages < 1) throw new Error('o documento reconstruído não possui páginas');
        return;
      } catch (error) {
        validationErrors.push(error?.message || String(error));
      } finally {
        await task?.destroy?.();
      }
    }
    if (!validationErrors.length) validationErrors.push('nenhum validador de PDF está disponível');
    throw new Error(`A recuperação de ${sourceName} não produziu um PDF válido. O arquivo não será disponibilizado. ${validationErrors.join(' | ')}`);
  }

  async function flattenForms() {
    const password = String($('#flattenPassword')?.value || '').trim();
    const { PDF } = await loadLibPdfEngine();
    const outputs = [];
    let totalFields = 0;
    for (let index = 0; index < state.files.length; index++) {
      const file = state.files[index];
      const pdf = await PDF.load(new Uint8Array(await file.arrayBuffer()), { ...libPdfCredentials(password), lenient: true });
      if (pdf.isEncrypted && !pdf.isAuthenticated) throw new Error(`${file.name} exige uma senha válida.`);
      const form = pdf.getForm();
      const fields = form?.getFields?.() || [];
      if (!fields.length) throw new Error(`${file.name} não possui campos de formulário AcroForm.`);
      totalFields += fields.length;
      form.flatten();
      outputs.push({ name: `${baseName(file.name)}_formulario_fixado.pdf`, bytes: await pdf.save() });
      setProgress(10 + Math.round(((index + 1) / state.files.length) * 80));
    }
    await downloadPdfOutputs(outputs, outputBaseName('formularios_fixados'));
    return { message: `${totalFields} campo(s) de formulário foram fixados em ${outputs.length} PDF(s).` };
  }

  function safeCall(fn, fallback = null) {
    try { return fn(); } catch { return fallback; }
  }

  function buildDiagnosticText(reports) {
    const lines = ['CENTRAL PDF & IMAGEM — DIAGNÓSTICO TÉCNICO', `Gerado em: ${new Date().toLocaleString('pt-BR')}`, ''];
    reports.forEach((report, index) => {
      lines.push(`===== ARQUIVO ${index + 1} =====`, `Nome: ${report.arquivo}`, `Tamanho: ${report.tamanhoFormatado || report.tamanhoBytes + ' bytes'}`);
      if (report.erro) { lines.push(`Erro: ${report.erro}`, ''); return; }
      lines.push(`Versão PDF: ${report.versaoPDF}`, `Páginas: ${report.paginas ?? 'indisponível'}`, `Criptografado: ${report.criptografado ? 'sim' : 'não'}`, `Autenticado: ${report.autenticado ? 'sim' : 'não'}`, `Recuperado por varredura: ${report.recuperadoPorVarredura ? 'sim' : 'não'}`);
      if (report.permissoes) lines.push(`Permissões: ${JSON.stringify(report.permissoes)}`);
      if (report.formulario) lines.push(`Formulário: ${JSON.stringify(report.formulario)}`);
      lines.push('');
    });
    return lines.join('\n');
  }

  async function processPdfBatch(transformer, suffix, zipName, successMessage='Processamento em lote concluído.') {
    const outputs=[];
    for(let index=0;index<state.files.length;index++){
      const file=state.files[index];
      const bytes=await transformer(file,index);
      outputs.push({name:`${baseName(file.name)}_${suffix}.pdf`,bytes});
      setProgress(10+Math.round(((index+1)/state.files.length)*80));
    }
    await downloadPdfOutputs(outputs, outputBaseName(zipName.replace(/\.zip$/i,'')));
    return {message: state.files.length===1 ? 'PDF processado e baixado com sucesso.' : `${successMessage} ${outputs.length} arquivos foram reunidos em ZIP.`};
  }

  async function downloadPdfOutputs(outputs, zipBaseName) {
    if(outputs.length===1){downloadBytes(outputs[0].bytes,outputs[0].name,'application/pdf');return;}
    if(!window.JSZip) throw new Error('O componente ZIP não carregou.');
    const zip=new JSZip(); outputs.forEach(item=>zip.file(item.name,item.bytes));
    downloadBlob(await zip.generateAsync({type:'blob'}),`${zipBaseName}.zip`);
  }

  function cleanPdfMetadata(doc) {
    if($('#metaTitle')?.checked ?? true){doc.setTitle('');doc.setSubject('');}
    if($('#metaAuthor')?.checked ?? true) doc.setAuthor('');
    if($('#metaKeywords')?.checked ?? true) doc.setKeywords([]);
    if($('#metaSoftware')?.checked ?? true){doc.setCreator('');doc.setProducer('');}
  }

  function canvasToBlob(canvas,mime,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar a imagem.')),mime,quality));}
  function mmToPoints(mm){return mm*72/25.4;}

  function hexToRgb(value) {
    const color = AdvancedPlanner.normalizeHexColor(value, '#000000').slice(1);
    return { r: parseInt(color.slice(0,2),16)/255, g: parseInt(color.slice(2,4),16)/255, b: parseInt(color.slice(4,6),16)/255 };
  }

  function positionPoint(position,width,height,itemWidth,itemHeight,margin=24) {
    let x=(width-itemWidth)/2,y=(height-itemHeight)/2;
    if(position.includes('left')) x=margin; if(position.includes('right')) x=width-itemWidth-margin;
    if(position.startsWith('top')) y=height-itemHeight-margin; if(position.startsWith('bottom')) y=margin;
    return {x,y};
  }

  function watermarkTilePoints(width,height,itemWidth,itemHeight) {
    const gapX=Math.max(35,itemWidth*.45), gapY=Math.max(35,itemHeight*2.8); const points=[];
    for(let y=20;y<height;y+=itemHeight+gapY){for(let x=-itemWidth*.25;x<width;x+=itemWidth+gapX)points.push({x,y});}
    return points;
  }

  function resolveAlternatingPosition(position,pageIndex) {
    if(position==='outer-bottom') return pageIndex%2===0?'bottom-right':'bottom-left';
    if(position==='inner-bottom') return pageIndex%2===0?'bottom-left':'bottom-right';
    return position;
  }

  function grayscaleCanvas(canvas) {
    const context=canvas.getContext('2d'); const image=context.getImageData(0,0,canvas.width,canvas.height); const data=image.data;
    for(let index=0;index<data.length;index+=4){const value=Math.round(data[index]*.299+data[index+1]*.587+data[index+2]*.114);data[index]=data[index+1]=data[index+2]=value;}
    context.putImageData(image,0,0);
  }

  function parsePages(text, pageCount) {
    if (!text.trim()) throw new Error('Informe as páginas. Exemplo: 1-3,5.');
    const result = [], seen = new Set();
    for (const token of text.split(',')) {
      const part = token.trim(); if (!part) continue;
      let numbers;
      if (part.includes('-')) {
        const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) throw new Error(`Intervalo inválido: ${part}`);
        const start = Number(match[1]), end = Number(match[2]);
        if (start > end) throw new Error(`Intervalo invertido: ${part}`);
        numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      } else {
        if (!/^\d+$/.test(part)) throw new Error(`Página inválida: ${part}`);
        numbers = [Number(part)];
      }
      numbers.forEach(number => {
        if (number < 1 || number > pageCount) throw new Error(`A página ${number} não existe. O PDF possui ${pageCount} página(s).`);
        const index = number - 1;
        if (!seen.has(index)) { seen.add(index); result.push(index); }
      });
    }
    if (!result.length) throw new Error('Nenhuma página válida foi informada.');
    return result;
  }

  async function normalizeImage(file, fallbackMime, quality) {
    if (file.type === 'image/jpeg' || file.type === 'image/png') return { bytes: await file.arrayBuffer(), mime: file.type };
    const blob = await resizeImage(file, 5000, 5000, fallbackMime, quality);
    return { bytes: await blob.arrayBuffer(), mime: fallbackMime };
  }

  async function resizeImage(file, maxWidth, maxHeight, format, quality) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: format !== 'image/jpeg' });
    if (format === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); }
    context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao converter a imagem.')), format, quality));
  }

  function readablePdfError(error) {
    const message = error?.message || String(error || 'Não foi possível concluir a operação.');
    if (/encrypted|password/i.test(message)) return 'Este PDF possui senha ou criptografia não suportada nesta versão.';
    if (/invalid pdf|failed to parse|no pdf header/i.test(message)) return 'O arquivo não parece ser um PDF válido ou está danificado.';
    if (/detached ArrayBuffer/i.test(message)) return 'O arquivo perdeu o buffer de leitura durante o processamento. Tente novamente pela abertura com servidor local.';
    if (/worker is being destroyed|importScripts|blob:null/i.test(message)) return 'O Worker de PDF falhou. Abra pelo ABRIR_CENTRAL_PDF.bat e execute PREPARAR_OFFLINE.bat se necessário.';
    if (/out of memory|allocation failed|memory/i.test(message)) return 'O navegador ficou sem memória. Processe menos arquivos ou use uma qualidade ou resolução menor.';
    return message;
  }

  function setProgress(value) {
    if (window.CentralPDFFoundation?.isCancellationRequested?.() && value !== null) throw new Error('Operação cancelada pelo usuário.');
    if (value === null) {
      progressTrack.classList.add('hidden'); progressBar.style.width = '0%';
      window.dispatchEvent(new CustomEvent('centralpdf-progress', { detail: 0 }));
      return;
    }
    const normalized = clamp(value, 0, 100);
    progressTrack.classList.remove('hidden'); progressBar.style.width = `${normalized}%`;
    window.dispatchEvent(new CustomEvent('centralpdf-progress', { detail: normalized }));
  }

  function downloadBytes(bytes, filename, type) { downloadBlob(new Blob([bytes], { type }), filename); }
  function downloadBlob(blob, filename) {
    const held = Boolean(window.CentralPDFExperience?.shouldHoldResult?.());
    let url = '';
    if (!held) {
      url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
    }
    const resultDetail = {
      filename, size: blob.size, type: blob.type, blob, held,
      tool: state.tool, toolTitle: toolConfig[state.tool]?.title || state.tool,
      inputCount: state.files.length,
      inputSize: state.files.reduce((sum, file) => sum + Number(file?.size || 0), 0)
    };
    window.dispatchEvent(new CustomEvent('centralpdf-result', { detail: resultDetail }));
    if (url) setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
  function baseName(name) { return name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '_'); }
  function formatBytes(bytes) { if (!bytes) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function setStatus(message, type = '') {
    statusBox.textContent = message;
    statusBox.className = `status-box${type ? ` ${type}` : ''}`;
    window.dispatchEvent(new CustomEvent('centralpdf-status', { detail: { message, type } }));
  }

  function projectFileId(file, index = 0) {
    const key = getFileCacheKey(file);
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `file-${Math.abs(hash >>> 0).toString(16)}-${index}`;
  }

  function collectSettingsValues() {
    const values = {};
    settingsContent.querySelectorAll('input,select,textarea').forEach(element => {
      if (!element.id || ['file', 'password'].includes(element.type)) return;
      if (element.type === 'radio') {
        if (element.checked) values[element.name || element.id] = element.value;
      } else if (element.type === 'checkbox') values[element.id] = Boolean(element.checked);
      else values[element.id] = element.value;
    });
    return values;
  }

  function applySettingsValues(values = {}) {
    for (const [id, value] of Object.entries(values)) {
      let element = document.getElementById(id);
      if (!element) {
        element = settingsContent.querySelector(`input[type="radio"][name="${CSS.escape(id)}"][value="${CSS.escape(String(value))}"]`);
      }
      if (!element) continue;
      if (element.type === 'checkbox' || element.type === 'radio') element.checked = Boolean(element.type === 'radio' ? element.value === value : value);
      else element.value = value;
      element.dispatchEvent(new Event(element.tagName === 'SELECT' || ['checkbox','radio'].includes(element.type) ? 'change' : 'input', { bubbles: true }));
    }
  }

  async function exportProjectState() {
    const fileRecords = [];
    const byObject = new Map();
    const registerFile = (file, hint = '') => {
      if (!(file instanceof File)) return null;
      if (byObject.has(file)) return byObject.get(file);
      const id = hint || projectFileId(file, fileRecords.length);
      byObject.set(file, id);
      fileRecords.push({ id, file });
      return id;
    };
    const snapshot = {
      tool: state.tool,
      settings: collectSettingsValues(),
      files: state.files.map((file, index) => registerFile(file, projectFileId(file, index))),
      savedAt: new Date().toISOString(),
      organizer: null,
      editor: null,
      forms: null,
      signatures: null
    };
    if (['organize', 'merge'].includes(state.tool) && state.organizerPages.length) {
      const sources = [];
      for (const [sourceKey, source] of state.organizerSources.entries()) {
        const fileId = source.file ? registerFile(source.file, `source-${sourceKey}`) : null;
        sources.push({ sourceKey, kind: source.kind, fileId, name: source.name || source.file?.name || '', fileKey: source.fileKey || '', pageCount: source.pageCount || 0 });
      }
      const cleanPage = page => {
        const copy = { ...page };
        delete copy.sourceFile;
        const source = state.organizerSources.get(page.sourceKey);
        copy.sourceFileId = source?.file ? registerFile(source.file, `source-${page.sourceKey}`) : null;
        return copy;
      };
      snapshot.organizer = {
        sources,
        pages: state.organizerPages.map(cleanPage),
        originalPages: state.originalOrganizerPages.map(cleanPage),
        pageIdSeq: state.organizerPageIdSeq,
        sourceSeq: state.organizerSourceSeq
      };
    }
    if (state.tool === 'editPdf' && window.PDFVisualEditor?.exportProjectState) {
      const editor = window.PDFVisualEditor.exportProjectState();
      for (const source of editor.sources || []) source.fileId = registerFile(source.file, `editor-${source.id}`);
      snapshot.editor = { ...editor, sources: (editor.sources || []).map(source => ({ id: source.id, name: source.name, fileId: source.fileId })) };
    }
    if (state.tool === 'formBuilder' && window.CentralPDFForms?.exportProjectState) snapshot.forms = window.CentralPDFForms.exportProjectState();
    if (state.tool === 'signPdf' && window.CentralPDFSignatures?.exportProjectState) snapshot.signatures = window.CentralPDFSignatures.exportProjectState();
    if (!fileRecords.length && !snapshot.editor && !snapshot.organizer && !snapshot.forms && !snapshot.signatures) return null;
    return { snapshot, files: fileRecords };
  }

  async function importProjectState(snapshot, filesById) {
    if (!snapshot?.tool || !toolConfig[snapshot.tool]) throw new Error('A ferramenta registrada no projeto não existe nesta versão.');
    selectTool(snapshot.tool);
    const projectFiles = (snapshot.files || []).map(id => filesById.get(id)).filter(Boolean);
    if (snapshot.tool === 'editPdf' && snapshot.editor && window.PDFVisualEditor?.restoreProjectState) {
      state.files = projectFiles;
      renderFiles();
      await window.PDFVisualEditor.restoreProjectState(snapshot.editor, filesById);
      processButton.disabled = !window.PDFVisualEditor.hasDocument();
      updateSteps(2);
    } else if (['organize', 'merge'].includes(snapshot.tool) && snapshot.organizer) {
      state.files = projectFiles;
      resetOrganizer();
      for (const source of snapshot.organizer.sources || []) {
        const file = source.fileId ? filesById.get(source.fileId) : null;
        state.organizerSources.set(source.sourceKey, { ...source, file, fileKey: source.fileKey || (file ? getFileCacheKey(file) : '') });
      }
      const restorePage = page => {
        const source = state.organizerSources.get(page.sourceKey);
        return { ...page, sourceFile: source?.file || (page.sourceFileId ? filesById.get(page.sourceFileId) : null), sourceFileKey: source?.fileKey || '' };
      };
      state.organizerPages = (snapshot.organizer.pages || []).map(restorePage);
      state.originalOrganizerPages = (snapshot.organizer.originalPages || snapshot.organizer.pages || []).map(restorePage);
      state.organizerPageIdSeq = Number(snapshot.organizer.pageIdSeq || state.organizerPages.length);
      state.organizerSourceSeq = Number(snapshot.organizer.sourceSeq || state.organizerSources.size);
      renderFiles();
      await renderOrganizerPreviews();
      updateOrganizerModeUI();
      if (snapshot.tool === 'merge') updateMergePreview();
      processButton.disabled = snapshot.tool === 'merge' ? mergePdfSources().length < 2 || !state.organizerPages.length : !state.organizerPages.length;
      updateSteps(2);
    } else if (snapshot.tool === 'formBuilder' && snapshot.forms) {
      await addFiles(projectFiles, { source: 'project' });
      await window.CentralPDFForms?.restoreProjectState?.(snapshot.forms);
      processButton.disabled = !projectFiles.length;
      updateSteps(2);
    } else if (snapshot.tool === 'signPdf' && snapshot.signatures) {
      await addFiles(projectFiles, { source: 'project' });
      await window.CentralPDFSignatures?.restoreProjectState?.(snapshot.signatures);
      processButton.disabled = !projectFiles.length;
      updateSteps(2);
    } else {
      await addFiles(projectFiles, { source: 'project' });
    }
    applySettingsValues(snapshot.settings || {});
    syncOutputName();
    setStatus('Projeto restaurado. Confira os arquivos e as configurações antes de exportar.', 'success');
    window.CentralPDFFoundation?.scheduleRecovery?.();
  }

  function getRecoverySummary() {
    const editorSummary = window.PDFVisualEditor?.getProjectSummary?.() || {};
    const customPageCount = state.tool === 'formBuilder' ? new Set(window.CentralPDFForms?.getFields?.().map(item => item.page) || []).size : state.tool === 'signPdf' ? new Set(window.CentralPDFSignatures?.getItems?.().map(item => item.page) || []).size : 0;
    const pageCount = ['organize','merge'].includes(state.tool) ? state.organizerPages.length : state.tool === 'editPdf' ? Number(editorSummary.pageCount || 0) : customPageCount || Number(state.toolPageCount || state.filePageCounts.get(state.files[0] ? getFileCacheKey(state.files[0]) : '') || 0);
    return {
      tool: state.tool,
      toolTitle: toolConfig[state.tool]?.title || state.tool,
      fileCount: state.files.length,
      pageCount,
      outputName: $('#outputFileName')?.value || '',
      settings: collectSettingsValues(),
      organizerSignature: ['organize','merge'].includes(state.tool) ? state.organizerPages.map(page => `${page.id}:${page.sourceKey}:${page.sourceIndex}:${page.rotation}`).join('|') : '',
      editorSignature: editorSummary.signature || '',
      formSignature: state.tool === 'formBuilder' ? JSON.stringify(window.CentralPDFForms?.getFields?.() || []) : '',
      signatureSignature: state.tool === 'signPdf' ? JSON.stringify(window.CentralPDFSignatures?.getItems?.() || []) : ''
    };
  }

  window.CentralPDFApp = {
    processCurrentTool, exportProjectState, importProjectState,
    getActiveTool: () => state.tool,
    getFiles: () => Array.from(state.files),
    getActiveToolTitle: () => toolConfig[state.tool]?.title || state.tool,
    getProjectName: () => $('#outputFileName')?.value || toolConfig[state.tool]?.outputBase || 'Projeto_CentralPDF',
    hasProject: () => Boolean(state.files.length || state.organizerPages.length || window.PDFVisualEditor?.hasDocument?.()),
    getRecoverySummary, clearAll, selectTool,
    openFilesInTool: async (files, tool) => { if (!toolConfig[tool]) throw new Error('Ferramenta de destino não encontrada.'); selectTool(tool); await addFiles(Array.from(files || []), { source: 'result' }); },
    getSettings: () => collectSettingsValues(),
    applySettings: values => applySettingsValues(values || {}),
    getOutputName: () => $('#outputFileName')?.value || '',
    setOutputName: value => { const input=$('#outputFileName'); if(!input) return false; input.value=String(value||''); state.outputNameTouched=true; input.dispatchEvent(new Event('input',{bubbles:true})); return true; },
    getToolCatalog: () => Object.fromEntries(Object.entries(toolConfig).map(([key,value]) => [key,{key,title:value.title,description:value.description,accept:value.accept,multiple:Boolean(value.multiple),typeLabel:value.typeLabel}])),
    getToolCapabilities: () => {
      const handlers = getToolHandlers();
      return Object.fromEntries(Object.entries(toolConfig).map(([key,value]) => [key,{
        key,
        handler: typeof handlers[key] === 'function',
        outputExt: value.outputExt || '',
        outputBase: value.outputBase || '',
        professional: Boolean(value.professional),
        settingsLength: String(value.settings || '').length,
        settingIds: Array.from(String(value.settings || '').matchAll(/\bid=["']([^"']+)["']/g), match => match[1])
      }]));
    },
    getProfessionalEngineStatus: () => ({ ready: Boolean(state.libPdfEngine), loading: Boolean(state.libPdfEnginePromise) })
  };

  initializeHome();
})();
