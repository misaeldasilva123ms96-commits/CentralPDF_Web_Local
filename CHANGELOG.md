## 2.0.1 — workspace renovado e entrega verificável

### Interface e experiência

- Redesenha a página inicial e o shell compartilhado, com navegação responsiva, busca, categorias, favoritos, indicadores de disponibilidade e privacidade local.
- Uniformiza tipografia, ícones, cores, espaçamentos, foco visível e comportamento com redução de movimento em desktop e dispositivos móveis.

### Workspace

- Moderniza a entrada de arquivos com miniaturas reais, contagem de páginas, pré-visualização, reordenação por arraste e controles acessíveis.
- Mantém o painel de configurações fixo no desktop, com rolagem interna e reserva de espaço que evita sobreposição com a área principal.
- Remove a lacuna inferior do painel lateral e mantém cabeçalhos, avisos e ações no fluxo correto após a inclusão de arquivos.
- Exibe após o download uma janela central com ações específicas para continuar na ferramenta ou iniciar uma nova tarefa.
- Mantém a janela de conclusão rolável em telas baixas, prende o foco às ações e o restaura de forma segura ao fechar.

### Ferramentas

- Preserva o catálogo funcional das 34 ferramentas e a distinção entre recursos disponíveis, experimentais e planejados.
- Restaura pré-visualizações de PDF, configurações de extração e validações reais de formulários e arquivos reparados.

### Segurança e privacidade

- Mantém o processamento local, sem rota de upload de documentos, com servidor limitado a `127.0.0.1` e políticas restritivas de conteúdo e permissões.
- Preserva motores offline verificados, checksums SHA-256, comparação reproduzível do executável Windows e atestação dos artefatos de release.

### Qualidade e distribuição

- Sincroniza a versão `2.0.1` na interface publicada, frontend React, manifesto, diagnóstico, servidor local, cache e metadados de pacote.
- Amplia regressões de workspace, formulários, acessibilidade, sincronização de versão, pacote, workflow e histórico de releases.
- Faz o workflow consumir notas versionadas, validar o manifesto SHA-256 gerado e continuar aceitando tags estáveis futuras sem lógica exclusiva da `2.0.1`.

## Fluxo pós-download e painéis sem sobreposição

- mantém o menu global de configurações acima do inspetor lateral;
- deixa o título e a descrição do inspetor no fluxo normal de rolagem;
- oculta a ação de reinício até que a ferramenta conclua o processamento;
- apresenta, após o download, escolhas para continuar com os mesmos arquivos ou começar uma nova tarefa;
- usa nomenclatura específica nas 34 ferramentas, como “Continuar juntando” e “Nova junção”;
- amplia o resultado pós-download em uma janela modal central, responsiva e acessível pelo teclado;
- mantém a janela rolável em telas baixas e prende o foco às ações até a escolha do próximo passo;
- impede que o cabeçalho do inspetor encolha e sobreponha avisos após a inclusão de arquivos;
- renova as URLs de CSS/JavaScript e o cache do aplicativo.

## Compressão automática com prioridade de qualidade e união A-Z

- recalibra o modo Automático para 96-120 DPI e qualidade JPEG de 60-72%;
- preserva páginas mistas com texto e vetores, evitando a perda visual observada na rasterização de página inteira em baixa resolução;
- reconhece páginas escaneadas e imagens dominantes, inclusive documentos com camada OCR;
- mantém o modo Forte separado para quem prioriza o menor tamanho possível;
- altera a ordem inicial de Juntar PDFs para Nome: A → Z;
- novos PDFs continuam em A-Z enquanto o usuário não mudar para ordem manual;
- renova o cache do aplicativo.

## Compressão inteligente por conteúdo

- analisa imagens, texto e vetores de cada página antes de decidir pela rasterização;
- preserva páginas somente textuais ou vetoriais, evitando transformar centenas de páginas leves em imagens maiores;
- aplica limiares progressivos de cobertura visual e usa uma única passagem calibrada em documentos com 250+ páginas ou 8 MB+, evitando consumo excessivo de memória;
- amplia o perfil forte para buscar reduções acima de 60% quando o conteúdo permite;
- informa no relatório quantas páginas foram rasterizadas e quantas permaneceram nativas;
- mantém o arquivo original quando nenhum candidato é menor;
- renova o cache para entregar o novo motor imediatamente.

## Editor PDF — documentos restritos e renderização concorrente

- abre PDFs com criptografia de permissões e senha de usuário vazia em modo compatível;
- preserva a aparência do documento e achata apenas a página-base na exportação quando o pdf-lib não consegue copiar a origem;
- mantém textos, imagens, desenhos, recortes e rotação editáveis sobre a página compatível;
- cancela renderizações anteriores e usa canvas temporário por operação, eliminando o erro de canvas reutilizado;
- evita intercalamento de miniaturas de execuções antigas;
- reduz o aviso de página mínima a uma orientação sem registro de erro;
- renova o cache do aplicativo para entregar o runtime corrigido.

## Correção de entrega da orientação do Editor PDF

- exibe os botões de rotação diretamente na barra de ações da página;
- renova o cache do aplicativo para entregar a implementação mesclada no PR #12;
- usa estratégia network-first para a página inicial e o módulo do Editor PDF, mantendo fallback offline;
- adiciona teste de regressão para controles, orientação e invalidação de cache.

## 1.2.1 — motores atualizados e releases verificáveis

- PDF.js atualizado de 3.11.174 para 6.2.108, com recursos locais completos e execução de JavaScript interno desativada.
- PptxGenJS atualizado de 4.0.0 para 4.0.1 usando a distribuição oficial do npm e sua licença MIT.
- Exportação PPTX passa a ter teste dedicado com múltiplos slides, imagens, notas, relacionamentos e validação de todos os XMLs do pacote.
- Releases futuras passam a montar o pacote offline, publicar hashes SHA-256 e gerar atestações criptográficas de procedência automaticamente.

## 1.2.0 — auditoria profunda das 34 ferramentas

- GitHub Pages passa a publicar somente a aplicação web com todos os motores opcionais verificados.
- Adicionada publicação automática após alterações integradas na `main`, com montagem do mesmo pacote também nos pull requests.
- Corrigida a preparação do OCR 7 com as variantes Relaxed SIMD exigidas pelo navegador.
- UTIF passa a usar o arquivo original e estável do pacote npm, evitando hash variável da minificação do CDN.
- A preparação offline reutiliza arquivos existentes quando tamanho e SHA-256 já estão corretos.
- O cache do Service Worker foi renovado para atualizar instalações que abriram a publicação anterior.
- Reaplicado consentimento explícito antes de executar motores remotos de PDF, OCR, LibPDF, HEIC ou TIFF.
- Removida a rota HTTP local de desligamento e restringido `/__health` ao método GET.
- Adicionadas Content Security Policy e Permissions Policy ao servidor local para limitar origens executáveis e recursos sensíveis do navegador.
- Servidor Windows recompilado de forma reproduzível com Go 1.26.5, checksum publicado e verificação byte a byte adicionada à CI.
- Preparação offline passou a usar downloads atômicos, versões fixas e SHA-256 conhecido; o LibPDF agora é um bundle local completo com licenças preservadas.
- Testes Playwright tornados portáveis entre Windows e Linux, sem caminho fixo para o Chromium.
- Criada auditoria individual das 34 ferramentas com catálogo, interface, processador, motor, entrada, saída e histórico de execução.
- Adicionada pré-verificação padronizada em cada ferramenta, com escopo, profundidade, lote, motor, alertas e orientação de revisão.
- Arquivos vazios passam a ser rejeitados e lotes muito grandes recebem alertas de memória.
- Saídas PDF, ZIP, PNG e JPEG passam por verificação de assinatura e tamanho.
- Execuções, duração, sucessos, falhas, avisos e saídas são armazenados localmente por ferramenta.
- O painel Qualidade ganhou busca, filtros, matriz de auditoria e exportação de relatório completo.
- Mensagens de Worker, buffer e memória foram aprofundadas com ações recomendadas.

## 1.1.6 — compressão adaptativa e Worker dedicado

- Corrigido o Worker PDF em abertura direta por file:// usando um Worker dedicado por documento.
- Eliminada a cadeia blob:null/importScripts no fluxo de compressão.
- Perfis de compressão recalibrados para gerar arquivos menores com qualidade equilibrada.
- Compressão adaptativa repete o processamento com parâmetros menores quando a primeira tentativa não atinge redução real.
- A opção de manter o original impede que a saída fique maior, inclusive com remoção de metadados.
- Relatório de compressão agora registra perfil, DPI e qualidade utilizados.

## 1.1.5 — correção de buffers e ciclo de vida do Worker PDF

- Corrigido o erro `Cannot perform Construct on a detached ArrayBuffer` durante compressão rasterizada.
- PDF.js e pdf-lib agora recebem cópias independentes dos bytes do arquivo.
- Removido o compartilhamento de um único `workerPort`; cada documento usa Worker próprio via `workerSrc`.
- Corrigido o aviso `PDFWorker.fromPort - the worker is being destroyed` nas miniaturas.
- Logs históricos dessas falhas são migrados como corrigidos e duplicatas de interface/console são reduzidas.

## 1.1.4 — correção do botão Verificar agora

- Adicionado feedback visual durante e após a execução do autodiagnóstico.
- O botão agora funciona por delegação de eventos, mesmo após reorganizações da interface.
- A janela mostra horário da última verificação e leva o conteúdo ao resumo após nova execução.
- Falhas internas passam a ser registradas nos logs de qualidade e exibidas na própria janela.

## 1.1.3 — correção do carregamento PDF.js e Worker

- Removida a tentativa automática de carregar arquivos PDF locais inexistentes antes do fallback online.
- Corrigido o Worker PDF em abertura direta com porta Worker criada a partir do conteúdo real, evitando `blob:null/importScripts` repetido.
- Logs antigos desse problema passam por migração e deixam de poluir a lista ativa.
- O modo offline agora usa um marcador explícito criado pelo `PREPARAR_OFFLINE.bat`.
- Diagnóstico ampliado com modo, origem e estado real do Worker PDF.

## 1.1.2 — central de qualidade e logs ampliada

- Corrigida a versão interna do diagnóstico para refletir a versão real do aplicativo.
- Capacidade de logs ampliada de 25 para 250 registros únicos, com agrupamento de ocorrências repetidas.
- Adicionados busca, filtro por tipo, cópia e exportação separada dos logs.
- Captura ampliada para erros JavaScript, promessas, recursos, console, avisos e falhas de interface.
- Diagnóstico agora informa Worker PDF, motores locais, protocolo de abertura e estatísticas dos logs.
- Removida a criação duplicada de Blob para o Worker PDF, evitando erros `blob:null` em abertura direta.

## 1.1.1 — sincronização dos indicadores de versão

- Corrigidos os contadores e labels de versão que ainda exibiam 1.0 em áreas da interface.
- Painel lateral, aba de qualidade, autodiagnóstico e atalhos passaram a refletir a versão atual.
- Ajustadas mensagens e elementos auxiliares ligados à identificação da versão.

## 1.1.0 — polimento dos microelementos do tema escuro

- Estrelas de favoritos adaptadas ao tema escuro com melhor contraste e acabamento.
- Badges “Novo” e “Recomendado” reposicionados para não colidirem com o favorito.
- Pequenos elementos auxiliares do modo escuro receberam acabamento visual mais consistente.
- Ajustado o alinhamento para deixar os cards mais uniformes e legíveis.

## 1.0.9 — janelas maiores e navegação facilitada

- Aumentado o tamanho útil das janelas modais para facilitar a navegação.
- Reduzidas as laterais e margens internas para aproveitar melhor a tela.
- Mantido scroll interno com cabeçalho, conteúdo e ações mais acessíveis.
- Ajuste responsivo para modais de resultados, fluxos e qualidade da versão.

## 1.0.8 — auditoria de janelas e correções do tema

- Corrigidas janelas ainda claras no tema escuro, com cobertura completa para os diálogos da versão 1.0.
- Eliminadas rolagens horizontais e estouros visuais em resultados, fluxos e painéis modais.
- Ajustadas larguras, espaçamentos e empilhamento responsivo para telas menores.
- Adicionadas salvaguardas gerais para janelas flutuantes e dialogs auxiliares.

## 1.0.7 — ajuste de encaixe e rolagem dos painéis

- Corrigido o corte visual do painel de Configurações rápidas em telas mais baixas.
- Adicionada rolagem interna elegante quando o conteúdo excede a altura disponível.
- Reduzidos espaçamentos e reorganizado o layout em alturas menores para caber melhor na tela.
- Ajustes preventivos em painéis flutuantes para manter boa apresentação em diferentes resoluções.

## 1.0.6 — auditoria completa do tema escuro

- Corrigidos os blocos claros restantes em janelas, diagnósticos e fluxo offline.
- Dialogs de sistema, banners, botões, cards, pills, toasts e áreas de ação agora seguem o dark theme.
- Ajustado contraste de títulos, textos de apoio, estados, avisos e superfícies auxiliares.
- Refinamento para manter consistência visual em telas secundárias e painéis de apoio.

## 1.0.5 — refinamento da página inicial

- Aplicado o mesmo padrão do tema escuro aprimorado à página inicial.
- Hero inicial redesenhado com melhor profundidade, contraste e organização visual.
- Bloco de recentes/favoritas ajustado para o modo escuro, eliminando cartões claros destoantes.
- Cartões de ferramentas e chips refinados para manter consistência com o restante da interface.
- Melhorias de legibilidade, hierarquia e acabamento visual na home.

# Changelog

## 1.0.4

- Tema escuro redesenhado com melhor contraste e hierarquia de superfícies.
- Corrigidos títulos, cartões de resumo, upload e painel de propriedades no modo escuro.
- Removida a rolagem horizontal da barra lateral compacta, mantendo a largura fina.
- Scrollbars verticais refinadas para ocupar menos espaço visual.
- Service worker e servidor local atualizados para 1.0.4.

## 1.0.3

- Adicionado seletor de tema **claro / escuro** dentro do painel **Configurações**.
- Preferência de tema agora fica salva localmente no navegador.
- Refinamentos de web design aplicados ao topo, hero, busca, categorias, cartões e painéis.
- Criado pacote visual com suporte ao tema escuro.
- Service worker e servidor local atualizados para 1.0.3.

## 1.0.2

- Padronização do catálogo: todos os cartões da home passaram a usar o mesmo tamanho.
- Ferramentas destacadas não ocupam mais largura dupla, deixando a navegação visual mais consistente.
- Ajustes de clamp em título e descrição para preservar alinhamento e leitura.
- Cache offline e servidor local atualizados para 1.0.2.

## 1.0.1

- Novo botão **Configurações** no topo da aplicação.
- Itens de apoio do cabeçalho foram reunidos em um único painel: **Projetos**, **Processos**, **Sistema**, **Resultados**, **Fluxos**, **Predefinições** e **Qualidade 1.0**.
- Cabeçalho simplificado para melhorar foco, leitura e usabilidade.
- Service worker e servidor local atualizados para o pacote 1.0.1.

## 1.0.0

### Estabilidade e experiência

- Primeiro acesso guiado com explicação do fluxo de trabalho e da privacidade local.
- Selo visual de versão estável e correção da contagem da página inicial para 34 ferramentas.
- Painel de acessibilidade com texto ampliado, contraste reforçado, redução de movimentos e foco destacado.
- Navegação por teclado no catálogo de ferramentas e novos atalhos globais.
- Autodiagnóstico local com verificação do catálogo, motores, projetos, resultados, armazenamento e modo de abertura.
- Registro local das últimas 25 falhas JavaScript, com exportação de diagnóstico em JSON.
- Proteção contra fechamento acidental quando existe um trabalho ativo.
- Regiões de status e diálogos revisados para leitores de tela.
- Cache offline, manifesto, servidor local e projetos atualizados para 1.0.0.

### Documentação

- Guia consolidado do usuário.
- Guia de acessibilidade e atalhos.
- Lista explícita de limitações conhecidas.
- Plano de testes e relatório de release 1.0.
- Catálogo consolidado das 34 ferramentas.

### Compatibilidade

- Mantidas as ferramentas e os fluxos das versões 0.7 a 0.20.
- Projetos `.cpdf` anteriores continuam aceitos quando seus módulos existem na versão 1.0.

## 0.20.0

### Adicionado

- Assistente documental local com resumo extrativo e respostas apoiadas em evidências por página.
- Localização de cláusulas, capítulos, seções, CNPJ, CPF, datas, valores, códigos e números de documentos.
- Extração estruturada para CSV, JSON e relatório HTML.
- Expressão regular personalizada para padrões internos da organização.
- Auditoria documental com cruzamento de CNPJ, contratos, processos, códigos, valores e certidões.
- Regras opcionais de pagamento, vencimento em oito dias e validade de certidões.
- Classificação automática de contratos, aditivos, notas fiscais, CNDs, medições, relatórios, atestados e outros documentos.
- Sugestão de nomes por modelo com variáveis `{tipo}`, `{data}`, `{numero}`, `{cnpj}` e `{original}`.
- Detecção assistiva de páginas possivelmente vazias ou duplicadas.
- Fluxos “Digitalizar e analisar” e “Digitalizar e auditar”.

### Segurança e transparência

- Processamento determinístico e local, sem envio para provedor de IA.
- Evidências por arquivo e página em relatórios.
- Avisos explícitos para OCR necessário, baixa cobertura textual e revisão humana obrigatória.
- Arquivos originais nunca são renomeados ou substituídos automaticamente.

### Validação

- 34 ferramentas registradas.
- Testes determinísticos dos quatro módulos de inteligência.
- Regressão completa das ferramentas 0.7 a 0.19.
- União simulada de 600 páginas preservada.
- Inicializador Windows e cache offline atualizados para 0.20.0.

## 0.19.0

### Adicionado

- PDF para Word DOCX em modo texto, imagem ou híbrido.
- PDF para Excel XLSX com uma planilha por página ou documento.
- PDF para PowerPoint PPTX com uma página por slide.
- Conversão local de DOCX, XLSX, PPTX, HTML, TXT, CSV e Markdown para PDF.
- Conversão de HEIC, TIFF e formatos comuns de imagem para PDF.
- Extração de imagens internas do PDF pelo PDF.js.
- Exportação de páginas completas para PNG, JPG ou WEBP.
- Manifesto JSON das imagens extraídas.
- Cópia normalizada ou rasterizada para arquivamento.
- Manifestos com hashes SHA-256 e diagnóstico de sinais PDF/A.
- Novos fluxos “Arquivar e compartilhar” e “Converter documentos e organizar”.
- PptxGenJS 4.0.0 incorporado no pacote para criação local de PPTX.

### Segurança e transparência

- Aviso explícito de que arquivamento não equivale a certificação PDF/A.
- Aviso de simplificação visual em conversões editáveis para Office.
- Decodificadores HEIC e TIFF incluídos na preparação offline opcional.

### Validação

- 30 ferramentas registradas.
- DOCX, XLSX e PPTX gerados e reabertos em testes automatizados.
- Regressão completa das ferramentas 0.7 a 0.18.
- União simulada de 600 páginas preservada.
