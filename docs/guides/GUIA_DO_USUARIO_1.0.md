# Guia do usuário — Central PDF & Imagem 1.0

## Abertura recomendada

Use `ABRIR_CENTRAL_PDF.bat`. Ele inicia o servidor local em um endereço `127.0.0.1`, abre o navegador e habilita as condições necessárias para cache offline, projetos e recuperação mais completa.

## Fluxo básico

1. Escolha uma ferramenta pela busca, categoria, favoritos ou recentes.
2. Adicione os documentos por clique ou arraste.
3. Confira as páginas, arquivos e configurações.
4. Execute a operação.
5. Baixe o resultado ou encaminhe-o diretamente para outra ferramenta.

O documento original não é substituído automaticamente.

## Trabalhos longos

- Use **Projetos** para salvar um arquivo `.cpdf`.
- Use **Processos** para acompanhar operações demoradas.
- Use **Resultados** para reutilizar arquivos gerados na mesma sessão.
- Para centenas de páginas, mantenha somente as abas necessárias abertas e aguarde o término antes de fechar o navegador.

## Uso offline

Execute `PREPARAR_OFFLINE.bat` uma vez com internet. A preparação tenta colocar na pasta `vendor` os motores necessários para PDF, OCR, HEIC, TIFF e demais recursos opcionais.

## Autodiagnóstico

O botão **Qualidade** verifica:

- quantidade de ferramentas registradas;
- motores disponíveis;
- OCR e inteligência documental;
- projetos, recuperação, resultados e fluxos;
- modo servidor local ou abertura direta;
- contexto seguro e armazenamento local.

O relatório pode ser baixado em JSON para suporte técnico.

## Atalhos principais

- `Ctrl K`: buscar ferramentas;
- `Alt H`: voltar ao início;
- `Alt R`: abrir resultados;
- `Alt P`: abrir projetos;
- `Alt Q`: abrir diagnóstico da versão;
- `Alt A`: abrir acessibilidade;
- `?`: abrir ajuda;
- `F9`: alternar barra lateral;
- `Ctrl Shift F`: modo foco.
