(() => {
  'use strict';

  const UX = {
    organize: {
      category: 'Organizar', complexity: 'Editor visual', input: '1 PDF', capability: 'Reordenar, girar e inserir', output: 'PDF reorganizado',
      steps: ['Adicione o PDF que será organizado.', 'Use as miniaturas para mover, girar, duplicar, excluir ou inserir páginas.', 'Revise a ordem e salve uma nova cópia.'],
      tip: 'Selecione várias páginas para aplicar ações em lote sem repetir o mesmo comando.',
      attention: 'Páginas importadas de outros PDFs e imagens passam a fazer parte da nova cópia. Confira a ordem antes de exportar.',
      inspectorTitle: 'Opções do organizador', inspectorDescription: 'Ações de página ficam nas miniaturas; aqui permanecem apenas opções do documento.',
      dropSubtitle: 'Arraste um PDF ou clique para abrir o editor de páginas.', badges: ['1 arquivo', 'Visual', 'Páginas']
    },
    editPdf: {
      category: 'Editar', complexity: 'Editor avançado', input: '1 PDF', capability: 'Texto, imagem e desenho', output: 'PDF editado',
      steps: ['Adicione o PDF e escolha uma página na faixa de miniaturas.', 'Selecione Texto, Imagem, Pincel, Marcador, Cobrir ou Recortar.', 'Ajuste o objeto no painel lateral e exporte a nova cópia.'],
      tip: 'Clique no objeto para editar suas propriedades. Use Ctrl + Z para desfazer a última ação.',
      attention: 'A ferramenta Cobrir oculta visualmente, mas não elimina o conteúdo interno. Não use como redação segura de dados sensíveis.',
      inspectorTitle: 'Propriedades e ferramentas', inspectorDescription: 'O painel muda conforme o objeto ou ferramenta selecionada.',
      dropSubtitle: 'Abra um PDF para editar visualmente cada página.', badges: ['1 arquivo', 'Canvas', 'Avançado']
    },
    merge: {
      category: 'Organizar', complexity: 'Compositor único', input: '2 ou mais PDFs', capability: 'Organizar páginas juntas', output: '1 PDF unificado',
      steps: ['Adicione dois ou mais PDFs.', 'Organize todas as páginas na mesma grade: arraste, gire, duplique ou exclua.', 'Confira a sequência visual e exporte o PDF final.'],
      tip: 'A grade central já é a prévia final. Não existe uma segunda ordem por arquivo.',
      attention: 'A sequência das miniaturas é a sequência exata do PDF exportado. Remover um documento no painel elimina todas as páginas restantes daquela origem.',
      inspectorTitle: 'Resumo da união', inspectorDescription: 'Confira os documentos de origem, preserve metadados e escolha o nome final.',
      dropSubtitle: 'Arraste dois ou mais PDFs. Todas as páginas entrarão no mesmo organizador.', badges: ['Vários PDFs', 'Uma grade', '1 saída']
    },
    split: {
      category: 'Organizar', complexity: '6 modos', input: '1 PDF', capability: 'Criar partes por regra', output: 'PDFs ou ZIP',
      steps: ['Adicione o PDF e aguarde a contagem de páginas.', 'Escolha o modo de divisão e informe intervalos, cortes ou quantidade.', 'Confira a lista de arquivos prevista antes de processar.'],
      tip: 'Use ponto e vírgula para criar grupos separados, como 1-3;4-6;7-10.',
      attention: 'Verifique se todas as páginas necessárias aparecem na prévia. Páginas omitidas podem ficar fora do resultado.',
      inspectorTitle: 'Plano de divisão', inspectorDescription: 'Escolha um modo e confirme exatamente quais arquivos serão gerados.',
      dropSubtitle: 'Abra um PDF para calcular e visualizar o plano de divisão.', badges: ['1 PDF', '6 modos', 'Prévia']
    },
    extract: {
      category: 'Organizar', complexity: 'Seleção avançada', input: '1 PDF', capability: 'Extrair ou remover páginas', output: 'PDF ou ZIP',
      steps: ['Adicione o documento.', 'Escolha entre extrair, remover, pares, ímpares ou grupos.', 'Informe as páginas e confira o plano antes de baixar.'],
      tip: 'A ordem informada pode ser personalizada, por exemplo 5,1-3,8.',
      attention: 'No modo remover, as páginas informadas serão excluídas da nova cópia, não extraídas.',
      inspectorTitle: 'Seleção de páginas', inspectorDescription: 'Defina o modo e os intervalos que formarão o resultado.',
      dropSubtitle: 'Adicione um PDF para selecionar, remover ou separar páginas.', badges: ['1 PDF', 'Intervalos', 'Grupos']
    },
    rotate: {
      category: 'Editar', complexity: 'Processamento em lote', input: '1 ou mais PDFs', capability: 'Corrigir orientação', output: 'PDFs girados',
      steps: ['Adicione um ou vários PDFs.', 'Escolha o ângulo e quais páginas serão afetadas.', 'Defina se a rotação será somada ou substituída e processe.'],
      tip: 'Use “somente retrato” ou “somente paisagem” para corrigir documentos mistos.',
      attention: 'Definir exatamente 0° remove a rotação registrada, mas não altera conteúdo desenhado de lado dentro da página.',
      inspectorTitle: 'Orientação das páginas', inspectorDescription: 'Escolha o alcance e o comportamento da rotação.',
      dropSubtitle: 'Adicione PDFs para corrigir a orientação em lote.', badges: ['Lote', 'Filtros', '90°/180°']
    },
    watermark: {
      category: 'Editar', complexity: 'Texto ou imagem', input: '1 ou mais PDFs', capability: 'Aplicar identificação visual', output: 'PDFs marcados',
      steps: ['Adicione os PDFs.', 'Escolha texto ou imagem, posição, transparência e páginas.', 'Revise a legibilidade e aplique em lote.'],
      tip: 'Use transparência baixa para manter o documento legível e repetição para cobrir toda a página.',
      attention: 'A marca-d’água passa a integrar a nova cópia. Teste tamanho e contraste em um documento pequeno.',
      inspectorTitle: 'Aparência da marca', inspectorDescription: 'Configure conteúdo, posição, repetição e alcance.',
      dropSubtitle: 'Adicione PDFs para aplicar texto ou logotipo.', badges: ['Lote', 'Texto/Imagem', 'Transparência']
    },
    pageNumbers: {
      category: 'Editar', complexity: 'Formatação avançada', input: '1 ou mais PDFs', capability: 'Numerar com regras', output: 'PDFs numerados',
      steps: ['Adicione os documentos.', 'Escolha formato, posição, início e páginas incluídas.', 'Confira capa, sumário e impressão frente e verso antes de gerar.'],
      tip: 'Use {n}, {total} e {page} para montar um formato personalizado.',
      attention: 'Ao ignorar páginas iniciais, confirme se o total deve considerar o documento inteiro ou apenas as páginas numeradas.',
      inspectorTitle: 'Formato da numeração', inspectorDescription: 'Defina texto, sequência, posição e páginas alcançadas.',
      dropSubtitle: 'Adicione PDFs para criar numeração personalizada.', badges: ['Lote', 'Variáveis', 'Frente/verso']
    },
    imagesToPdf: {
      category: 'Converter', complexity: 'Layout configurável', input: '1 ou mais imagens', capability: 'Montar páginas', output: 'PDF ou ZIP',
      steps: ['Adicione JPG, PNG ou WEBP.', 'Ordene as imagens e escolha tamanho, orientação, margem e encaixe.', 'Gere um único PDF ou arquivos separados.'],
      tip: 'Use “encaixar sem cortar” para preservar toda a imagem.',
      attention: 'O modo preencher pode cortar bordas. Confira imagens com textos próximos às extremidades.',
      inspectorTitle: 'Layout das páginas', inspectorDescription: 'Defina formato do papel, margens, fundo e encaixe.',
      dropSubtitle: 'Adicione imagens e arraste as capas para definir a ordem.', badges: ['Imagens', 'A4/Carta', 'Layout']
    },
    imageConvert: {
      category: 'Converter', complexity: 'Processamento em lote', input: '1 ou mais imagens', capability: 'Converter e redimensionar', output: 'Imagem ou ZIP',
      steps: ['Adicione as imagens.', 'Escolha formato, dimensões máximas e qualidade.', 'Converta e baixe individualmente ou em ZIP.'],
      tip: 'O sistema mantém a proporção e não amplia imagens menores que o limite.',
      attention: 'JPG remove transparência. Para preservar fundo transparente, escolha PNG ou WEBP.',
      inspectorTitle: 'Formato e dimensões', inspectorDescription: 'Controle formato, tamanho máximo e qualidade da saída.',
      dropSubtitle: 'Adicione imagens para converter várias de uma vez.', badges: ['Lote', 'JPG/PNG/WEBP', 'Redimensionar']
    },
    compress: {
      category: 'Converter', complexity: '4 perfis', input: '1 ou mais PDFs', capability: 'Reduzir tamanho', output: 'PDFs compactados',
      steps: ['Adicione os PDFs.', 'Escolha estrutural, recomendada, extrema ou personalizada.', 'Compare tamanho original e resultado no relatório.'],
      tip: 'Comece pelo perfil recomendado e use o extremo apenas quando tamanho for mais importante que fidelidade.',
      attention: 'Modos rasterizados podem remover texto selecionável, links, formulários e validade de assinaturas.',
      inspectorTitle: 'Perfil de compressão', inspectorDescription: 'Equilibre qualidade, tamanho e preservação de recursos.',
      dropSubtitle: 'Adicione PDFs para comparar o tamanho antes e depois.', badges: ['Lote', '4 perfis', 'Relatório']
    },
    pdfToImage: {
      category: 'Converter', complexity: 'Exportação visual', input: '1 ou mais PDFs', capability: 'Renderizar páginas', output: 'JPG, PNG ou WEBP',
      steps: ['Adicione os PDFs.', 'Escolha formato, resolução, páginas e qualidade.', 'Gere imagens individuais ou uma folha de contato.'],
      tip: '150 DPI atende visualização comum; 300 DPI é melhor para impressão, mas gera arquivos maiores.',
      attention: 'A conversão transforma cada página em imagem e não preserva texto selecionável.',
      inspectorTitle: 'Qualidade das imagens', inspectorDescription: 'Escolha formato, DPI, páginas e organização do resultado.',
      dropSubtitle: 'Adicione PDFs para converter páginas em imagens.', badges: ['Lote', 'Até 300 DPI', 'Folha de contato']
    },
    crop: {
      category: 'Editar', complexity: 'Recorte preciso', input: '1 ou mais PDFs', capability: 'Redefinir área visível', output: 'PDFs recortados',
      steps: ['Adicione os PDFs.', 'Escolha margens, percentual, área central ou remoção de cabeçalho/rodapé.', 'Defina páginas e comportamento do recorte.'],
      tip: 'Use reconstrução somente quando precisar eliminar a área externa visualmente da nova página.',
      attention: 'Recorte visual pode manter conteúdo oculto internamente. Reconstrução pode perder links, anotações e formulários.',
      inspectorTitle: 'Área de recorte', inspectorDescription: 'Defina medidas, páginas e o comportamento da nova página.',
      dropSubtitle: 'Adicione PDFs para ajustar margens ou manter apenas uma área.', badges: ['Lote', 'mm/%', 'Área central']
    },
    metadata: {
      category: 'Privacidade', complexity: 'Ação rápida', input: '1 ou mais PDFs', capability: 'Remover identificação técnica', output: 'PDFs limpos',
      steps: ['Adicione os PDFs.', 'Revise quais campos serão removidos.', 'Gere novas cópias e confirme os metadados no diagnóstico.'],
      tip: 'Use Diagnosticar PDF depois para conferir os campos remanescentes.',
      attention: 'Limpar metadados não remove textos, imagens ou informações visíveis nas páginas.',
      inspectorTitle: 'Campos a remover', inspectorDescription: 'Escolha quais informações descritivas serão apagadas.',
      dropSubtitle: 'Adicione PDFs para remover autor, título e outros metadados.', badges: ['Lote', 'Privacidade', 'Rápido']
    },
    normalize: {
      category: 'Otimizar', complexity: 'Compatibilidade', input: '1 ou mais PDFs', capability: 'Regravar estrutura', output: 'PDFs normalizados',
      steps: ['Adicione os arquivos com problema de compatibilidade.', 'Escolha se deseja limpar metadados.', 'Abra e compare a nova cópia antes de substituir o documento.'],
      tip: 'Use esta ferramenta para arquivos que abrem em alguns leitores e falham em outros.',
      attention: 'Normalização simples não recupera bytes ausentes nem substitui a ferramenta de recuperação avançada.',
      inspectorTitle: 'Normalização', inspectorDescription: 'Escolha as opções de compatibilidade e limpeza.',
      dropSubtitle: 'Adicione PDFs para regravar a estrutura interna.', badges: ['Lote', 'Compatibilidade', 'Estrutura']
    },
    pdfToText: {
      category: 'Converter', complexity: 'Extração textual', input: '1 ou mais PDFs', capability: 'Extrair camada de texto', output: 'TXT ou ZIP',
      steps: ['Adicione os PDFs.', 'Escolha separação por página e formato do relatório.', 'Baixe o texto extraído.'],
      tip: 'Documentos digitais normalmente extraem melhor que PDFs escaneados.',
      attention: 'PDFs formados apenas por imagens precisam de OCR; esta ferramenta não reconhece texto em fotografia.',
      inspectorTitle: 'Formato do texto', inspectorDescription: 'Defina separação e organização do arquivo TXT.',
      dropSubtitle: 'Adicione PDFs que já possuam texto selecionável.', badges: ['Lote', 'TXT', 'Sem OCR']
    },
    ocr: {
      category: 'Converter', complexity: 'Reconhecimento local', input: 'PDFs ou imagens', capability: 'Criar texto pesquisável', output: 'PDF, TXT ou ZIP',
      steps: ['Adicione PDFs escaneados ou imagens.', 'Escolha idioma, páginas, resolução e melhoria visual.', 'Execute o OCR e revise as páginas de baixa confiança.'],
      tip: 'Use 200 DPI como equilíbrio. Em digitalizações pequenas ou pouco nítidas, experimente 300 DPI e maior contraste.',
      attention: 'OCR não garante fidelidade absoluta. Revise nomes, códigos, valores, datas e documentos manuscritos antes de usar oficialmente.',
      inspectorTitle: 'Reconhecimento e qualidade', inspectorDescription: 'Configure idioma, páginas, pré-processamento e formato do resultado.',
      dropSubtitle: 'Adicione PDFs escaneados ou imagens para reconhecer o texto.', badges: ['Local', 'Português', 'PDF pesquisável']
    },

    pdfToOffice: {
      category: 'Converter', complexity: 'Office local', input: '1 ou mais PDFs', capability: 'Criar DOCX, XLSX ou PPTX', output: 'Arquivos Office',
      steps: ['Adicione os PDFs.', 'Escolha formato, páginas e modo de fidelidade.', 'Revise o aviso de compatibilidade e converta.'],
      tip: 'Use Word em modo texto para edição, ou modo imagem para preservar melhor a aparência.',
      attention: 'Conversão editável simplifica layouts complexos. PowerPoint preserva cada página visualmente como um slide.',
      inspectorTitle: 'Formato e fidelidade', inspectorDescription: 'Escolha Word, Excel ou PowerPoint e defina as páginas.',
      dropSubtitle: 'Adicione PDFs para converter localmente para formatos Office.', badges: ['DOCX/XLSX/PPTX', 'Local', 'Páginas']
    },
    documentsToPdf: {
      category: 'Converter', complexity: 'Documentos e imagens', input: 'Office, HTML, texto ou imagens', capability: 'Criar PDFs limpos', output: 'PDF ou ZIP',
      steps: ['Adicione DOCX, XLSX, PPTX, HTML, TXT, CSV, Markdown ou imagens.', 'Escolha papel, tamanho de texto e combinação.', 'Gere e confira a nova cópia em PDF.'],
      tip: 'Arquivos Office são convertidos pela estrutura textual interna; para fidelidade visual absoluta, exporte pelo aplicativo Office original.',
      attention: 'Gráficos, fórmulas, caixas flutuantes e layouts avançados podem ser simplificados.',
      inspectorTitle: 'Conversão para PDF', inspectorDescription: 'Defina papel, tamanho e combinação dos arquivos.',
      dropSubtitle: 'Arraste documentos Office, texto, HTML, HEIC, TIFF ou imagens.', badges: ['Office', 'HEIC/TIFF', 'Local']
    },
    extractImages: {
      category: 'Converter', complexity: 'Extração técnica', input: '1 ou mais PDFs', capability: 'Recuperar imagens internas', output: 'ZIP com manifesto',
      steps: ['Adicione os PDFs.', 'Escolha imagens internas, páginas completas ou ambas.', 'Ajuste filtros e exporte o ZIP.'],
      tip: 'Aumente as dimensões mínimas para ignorar ícones e pequenas máscaras.',
      attention: 'Alguns PDFs usam vetores ou imagens divididas em blocos. Use páginas completas quando a extração interna não representar o conteúdo esperado.',
      inspectorTitle: 'Imagens e filtros', inspectorDescription: 'Defina formato, dimensões mínimas, páginas e DPI.',
      dropSubtitle: 'Adicione PDFs para recuperar figuras, fotos e páginas completas.', badges: ['Imagens internas', 'Manifesto', 'ZIP']
    },
    archivePdf: {
      category: 'Organizar', complexity: 'Preservação e auditoria', input: '1 ou mais PDFs', capability: 'Normalizar e registrar hashes', output: 'PDF ou pacote ZIP',
      steps: ['Adicione os PDFs.', 'Escolha normalização ou reconstrução visual.', 'Gere a cópia e arquive o manifesto com os hashes.'],
      tip: 'Use normalização para preservar texto e links; use reconstrução visual quando a aparência for mais importante que recursos interativos.',
      attention: 'A ferramenta não certifica conformidade PDF/A. O manifesto é uma evidência técnica local, não uma certificação ISO.',
      inspectorTitle: 'Estratégia de arquivamento', inspectorDescription: 'Escolha preservação estrutural, rasterização, metadados e manifesto.',
      dropSubtitle: 'Adicione PDFs para criar cópias normalizadas e verificáveis.', badges: ['SHA-256', 'Manifesto', 'Não certificado']
    },
    documentAssistant: {
      category: 'Inteligência documental', complexity: 'Análise explicável', input: '1 ou mais PDFs', capability: 'Resumir e responder com evidências', output: 'Relatório ZIP',
      steps: ['Adicione PDFs que possuam texto selecionável.', 'Informe uma pergunta ou escolha o foco da análise.', 'Abra o relatório e confira as evidências nas páginas indicadas.'],
      tip: 'Execute OCR antes quando o documento for digitalizado ou a análise indicar pouco texto selecionável.',
      attention: 'As respostas são extrativas e assistivas. Não substituem leitura jurídica, contábil, clínica ou administrativa.',
      inspectorTitle: 'Pergunta e foco da análise', inspectorDescription: 'Defina resumo, evidências, seções e dados que devem ser localizados.',
      dropSubtitle: 'Adicione PDFs para resumir, pesquisar e localizar evidências.', badges: ['Local', 'Evidências', 'Sem envio']
    },
    structuredExtraction: {
      category: 'Inteligência documental', complexity: 'Dados estruturados', input: '1 ou mais PDFs', capability: 'Extrair padrões por página', output: 'CSV, JSON e HTML',
      steps: ['Adicione os documentos.', 'Escolha o perfil e, se necessário, uma expressão personalizada.', 'Revise o CSV e confirme as ocorrências nas páginas originais.'],
      tip: 'O CSV pode ser aberto diretamente no Excel e mantém arquivo, página, tipo e valor.',
      attention: 'A extração identifica formatos de texto; ela não garante validade matemática de CPF/CNPJ nem contexto contábil.',
      inspectorTitle: 'Perfil e campos extraídos', inspectorDescription: 'Configure os padrões e o formato do pacote de saída.',
      dropSubtitle: 'Adicione PDFs para transformar informações em dados estruturados.', badges: ['CSV/JSON', 'Por página', 'Lote']
    },
    documentAudit: {
      category: 'Inteligência documental', complexity: 'Cruzamento de regras', input: '1 ou mais PDFs relacionados', capability: 'Sinalizar divergências e riscos', output: 'Relatório de auditoria',
      steps: ['Adicione contrato, aditivo, nota, medição ou certidões relacionadas.', 'Escolha as regras e informe datas opcionais.', 'Revise os achados por severidade e abra as fontes originais.'],
      tip: 'No perfil de compras, informe lançamento e pagamento para aplicar a regra de vencimento em oito dias e validar certidões.',
      attention: 'Um achado é um indício automático. Valores iguais ou diferentes podem pertencer a contextos distintos.',
      inspectorTitle: 'Regras de auditoria', inspectorDescription: 'Selecione os cruzamentos de CNPJ, códigos, valores, datas e certidões.',
      dropSubtitle: 'Adicione documentos relacionados para cruzar as informações.', badges: ['Regras locais', 'Severidade', 'Evidências']
    },
    classifyRename: {
      category: 'Inteligência documental', complexity: 'Organização em lote', input: '1 ou mais PDFs', capability: 'Classificar e sugerir nomes', output: 'ZIP e relatório',
      steps: ['Adicione os PDFs.', 'Defina o modelo do nome e as verificações de páginas.', 'Confira o relatório antes de usar as cópias renomeadas.'],
      tip: 'Use {tipo}, {data}, {numero}, {cnpj} e {original} para padronizar os nomes.',
      attention: 'Páginas sem texto podem ser digitalizações, não páginas vazias. Sempre revise os apontamentos.',
      inspectorTitle: 'Padrão de organização', inspectorDescription: 'Configure o nome e a detecção de páginas vazias ou duplicadas.',
      dropSubtitle: 'Adicione PDFs para classificar e organizar em lote.', badges: ['Renomear', 'Duplicadas', 'Lote']
    },
    compare: {
      category: 'Segurança e auditoria', complexity: 'Texto e imagem', input: 'Exatamente 2 PDFs', capability: 'Detectar alterações', output: 'Relatório ZIP',
      steps: ['Adicione o documento original e a versão revisada.', 'Escolha comparação textual, visual ou híbrida e ajuste a sensibilidade.', 'Abra o relatório HTML e confira todas as páginas sinalizadas.'],
      tip: 'Use o modo híbrido para contratos e relatórios; ele combina a camada de texto com a aparência renderizada.',
      attention: 'Diferenças apontadas precisam de revisão humana. Cabeçalhos, digitalizações e pequenas mudanças de renderização podem gerar alertas.',
      inspectorTitle: 'Critérios de comparação', inspectorDescription: 'Defina páginas, sensibilidade e conteúdo do relatório.', dropSubtitle: 'Arraste exatamente dois PDFs: original e revisado.', badges: ['2 PDFs', 'Texto + visual', 'Relatório']
    },
    redact: {
      category: 'Segurança e auditoria', complexity: 'Remoção irreversível', input: '1 PDF', capability: 'Eliminar conteúdo sensível', output: 'PDF censurado + relatório',
      steps: ['Adicione o PDF e abra as páginas no editor de censura.', 'Arraste caixas ou localize textos para marcar as informações sensíveis.', 'Revise todas as marcações e exporte uma nova cópia reconstruída.'],
      tip: 'Use a busca para localizar nomes, CPF, CNPJ e valores, mas confira visualmente cada ocorrência antes de exportar.',
      attention: 'As páginas censuradas são transformadas em imagem. Links, formulários e assinaturas digitais dessas páginas deixam de existir.',
      inspectorTitle: 'Censura e sanitização', inspectorDescription: 'Localize dados, escolha qualidade e configure o relatório.', dropSubtitle: 'Adicione um PDF para marcar áreas sensíveis página por página.', badges: ['Definitiva', 'Visual', 'Auditoria']
    },
    formBuilder: {
      category: 'Editar', complexity: 'Designer visual', input: '1 PDF', capability: 'Criar campos preenchíveis', output: 'PDF com formulário',
      steps: ['Adicione o PDF e escolha uma página.', 'Configure o tipo de campo e arraste sobre a página para posicionar.', 'Revise nomes, opções e obrigatoriedade antes de exportar.'],
      tip: 'Use nomes internos únicos e copie campos repetidos para várias páginas com um único comando.',
      attention: 'Leitores de PDF podem tratar máscaras de CPF, CNPJ, data e moeda como campos de texto comuns. Teste o resultado no leitor usado pela empresa.',
      inspectorTitle: 'Propriedades do campo', inspectorDescription: 'Configure tipo, nome, aparência, opções e obrigatoriedade.', dropSubtitle: 'Adicione um PDF para desenhar campos preenchíveis página por página.', badges: ['Visual', 'AcroForm', 'Campos']
    },
    signPdf: {
      category: 'Editar', complexity: 'Assinatura visual', input: '1 PDF', capability: 'Assinar e rubricar', output: 'PDF assinado visualmente',
      steps: ['Adicione o PDF e prepare a assinatura desenhada, digitada ou por imagem.', 'Arraste sobre a página, ajuste tamanho e rotação e escolha as páginas.', 'Revise a posição e exporte uma nova cópia.'],
      tip: 'Use “Rubricar todas” depois de posicionar uma assinatura para criar rubricas pequenas no canto de cada página.',
      attention: 'Esta fase cria uma assinatura visual. Ela não equivale a assinatura digital com certificado ICP-Brasil e não comprova identidade criptograficamente.',
      inspectorTitle: 'Assinatura e aplicação', inspectorDescription: 'Escolha origem, identificação, páginas e aparência.', dropSubtitle: 'Adicione um PDF para posicionar assinaturas e rubricas.', badges: ['Desenhar/Imagem', 'Rubrica', 'Visual']
    },
    protect: {
      category: 'Segurança', complexity: 'Motor experimental', input: '1 ou mais PDFs', capability: 'Criptografar e limitar', output: 'PDFs protegidos',
      steps: ['Adicione os PDFs.', 'Crie a senha de abertura e, opcionalmente, a senha administrativa.', 'Defina permissões e guarde a senha em local seguro.'],
      tip: 'AES-256 é a opção recomendada para novos documentos.',
      attention: 'Não existe recuperação de senha. Restrições de copiar ou imprimir podem não ser respeitadas por todos os leitores.',
      inspectorTitle: 'Senha e permissões', inspectorDescription: 'Configure criptografia e ações permitidas ao leitor.',
      dropSubtitle: 'Adicione PDFs para criar cópias protegidas por senha.', badges: ['Lote', 'AES-256', 'Experimental']
    },
    unlock: {
      category: 'Segurança', complexity: 'Motor experimental', input: 'PDFs protegidos', capability: 'Remover proteção conhecida', output: 'PDFs sem senha',
      steps: ['Adicione os PDFs protegidos.', 'Informe a senha que você conhece e está autorizado a usar.', 'Gere uma nova cópia sem criptografia.'],
      tip: 'Alguns documentos exigem a senha administrativa, não apenas a senha de abertura.',
      attention: 'A ferramenta não descobre nem quebra senhas. Use somente arquivos e credenciais autorizados.',
      inspectorTitle: 'Autenticação', inspectorDescription: 'Informe a senha atual para abrir e regravar o documento.',
      dropSubtitle: 'Adicione PDFs protegidos e informe a senha conhecida.', badges: ['Lote', 'Senha conhecida', 'Experimental']
    },
    diagnose: {
      category: 'Segurança', complexity: 'Análise técnica', input: '1 ou mais PDFs', capability: 'Inspecionar estrutura', output: 'TXT e JSON',
      steps: ['Adicione os PDFs.', 'Informe senha apenas quando necessária.', 'Gere o relatório e revise criptografia, formulários, assinaturas e erros.'],
      tip: 'Use o JSON para arquivar ou comparar diagnósticos automaticamente.',
      attention: 'O diagnóstico não garante validade jurídica de assinaturas nem substitui um validador oficial.',
      inspectorTitle: 'Escopo do diagnóstico', inspectorDescription: 'Defina senha opcional e formato do relatório.',
      dropSubtitle: 'Adicione PDFs para gerar um relatório técnico sem alterá-los.', badges: ['Lote', 'TXT/JSON', 'Leitura']
    },
    repairAdvanced: {
      category: 'Segurança', complexity: 'Recuperação experimental', input: 'PDFs com falha', capability: 'Reconstruir referências', output: 'PDFs recuperados',
      steps: ['Trabalhe sempre com uma cópia do arquivo danificado.', 'Adicione o PDF e informe senha, caso exista.', 'Abra o resultado e compare página por página antes de usar.'],
      tip: 'Execute Diagnosticar PDF antes e depois para comparar a estrutura.',
      attention: 'O motor não recupera conteúdo que não esteja mais presente nos bytes do arquivo.',
      inspectorTitle: 'Tentativa de recuperação', inspectorDescription: 'Configure autenticação e remoção opcional da proteção.',
      dropSubtitle: 'Adicione cópias de PDFs que não abrem ou apresentam erros.', badges: ['Lote', 'Tolerante', 'Experimental']
    },
    flattenForms: {
      category: 'Segurança', complexity: 'Motor experimental', input: 'PDFs com formulário', capability: 'Fixar campos preenchidos', output: 'PDFs estáticos',
      steps: ['Adicione os formulários já preenchidos.', 'Informe senha quando necessária.', 'Gere a cópia e confirme se todos os valores ficaram visíveis.'],
      tip: 'Mantenha o original editável arquivado separadamente.',
      attention: 'Fixar formulários pode afetar assinaturas existentes. Confira o documento final antes de arquivar.',
      inspectorTitle: 'Fixação de campos', inspectorDescription: 'Informe senha opcional e confirme a operação.',
      dropSubtitle: 'Adicione PDFs com campos preenchidos que devem se tornar estáticos.', badges: ['Lote', 'Formulários', 'Experimental']
    }
  };

  let currentTool = 'organize';
  let currentStage = 1;

  const $ = selector => document.querySelector(selector);

  function safeText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value || '';
  }

  function decorateHome() {
    document.querySelectorAll('.tool-card[data-tool]').forEach(card => {
      if (card.dataset.uxReady === 'true') return;
      const meta = UX[card.dataset.tool];
      if (!meta) return;
      const footer = document.createElement('div');
      footer.className = 'tool-card-meta';
      footer.innerHTML = meta.badges.map(item => `<span>${item}</span>`).join('');
      const open = card.querySelector('.open-tool');
      if (open) card.insertBefore(footer, open);
      else card.appendChild(footer);
      card.dataset.uxReady = 'true';
    });
    updateHomeCount();
  }

  function updateHomeCount() {
    const visible = [...document.querySelectorAll('.tool-card')].filter(card => !card.classList.contains('hidden')).length;
    safeText('#toolResultCount', `${visible} ${visible === 1 ? 'opção disponível' : 'opções disponíveis'}`);
  }

  function renderTool(tool, config = {}) {
    currentTool = tool;
    const meta = UX[tool] || {};
    safeText('#toolCategoryLabel', meta.category || 'Ferramenta');
    safeText('#toolComplexityLabel', meta.complexity || 'Fluxo guiado');
    safeText('#uxInput', meta.input || config.typeLabel || 'Arquivo');
    safeText('#uxCapability', meta.capability || config.title || 'Processar documento');
    safeText('#uxOutput', meta.output || 'Nova cópia');
    safeText('#settingsTitle', meta.inspectorTitle || 'Ajustes do resultado');
    safeText('#settingsDescription', meta.inspectorDescription || 'Revise somente o que precisa ser personalizado.');
    safeText('#dropSubtitle', meta.dropSubtitle || 'Arraste para esta área ou clique para procurar.');

    const list = $('#toolGuideSteps');
    if (list) {
      list.innerHTML = '';
      (meta.steps || []).forEach((step, index) => {
        const item = document.createElement('li');
        item.dataset.stage = String(index + 1);
        item.innerHTML = `<span>${index + 1}</span><p>${step}</p>`;
        list.appendChild(item);
      });
    }
    const tip = $('#toolGuideTip');
    if (tip) tip.innerHTML = `<strong>Dica:</strong> ${meta.tip || 'Revise as opções antes de processar.'}`;

    const attention = $('#toolAttention');
    safeText('#toolAttentionText', meta.attention || 'Revise o resultado antes de substituir o arquivo original.');
    attention?.classList.toggle('hidden', !meta.attention);

    document.body.dataset.currentTool = tool;
    updateStage(currentStage);
  }

  function updateStage(stage) {
    currentStage = Number(stage) || 1;
    document.querySelectorAll('#toolGuideSteps li').forEach(item => {
      const value = Number(item.dataset.stage || 0);
      item.classList.toggle('current', value === currentStage);
      item.classList.toggle('complete', value < currentStage);
    });
    const labels = { 1: 'Arquivos', 2: 'Configuração', 3: 'Resultado' };
    safeText('#settingsEyeline', labels[currentStage] || 'Configuração');
    document.body.dataset.workflowStage = String(currentStage);
    $('#settingsEmptyState')?.classList.toggle('hidden', currentStage > 1);
    $('#settingsContent')?.classList.toggle('hidden', currentStage === 1);
    const guide = $('#toolGuide');
    if (guide && currentStage === 1) guide.open = true;
    if (guide && currentStage > 1) guide.open = false;
  }

  function enhanceSettings(container, tool) {
    if (!container) return;
    container.querySelectorAll('details').forEach((details, index) => {
      details.classList.add('ux-disclosure');
      if (index > 0 && !details.hasAttribute('open')) details.removeAttribute('open');
    });
    container.querySelectorAll('.notice-card').forEach(card => card.setAttribute('role', 'note'));
    container.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('focus', () => field.closest('.field')?.classList.add('field-focused'));
      field.addEventListener('blur', () => field.closest('.field')?.classList.remove('field-focused'));
    });
    document.body.dataset.settingsTool = tool;
  }

  function filterSidebar() {
    const query = ($('#workspaceToolSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
    let visible = 0;
    document.querySelectorAll('#workspaceToolNav .tool').forEach(button => {
      const show = !query || button.textContent.toLocaleLowerCase('pt-BR').includes(query);
      button.classList.toggle('hidden', !show);
      if (show) visible += 1;
    });
    document.querySelectorAll('#workspaceToolNav .sidebar-title').forEach(title => {
      let next = title.nextElementSibling;
      let groupVisible = false;
      while (next && !next.classList.contains('sidebar-title')) {
        if (next.classList.contains('tool') && !next.classList.contains('hidden')) groupVisible = true;
        next = next.nextElementSibling;
      }
      title.classList.toggle('hidden', !groupVisible);
    });
    $('#sidebarNoResults')?.classList.toggle('hidden', visible > 0);
  }

  function init() {
    decorateHome();
    $('#workspaceToolSearch')?.addEventListener('input', filterSidebar);
    $('#toolSearch')?.addEventListener('input', () => requestAnimationFrame(updateHomeCount));
    document.querySelectorAll('.category-tab').forEach(button => button.addEventListener('click', () => requestAnimationFrame(updateHomeCount)));
    renderTool('organize', {});
  }

  window.CentralPDFUX = { UX, decorateHome, updateHomeCount, renderTool, updateStage, enhanceSettings, filterSidebar };
  init();
})();
