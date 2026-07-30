# Central PDF & Imagem 1.0.3

Aplicação web local com 34 ferramentas para organizar, editar, converter, proteger, pesquisar, comparar e auditar PDFs e imagens.

## Versão estável 1.0.3

A versão 1.0 consolida o ciclo iniciado nas versões 0.x. Ela preserva as 34 ferramentas e adiciona uma camada de estabilidade e experiência profissional:

### Ajuste de interface 1.0.1

- novo botão **Configurações** no cabeçalho;
- **Projetos**, **Processos**, **Sistema**, **Resultados**, **Fluxos**, **Predefinições** e **Qualidade 1.0** movidos para um painel único;
- cabeçalho principal mais limpo e com melhor foco na área de trabalho.

- primeiro acesso guiado;
- preferências de acessibilidade;
- navegação por teclado;
- autodiagnóstico da instalação;
- registro local de erros;
- proteção contra fechamento acidental com trabalho aberto;
- cache offline e servidor local identificados como 1.0.0;
- documentação consolidada de uso, segurança, acessibilidade e limitações.

## Como abrir

1. Extraia completamente o ZIP.
2. Execute `PREPARAR_OFFLINE.bat` uma vez com internet para preparar os motores opcionais.
3. Abra `ABRIR_CENTRAL_PDF.bat`.
4. Confirme no topo a indicação **Web local 1.0.3**.

Também é possível abrir `index.html` diretamente. Nesse modo, cache, service worker e alguns recursos do navegador podem ficar limitados.

## Privacidade

O processamento ocorre no navegador. O servidor local escuta somente em `127.0.0.1` e não possui rota de upload. Recursos externos opcionais são usados apenas para carregar motores públicos quando a preparação offline ainda não foi concluída.

O carregamento de código remoto fica desativado por padrão. Para habilitá-lo, use **Configurações > Sistema > Preparar uso offline** e confirme o aviso, ou execute `PREPARAR_OFFLINE.bat` para baixar os motores na pasta `vendor`.

## Desenvolvimento e testes

Requisitos: Node.js, Python 3, Go 1.23 ou superior e Chromium do Playwright.

```powershell
python -m pip install -r requirements-test.txt
python -m playwright install chromium

Get-ChildItem tests -Filter '*.js' | ForEach-Object { node $_.FullName }
Get-ChildItem tests -Filter '*.test.py' | ForEach-Object { python $_.FullName }
python tests/static_integrity.py

Push-Location server
go test ./...
Pop-Location
```

## Documentação

- Guia principal: `docs/guides/GUIA_DO_USUARIO_1.0.md`
- Acessibilidade: `docs/guides/ACESSIBILIDADE_1.0.md`
- Segurança: `SECURITY.md`
- Limitações conhecidas: `docs/reference/LIMITACOES_CONHECIDAS_1.0.md`
- Relação de ferramentas: `docs/reference/MODULES.md`
- Testes da versão: `docs/testing/TESTES_RELEASE_1.0.md`


### Ajuste visual 1.0.2

- todos os cartões da home agora usam o mesmo tamanho visual;
- ferramentas destacadas deixaram de ocupar largura dupla no catálogo;
- a grade ficou mais uniforme, previsível e fácil de escanear.

### Tema e refinamento visual 1.0.3

- novo seletor de **tema claro / tema escuro** dentro de **Configurações**;
- preferência de tema salva localmente no navegador;
- refinamentos visuais no cabeçalho, área inicial, cards e painéis;
- melhor contraste e conforto visual em sessões prolongadas.
