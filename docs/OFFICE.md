# Conversões Office no computador

As conversões ficam em **Converter PDF**, ao lado de **Todas as ferramentas**.
O menu separa Word, Excel e PowerPoint em duas colunas: **Converter em PDF** e
**Converter de PDF**. Os dez atalhos usam o catálogo existente de 34 ferramentas.
A busca aceita palavras em outra ordem, acentos e nomes como “Word para PDF”,
“Excel para PDF”, “PDF para Word” e “Office para PDF”.

## Word, Excel, PowerPoint e ODS para PDF

1. Escolha a conversão e selecione os documentos.
2. Mantenha **Preservar layout** e clique em converter. A preparação é automática,
   sem botão de instalar ou baixar dependências.
3. Aguarde o resultado. Se o navegador bloquear a janela de processamento,
   permita a abertura para este site e clique em converter novamente. A janela
   mostra apenas o progresso e se fecha ao concluir.

O motor é o LibreOffice compilado para WebAssembly. Processamento e arquivos de
trabalho ficam na memória do navegador. Não há servidor de conversão, login,
upload de documentos, instalação de aplicativos ou permissão para ler o disco.
O usuário fornece apenas os arquivos selecionados. O runtime não recebe acesso
irrestrito à rede: fetch/XHR permitem apenas os recursos públicos do motor.

São aceitos DOC/DOCX/ODT, XLS/XLSX/ODS, PPT/PPTX/ODP, RTF, HTML e CSV. Imagens e
texto simples continuam com os caminhos locais existentes. Cada entrada do motor
aceita até 25 MB; a saída tem limite de 100 MB e a conversão, de dois minutos.
Fechar a janela, cancelar ou atingir o limite libera o motor e exige reativação.
Uma falha nunca escolhe silenciosamente a conversão simplificada.

Cabeçalhos, rodapés, imagens, tabelas, papel e áreas de impressão são renderizados
pelo LibreOffice, em vez de remontar o texto em Helvetica. Fontes ausentes ainda
podem ser substituídas; objetos e documentos não suportados exigem conferência.
Não existe garantia universal de reprodução idêntica ao Microsoft Office.

O modo **Somente texto** permanece explícito para DOCX/XLSX/PPTX e documentos
textuais; descarta layout e não aceita ODS como texto binário. A combinação de
arquivos copia as páginas PDF já convertidas e mantém a ordem de entrada,
inclusive ao misturar documentos e imagens.

## PDF para Word, Excel e PowerPoint

- **Word visual:** cada página é uma imagem em uma página do Word com as mesmas
  dimensões. Não acrescenta título “Página N”, margem ou texto que mude o layout.
  Esse modo não transforma o texto da imagem em texto editável.
  O dispositivo de impressão do aplicativo Office pode arredondar papel
  personalizado em menos de um milímetro ao exportar novamente.
- **Word editável:** extração simplificada de texto; não reconstrói o layout.
- **PowerPoint:** páginas como imagens sem deformação; a proporção da primeira
  página define a apresentação. Páginas de proporção diferente ficam centralizadas.
- **Excel:** extração de texto/tabelas; não recupera fórmulas, gráficos e estilos
  que o PDF não contém como estrutura de planilha. PDF sem texto exige OCR para
  os modos editáveis; não retorna um arquivo vazio com mensagem de sucesso.

## Navegador, armazenamento e modo offline

Use HTTPS ou o servidor da edição local; abrir `index.html` por `file://` não
fornece o ambiente isolado necessário ao motor. Navegadores atualizados precisam
permitir Service Worker, WebAssembly, BroadcastChannel e memória compartilhada.
O navegador pode bloquear a janela; permita-a e clique em converter novamente.

A janela Office possui Service Worker e política de isolamento próprios. Não
altera o isolamento, CSP ou autenticação da tela principal nem do painel admin.
Embind exige geração dinâmica de wrappers JavaScript; a exceção `unsafe-eval`
fica restrita à janela Office, sem scripts externos ou documentos como HTML.
Workers usam scripts Blob do runtime verificado para funcionar no GitHub Pages,
que não permite configurar livremente os cabeçalhos HTTP do servidor.

O cache Office guarda somente código e recursos públicos, nunca os documentos.
Após o primeiro carregamento, o motor pode ser reutilizado offline enquanto o
navegador mantiver esse cache. Limpeza de dados, quota e políticas do navegador
podem exigir outro download. O pacote local completo inclui os mesmos recursos.
Computadores ou celulares com pouca memória podem não comportar o motor.

## Preparação, procedência e limites conhecidos

O código aberto vem de
[matbeedotcom/libreoffice-document-converter](https://github.com/matbeedotcom/libreoffice-document-converter),
versão npm **2.7.2**, licença [MPL-2.0](licenses/MPL-2.0.txt).
`scripts/prepare-office-engine.py` verifica o SHA-512 fixo do arquivo npm antes de
extrair somente os seis arquivos de runtime esperados. Gera hashes SHA-256 e a
nota de modificação. Não instala ou executa scripts do pacote npm.

Há uma modificação reproduzível: `pthreadPoolSize` de 4 para 8 em `soffice.js`,
mitigação do [travamento upstream #19](https://github.com/matbeedotcom/libreoffice-document-converter/issues/19).
O upstream ainda relata dependência do computador; por isso há cancelamento,
limite de tempo e erro explícito. Não declarar compatibilidade com todos os PCs.

Para preparar o código-fonte, use `python scripts/prepare-office-engine.py` além
dos motores PDF preparados por `scripts/prepare-offline.ps1`. Python é ferramenta
de preparação; não é necessário para usuários do site ou pacote completo.
Pages e release executam essa preparação e incluem `office/` e `vendor/office/`.
Os binários de aproximadamente 240 MB não são versionados como blobs Git; o WASM
individual excede o limite de arquivo do GitHub, mas cabe no pacote estático.
Sem pacote completo, a janela informa a ausência do motor; não tenta enviar os
documentos a um serviço alternativo.

## Verificação

`tests/office-conversions.test.py` cobre busca, menu, teclado, atalhos e recusa de
ODS no modo texto, em Chromium/Firefox e 1440×1000/390×844. Com `--engine` e site
preparado, executa o motor real em Chromium e Firefox, converte um DOCX
sintético com cabeçalho e tabela e
valida o PDF com PDF.js. Também confere a preservação de páginas Word visuais,
sem margens extras, em retorno pelo LibreOffice. A CI usa apenas arquivos
sintéticos. Os cinco arquivos reais fornecidos para o diagnóstico permanecem
fora do repositório, dos artefatos públicos e da telemetria. A regressão offline
não usa interceptação de rede do Playwright: no Firefox, ela impede a navegação
em uma nova janela pelo Service Worker mesmo com o conteúdo em cache. O
bloqueio de telemetria do executor de testes permanece ativo.

### Revisão visual

A interface foi comparada com a referência fornecida: duas colunas, cinco
atalhos por coluna, Word/PowerPoint/Excel na mesma ordem, ícones com cores
distintas e abertura abaixo de Converter PDF. O botão fica imediatamente antes
de Todas as ferramentas. Mantém as cores e tipografia do CentralPDF nos temas
claro/escuro e se ajusta a 390 px sem rolagem horizontal.

A última opção é **Preparar para arquivamento**, porque o processador existente
não certifica PDF/A. Os ícones W/X/P são próprios, sem copiar marcas do exemplo.
