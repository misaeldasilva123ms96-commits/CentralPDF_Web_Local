# Central PDF & Imagem 1.2.0

Aplicação web local com 34 ferramentas para organizar, editar, converter, proteger, pesquisar, comparar e auditar PDFs e imagens.

## Acesso online

A versão web está disponível em:

**https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/**

O GitHub Pages é publicado com os mesmos motores verificados usados no pacote
offline. Os arquivos enviados permanecem no navegador; o site não possui rota
de upload nem backend de processamento de documentos.

Depois que uma alteração é integrada na `main`, o workflow **Pages** remonta o
pacote, confere os motores por SHA-256 e publica automaticamente. Pull requests
montam o mesmo artefato para validação, mas não recebem permissão de deploy.

## Versão estável 1.2.0

A versão 1.2.0 preserva as 34 ferramentas e adiciona auditoria profunda, pré-verificação e validação de execução para todo o catálogo:


### Auditoria profunda 1.2.0

- auditoria individual das 34 ferramentas no painel **Qualidade**;
- busca, filtros e download do relatório completo da auditoria;
- pré-verificação com entrada, saída, motor, lote, profundidade e revisão recomendada;
- rejeição de arquivos vazios e alertas para lotes com alto consumo de memória;
- verificação básica de integridade para saídas PDF, ZIP/Office, PNG, JPEG, WebP e JSON;
- histórico local por ferramenta com duração, sucessos, falhas, avisos e tamanho das saídas;
- relatório técnico em `docs/testing/AUDITORIA_34_FERRAMENTAS_1.2.0.md`.

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
2. Execute `PREPARAR_OFFLINE.bat` uma vez com internet para preparar os motores opcionais. O download ocorre somente após essa ação explícita e cada arquivo é validado por SHA-256 antes de substituir a versão local.
3. Abra `ABRIR_CENTRAL_PDF.bat`.
4. Confirme no topo a indicação **Web local 1.2.0**.

Evite abrir `index.html` diretamente. Use `ABRIR_CENTRAL_PDF.bat`, pois o modo `file://` limita Service Worker e pode restringir Workers usados pelo PDF.js.


### Correção PDF.js 1.1.4

- o carregador não tenta mais abrir `vendor/pdf.min.js` quando a preparação offline ainda não foi executada;
- o Worker PDF usa uma porta dedicada criada a partir do código carregado, evitando falhas repetidas com `blob:null/importScripts`;
- `PREPARAR_OFFLINE.bat` registra explicitamente quando os motores locais estão disponíveis;
- logs antigos dessa falha são removidos da lista ativa durante a migração.

## Privacidade

O processamento ocorre no navegador. O servidor local escuta somente em `127.0.0.1` e não possui rota de upload. Recursos externos opcionais só são carregados após autorização explícita no painel **Sistema** ou pela execução voluntária de `PREPARAR_OFFLINE.bat`.

## Integridade do executável

O servidor Windows é compilado de forma reproduzível com Go 1.26.5. O arquivo `checksums.sha256` contém o SHA-256 esperado de `CentralPDF_Local_Server.exe`, e a CI recompila o servidor e exige igualdade byte a byte com o binário publicado.

No PowerShell, confira o pacote com:

```powershell
(Get-FileHash -Algorithm SHA256 .\CentralPDF_Local_Server.exe).Hash.ToLowerInvariant()
```

O executável ainda não possui assinatura Authenticode. O checksum comprova integridade em relação ao repositório, mas não substitui uma futura assinatura com certificado de código.

## Documentação

- Guia principal: `docs/guides/GUIA_DO_USUARIO_1.0.md`
- Acessibilidade: `docs/guides/ACESSIBILIDADE_1.0.md`
- Segurança: `SECURITY.md`
- Limitações conhecidas: `docs/reference/LIMITACOES_CONHECIDAS_1.0.md`
- Relação de ferramentas: `docs/reference/MODULES.md`
- Testes da versão: `docs/testing/TESTES_RELEASE_1.0.md`
- Auditoria técnica e de segurança: `docs/reports/AUDITORIA_TECNICA_1.2.0.md`


### Ajuste visual 1.0.2

- todos os cartões da home agora usam o mesmo tamanho visual;
- ferramentas destacadas deixaram de ocupar largura dupla no catálogo;
- a grade ficou mais uniforme, previsível e fácil de escanear.

### Tema e refinamento visual 1.0.3

- novo seletor de **tema claro / tema escuro** dentro de **Configurações**;
- preferência de tema salva localmente no navegador;
- refinamentos visuais no cabeçalho, área inicial, cards e painéis;
- melhor contraste e conforto visual em sessões prolongadas.

### Refinamento do tema escuro 1.0.4

- Contraste corrigido em títulos, cartões, área de upload e painel de propriedades.
- Superfícies escuras organizadas em níveis para reduzir o efeito de “tudo preto”.
- Barra lateral compacta preservada com 70 px e sem rolagem horizontal.
- Rolagem vertical mais discreta nas barras laterais.
