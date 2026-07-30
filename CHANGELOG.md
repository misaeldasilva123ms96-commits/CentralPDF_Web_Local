# Changelog

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
