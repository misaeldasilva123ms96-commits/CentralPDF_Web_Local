# Central PDF 0.14 — Offline, projetos e recuperação

## Forma recomendada de abertura

1. Extraia todo o ZIP.
2. Execute `PREPARAR_OFFLINE.bat` uma vez enquanto houver internet.
3. Depois, abra por `ABRIR_CENTRAL_PDF.bat`.
4. O inicializador cria um servidor somente em `127.0.0.1`, escolhe uma porta livre e abre o navegador.

Nenhum documento é publicado na rede. O servidor atende apenas o próprio computador.

## Abertura direta

O `index.html` continua disponível como alternativa quando a empresa bloqueia executáveis locais. Nesse modo:

- as ferramentas básicas continuam disponíveis;
- os motores locais em `vendor` continuam sendo usados;
- service worker, instalação como aplicativo e algumas capacidades de recuperação podem ficar limitados pelo protocolo `file://`.

## Preparação offline

`PREPARAR_OFFLINE.bat` baixa e verifica:

- `vendor/pdf-lib.min.js`;
- `vendor/pdf.min.js`;
- `vendor/pdf.worker.min.js`;
- `vendor/libpdf-core.mjs`.

A aplicação sempre tenta o arquivo local antes de qualquer endereço externo.

## Projetos `.cpdf`

Um projeto é um ZIP com extensão `.cpdf`. Ele contém:

- `project.json` com versão, ferramenta ativa e configurações;
- cópias dos arquivos utilizados;
- ordem, rotações, exclusões e páginas importadas compatíveis;
- objetos e páginas do editor visual compatíveis;
- nome previsto para o resultado.

Use **Projetos → Salvar projeto atual**. Para continuar, use **Projetos → Escolher projeto**.

## Recuperação automática

- Fica ativa por padrão.
- Aguarda aproximadamente quatro segundos após uma alteração.
- Salva a sessão no armazenamento privado do navegador.
- Trabalhos com mais de 80 MB não são duplicados automaticamente para evitar consumo excessivo.
- A cópia pode ser desativada ou excluída no painel Projetos.

## Privacidade

- Os documentos são manipulados no navegador.
- O servidor local não possui rota de upload e não escuta interfaces externas.
- Projetos e recuperações ficam no computador do usuário.
- Não use a cobertura visual como redação segura; ela não remove necessariamente o conteúdo interno.
