# Segurança

## Processamento local
A aplicação e o servidor local não possuem rota de upload. O servidor atende apenas `127.0.0.1`. Resultados, favoritos, fluxos e predefinições permanecem no navegador utilizado.

Na versão publicada pelo GitHub Pages, a interface e os motores verificados são
baixados como arquivos estáticos do próprio site. PDFs e imagens continuam
processados no navegador e não são enviados ao GitHub ou a um backend da
aplicação.

## Resultados e fluxos
Resultados da sessão podem permanecer temporariamente na memória para serem usados na próxima ferramenta. Fechar a aba elimina esses resultados. Fluxos não enviam documentos para serviços externos.

## Predefinições
Campos de senha e arquivos nunca são incluídos nas predefinições. Predefinições guardam somente ajustes não sensíveis.

## Motores externos
Execute `PREPARAR_OFFLINE.bat` para baixar os motores públicos para `vendor`. Os downloads usam versões fixas, arquivo parcial e SHA-256 conhecido antes da instalação. Sem preparação, o aplicativo não executa motores remotos até o usuário autorizar explicitamente o download no painel **Sistema**. Para documentos altamente sigilosos, prepare o modo offline antes de abrir o documento.

O servidor local escuta em uma porta aleatória de `127.0.0.1`, aceita apenas `GET` em `/__health` e não expõe rota HTTP para encerrar o processo. Content Security Policy limita scripts e conexões às origens necessárias; Permissions Policy desabilita câmera, microfone, geolocalização, pagamentos e USB. O binário commitado é recompilado e comparado byte a byte na CI; seu SHA-256 está em `checksums.sha256`.

Releases criadas por tags versionadas recompilam o servidor, preparam os motores offline, publicam hashes SHA-256 e recebem uma atestação Sigstore do GitHub. O ZIP e o executável podem ser verificados com `gh attestation verify ARQUIVO --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local`. Essa verificação comprova a ligação com o workflow e o commit de origem. O executável ainda não possui assinatura Authenticode reconhecida pelo Windows.

## Limites
Cobertura visual não é censura segura. Alterações podem invalidar assinaturas digitais. Remoção de senha só deve ser usada com autorização e senha conhecida.


## OCR
O OCR é executado no navegador por um motor WebAssembly. Quando a preparação offline não foi concluída, scripts, núcleos e dados de idioma podem ser baixados de fornecedores públicos. Para documentos sigilosos, execute `PREPARAR_OFFLINE.bat` antes do uso. O texto reconhecido pode conter erros e não deve ser considerado validação automática de dados.

PDFs pesquisáveis gerados por OCR podem rasterizar páginas reconhecidas e invalidar ou remover links, formulários, anotações e assinaturas digitais dessas páginas. Trabalhe sempre com cópias.


## Comparação de documentos
A comparação é assistiva. Relatórios visuais e textuais não substituem revisão humana, validação jurídica ou conferência de valores. Os dois PDFs permanecem no navegador.

## Censura definitiva
A ferramenta de censura definitiva reconstrói as páginas afetadas a partir da renderização já censurada, sem copiar os objetos originais dessas páginas. O modo de máxima sanitização reconstrói todas as páginas. O relatório registra hashes SHA-256 quando a API criptográfica do navegador está disponível.

Depois da censura, valide visualmente o PDF e tente pesquisar ou copiar o conteúdo removido. Preserve o original em local separado. Páginas reconstruídas perdem links, formulários, comentários, camadas e assinaturas digitais.

## Formulários e assinaturas — 0.18

- Campos preenchíveis são inseridos na nova cópia do PDF. Teste compatibilidade no leitor utilizado pela organização.
- Máscaras de CPF, CNPJ, data e moeda não devem ser tratadas como validação jurídica ou fiscal.
- A ferramenta de assinatura gera uma representação visual; não usa certificado digital e não oferece verificação criptográfica de identidade ou integridade.
- Imagens de assinatura permanecem na memória da página durante a sessão e são incorporadas somente ao arquivo exportado.

## Conversões profissionais — 0.19

A conversão para Office e a leitura de DOCX, XLSX e PPTX são realizadas localmente. Arquivos Office são pacotes ZIP estruturados; a ferramenta lê somente os XMLs necessários ao conteúdo textual e não executa macros, scripts VBA, objetos OLE ou conteúdo incorporado executável.

O PowerPoint gerado usa um motor incorporado no pacote. Word e Excel são construídos como documentos OOXML novos, sem copiar macros ou relacionamentos ativos do documento de origem.

HEIC e TIFF usam decodificadores JavaScript opcionais preparados pelo usuário. O navegador pode precisar de mais memória para imagens de alta resolução ou TIFFs com várias páginas.

O modo de arquivamento registra hashes SHA-256 quando a API criptográfica do navegador está disponível. Esses hashes permitem conferência de integridade, mas não substituem assinatura digital, carimbo de tempo ou certificação PDF/A.

## Inteligência documental — 0.20

Os quatro módulos de inteligência documental usam regras e análise de texto executadas no navegador. Nenhum documento é enviado a um modelo externo e nenhuma resposta é criada por um serviço remoto.

- Resumos são extrativos: selecionam passagens do próprio documento.
- Respostas a perguntas mostram evidências e páginas, mas podem omitir contexto importante.
- Classificação e renomeação são sugestões; arquivos originais não são substituídos automaticamente.
- CNPJ, CPF, datas e valores são detectados por formato. A detecção não valida situação cadastral, dígitos verificadores ou legitimidade.
- Achados de auditoria são indícios automáticos e não substituem revisão jurídica, contábil, fiscal, clínica ou administrativa.
- Páginas sem texto podem ser digitalizações. Execute OCR e confira novamente antes de concluir que uma página está vazia.

## Estabilidade e diagnóstico — 1.0

A camada 1.0 registra localmente até 25 erros JavaScript para ajudar no suporte. O registro contém horário, mensagem e origem técnica, mas não inclui o conteúdo integral dos documentos. O usuário pode limpar o registro ou exportar um diagnóstico JSON.

A proteção contra fechamento acidental é ativada quando a aplicação identifica um trabalho aberto. O navegador decide como apresentar o aviso e pode ignorá-lo em algumas políticas corporativas.

Preferências de acessibilidade e o estado de primeiro acesso ficam no `localStorage` do navegador. Elas não são enviadas para serviços externos.
