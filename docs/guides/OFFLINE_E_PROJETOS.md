# Uso offline, projetos e recuperação

Referência atualizada em **21/10/2026**. [Documentação](../README.md) · [Guia do usuário](GUIA_DO_USUARIO_1.0.md)

## Preparar a execução local

1. Extraia todo o pacote Windows e confira o executável conforme o [README](../../README.md).
2. Releases incluem os motores preparados. Em uma cópia do código-fonte ou para reparar motores ausentes, execute `PREPARAR_OFFLINE.bat` com internet. Ele chama `scripts/prepare-offline.ps1` e valida versões fixas por SHA-256 antes de instalar cada arquivo.
3. Abra `ABRIR_CENTRAL_PDF.bat`. O servidor Go escolhe uma porta disponível em `127.0.0.1`; o fallback Python usa `8765` no mesmo endereço local.
4. Confira em **Qualidade / Autodiagnóstico** os motores disponíveis e experimente as funções necessárias com um documento de teste antes de desconectar.

O servidor não expõe uma rota de upload de documentos. Preparar motores exige acesso aos fornecedores; isso não envia PDFs ou imagens. A preparação também pode abrir o servidor ao terminar.

Evite `file://`: a abertura direta não garante os Workers, módulos ESM e Service Worker necessários. Em outros sistemas, a raiz pode ser servida por HTTP com Python; a preparação automatizada dos motores usa PowerShell.

## Motores e cache

| Recurso | Arquivos preparados |
| --- | --- |
| Manipulação PDF | `vendor/pdf-lib.min.js`; componentes já incluídos em `vendor/` |
| Renderização PDF.js | `vendor/pdfjs/pdf.min.mjs`, `pdf.worker.min.mjs`, CMaps, fontes, WASM e demais recursos em `vendor/pdfjs/`; manifesto `vendor/pdfjs-manifest.js` |
| OCR | `vendor/tesseract/`, `vendor/tesseract-core/` e idiomas português/inglês em `vendor/tessdata/` |
| Imagens opcionais | `vendor/UTIF.js` e `vendor/heic2any.min.js` |

O código atual usa PDF.js ESM; os antigos `pdf.min.js` e `pdf.worker.min.js` não são o caminho de preparação vigente. A lista exata de versões, arquivos e hashes está em [prepare-offline.ps1](../../scripts/prepare-offline.ps1).

O site publicado inclui motores verificados no pacote estático. O Service Worker mantém recursos em cache conforme o uso, mas uma primeira visita não garante que todas as ferramentas, idiomas e recursos já estejam disponíveis offline. Dados do site apagados, cotas e políticas do navegador podem remover esse cache. Para trabalho offline previsível, prefira o pacote local completo e previamente conferido.

## Projetos `.cpdf`

Um projeto é um ZIP com extensão `.cpdf`, contendo `project.json`, cópias dos arquivos, configurações e o estado compatível da ferramenta, incluindo páginas e objetos do editor suportados.

- Para salvar: **Projetos → Salvar projeto atual**.
- Para continuar: **Projetos → Escolher projeto**.
- Guarde o arquivo fora da pasta do aplicativo ao atualizar a instalação.
- Trate o `.cpdf` como documento sensível: ele contém os arquivos utilizados. Não há promessa de criptografia do projeto.

Salvar um projeto é diferente de exportar o PDF final: conserve ambos conforme a necessidade. Nem todo estado transitório de interface integra o projeto.

## Recuperação automática

A recuperação fica habilitada por padrão e é programada cerca de **4,2 segundos** após alterações, quando não há tarefa ativa. O limite é **80 MiB** para os arquivos de entrada; trabalhos maiores devem usar o projeto manual. Cotas ou falhas de armazenamento também podem impedir a cópia automática, com aviso na interface.

A cópia fica no IndexedDB do navegador. Preferências e a opção de recuperação usam armazenamento local. Perfil, origem e porta fazem diferença: abrir o servidor em outra porta pode não encontrar a recuperação da sessão anterior. O `.cpdf` exportado é o caminho para transportar o trabalho entre origens ou instalações.

**Resultados** fica na memória da aba e desaparece ao fechá-la. Limpar dados do site pode apagar recuperação, preferências, cache e logs. Exporte o trabalho importante antes de limpar ou trocar de perfil.

## Atualizar e trabalhar sem rede

O site recebe publicações da `main`; pacotes Windows são atualizados por releases. Para trocar o pacote, encerre o servidor, extraia a nova release em outra pasta, verifique hashes e reabra o projeto salvo.

O compartilhamento Sentry é opcional e depende de consentimento. Não funciona sem rede e não oferece entrega garantida das pendências. Para documentos sigilosos, prepare tudo antes, mantenha o compartilhamento desativado e trabalhe desconectado, conforme a política da organização. [Diagnósticos e privacidade](../diagnosticos-sentry.md).
