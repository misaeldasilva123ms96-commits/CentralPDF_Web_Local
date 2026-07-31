# Central PDF & Imagem 1.2.0

[![CI](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/ci.yml/badge.svg)](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/ci.yml)
[![Pages](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml/badge.svg)](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml)

Aplicação web local com 34 ferramentas para organizar, editar, converter, proteger, pesquisar, comparar e auditar PDFs e imagens. O processamento acontece no navegador, sem envio dos documentos para um servidor da aplicação.

**[Abrir o Central PDF & Imagem](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/)**

## Escolha como usar

| Modo | Indicado para | Como abrir |
| --- | --- | --- |
| **Online** | Uso rápido e acesso automático à versão mais recente | Abra o [site no GitHub Pages](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/) |
| **Local no Windows** | Documentos sensíveis, uso offline e pacote executável | Baixe o projeto, prepare os motores e execute `ABRIR_CENTRAL_PDF.bat` |

Nos dois modos, os arquivos permanecem no dispositivo. O site não possui backend nem rota de upload de documentos. Recursos externos opcionais só são usados após uma ação explícita do usuário.

## Uso rápido pelo site

1. Abra o [Central PDF & Imagem online](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/).
2. Escolha uma ferramenta na tela inicial ou pressione `Ctrl+K` para pesquisar.
3. Clique na área de entrada ou arraste os arquivos para ela.
4. Confira a ordem dos documentos e ajuste as opções da ferramenta.
5. Leia a pré-verificação: entrada, saída, motor usado e avisos de revisão.
6. Execute o processamento.
7. Revise o resultado e faça o download. O arquivo original não é sobrescrito.

No primeiro uso, alguns motores maiores podem levar mais tempo para carregar e ficar armazenados no cache do navegador.

## Uso local no Windows

### 1. Baixe e extraia

Baixe o [ZIP da branch `main`](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/archive/refs/heads/main.zip) e extraia todo o conteúdo para uma pasta comum. Não execute o aplicativo de dentro do ZIP.

### 2. Verifique o executável

Abra o PowerShell na pasta extraída e execute:

```powershell
(Get-FileHash -Algorithm SHA256 .\CentralPDF_Local_Server.exe).Hash.ToLowerInvariant()
Get-Content .\CHECKSUMS.sha256
```

Os dois valores devem ser iguais. A CI também recompila o servidor e exige igualdade byte a byte com o executável versionado.

### 3. Prepare o funcionamento offline

Com internet disponível, execute uma vez:

```text
PREPARAR_OFFLINE.bat
```

O script baixa os motores opcionais e valida cada arquivo por SHA-256 antes de substituir a cópia local. Depois dessa preparação, as funções principais podem ser usadas sem internet.

### 4. Abra o aplicativo

Execute:

```text
ABRIR_CENTRAL_PDF.bat
```

O servidor abre o navegador em um endereço local `127.0.0.1`. Ele não fica exposto à rede. Se o executável não estiver disponível, o inicializador pode usar Python como alternativa, quando instalado.

> Não abra `index.html` diretamente. O modo `file://` limita o Service Worker e pode impedir Workers usados pelo PDF.js.

### 5. Encerre com segurança

Conclua os downloads, salve o projeto se necessário e feche a janela do servidor. Os documentos de entrada continuam intactos.

## As 34 ferramentas

### Organização e edição

1. Organizar PDF
2. Editar PDF
3. Juntar PDFs
4. Dividir PDF
5. Extrair páginas
6. Girar páginas
7. Marca-d’água
8. Numerar páginas

### Conversão, extração e otimização

9. Imagens para PDF
10. Converter imagens
11. Comprimir PDF
12. PDF para imagens
13. Recortar PDF
14. Limpar metadados
15. Normalizar PDF
16. Extrair texto
17. OCR pesquisável
18. PDF para Office
19. Documentos para PDF
20. Extrair imagens do PDF
21. Preparar para arquivamento

### Inteligência documental

22. Assistente documental
23. Extração estruturada
24. Auditoria documental
25. Classificar e renomear

### Revisão, segurança e recuperação

26. Comparar PDFs
27. Censura definitiva
28. Criar formulário
29. Assinar e rubricar
30. Proteger PDF
31. Remover senha
32. Diagnosticar PDF
33. Recuperar PDF
34. Fixar formulários

Consulte a [relação detalhada dos módulos](docs/reference/MODULES.md) e o [guia completo do usuário](docs/guides/GUIA_DO_USUARIO_1.0.md).

## Recursos da sessão

- **Projetos:** salva a sessão em um arquivo `.cpdf` para continuar depois.
- **Processos:** acompanha tarefas em andamento e o histórico local.
- **Resultados:** reúne as saídas geradas para revisão e download.
- **Fluxos:** encadeia operações usadas com frequência.
- **Predefinições:** guarda configurações reutilizáveis.
- **Qualidade:** executa diagnóstico, auditoria das 34 ferramentas e exporta o relatório técnico.

Os dados da sessão ficam no armazenamento do navegador. Projetos importantes devem ser exportados, pois limpar os dados do site também remove esse armazenamento local.

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl+K` | Pesquisar ferramentas |
| `Alt+H` | Ir para o início |
| `Alt+R` | Abrir Resultados |
| `Alt+P` | Abrir Projetos |
| `Alt+Q` | Abrir Qualidade e diagnóstico |
| `Alt+A` | Abrir Acessibilidade |
| `F9` | Recolher ou expandir a barra lateral |
| `Ctrl+Shift+F` | Ativar o modo de foco |
| `?` | Abrir a ajuda |

## Como receber atualizações

### Site online

Toda alteração integrada à `main` passa pelos testes, monta o pacote estático, confere os motores por SHA-256 e é publicada automaticamente no GitHub Pages. Pull requests validam o mesmo pacote, mas não têm permissão para publicar.

Se o navegador ainda mostrar uma versão anterior após uma publicação, use `Ctrl+F5` para atualizar os arquivos em cache.

### Pacote local

1. Feche o aplicativo atual.
2. Guarde os arquivos `.cpdf` e os documentos exportados fora da pasta antiga.
3. Baixe novamente o [ZIP da `main`](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/archive/refs/heads/main.zip).
4. Extraia em uma **nova pasta**, sem misturar versões.
5. Repita a verificação do SHA-256.
6. Execute `PREPARAR_OFFLINE.bat` e depois `ABRIR_CENTRAL_PDF.bat`.
7. Importe os projetos salvos quando precisar continuar um trabalho.

## Atualizações técnicas avaliadas

Pesquisa revisada em **31 de julho de 2026**, usando páginas oficiais dos projetos e registros npm.

| Componente | Situação avaliada | Decisão |
| --- | --- | --- |
| Go | `1.26.5` é a versão estável atual | Manter; o executável continua reproduzível |
| pdf-lib | `1.17.1` é a versão atual | Manter |
| Tesseract.js e core | Projeto usa a linha `7.0.0` compatível entre biblioteca e motor | Manter o par testado |
| UTIF, heic2any, JSZip e libPDF | Versões locais permanecem atuais | Manter |
| PptxGenJS | Local `4.0.1`, distribuição oficial npm | Atualizado após teste dedicado de exportação PPTX e validação da estrutura Open XML |
| PDF.js | `6.2.108` legacy ESM, com Worker e recursos locais | Atualizado após auditoria; `isEvalSupported` permanece desativado como defesa em profundidade |
| GitHub Actions | Actions antigas usavam runtime Node legado | Atualizar para os majors atuais baseados em Node 24 |

O PDF.js anterior (`3.11.174`) estava na faixa afetada pela vulnerabilidade alta [GHSA-wgrm-67xf-hhpq](https://github.com/advisories/GHSA-wgrm-67xf-hhpq). A migração adotou a distribuição ESM corrigida, manteve o processamento local e passou a incluir CMaps, perfis ICC, fontes padrão, módulos WASM e licenças no pacote offline.

Fontes da pesquisa: [Go releases](https://go.dev/doc/devel/release), [pdf-lib](https://www.npmjs.com/package/pdf-lib), [PDF.js](https://www.npmjs.com/package/pdfjs-dist), [PptxGenJS 4.0.1](https://github.com/gitbrent/PptxGenJS/releases/tag/v4.0.1), [Tesseract.js](https://www.npmjs.com/package/tesseract.js), [GitHub Actions](https://github.com/actions).

## Privacidade e segurança

- O processamento acontece no navegador; não existe upload para um servidor da aplicação.
- O servidor local escuta apenas em `127.0.0.1`.
- O arquivo original não é sobrescrito automaticamente.
- Downloads de motores feitos por `PREPARAR_OFFLINE.bat` são validados por SHA-256.
- O executável ainda não possui assinatura Authenticode. O Windows SmartScreen pode exibir um aviso; compare o hash antes de continuar.
- Para documentos sigilosos, prefira o pacote local previamente preparado e mantenha a internet desconectada durante o trabalho.

Veja a [política de segurança](SECURITY.md) antes de relatar uma vulnerabilidade.

## Limitações importantes

- OCR pode reconhecer caracteres incorretamente; sempre revise o texto extraído.
- Conversões para Office não preservam perfeitamente macros, gráficos, fórmulas ou layouts complexos.
- **Assinar e rubricar** cria uma marca visual; não equivale a uma assinatura digital ICP-Brasil.
- **Preparar para arquivamento** melhora compatibilidade, mas não certifica conformidade PDF/A.
- Comparações, auditorias e assistentes são recursos de apoio, não parecer jurídico ou técnico conclusivo.
- A censura definitiva reconstrói páginas e pode remover links, formulários, comentários, camadas e assinaturas existentes.
- Arquivos muito grandes dependem da memória e do limite de armazenamento do navegador.

Leia a lista completa em [Limitações conhecidas](docs/reference/LIMITACOES_CONHECIDAS_1.0.md).

## Solução de problemas

### A janela não abriu

Execute novamente `ABRIR_CENTRAL_PDF.bat` e confirme que o firewall ou antivírus não bloqueou o processo local. Também é possível copiar o endereço `http://127.0.0.1:...` exibido na janela e abri-lo manualmente.

### Uma ferramenta informa que o motor está indisponível

Feche o aplicativo, conecte-se à internet e execute `PREPARAR_OFFLINE.bat` novamente. Não interrompa a validação dos downloads.

### O site parece desatualizado

Use `Ctrl+F5`. Se persistir, abra **Configurações > Qualidade** e execute o diagnóstico antes de limpar os dados do site. Limpar os dados remove projetos que não foram exportados.

### O processamento de um arquivo grande parou

Divida o documento em lotes menores, feche outras abas pesadas e tente novamente. O botão de cancelar pode aguardar a conclusão da etapa interna que já começou.

## Desenvolvimento e validação

Requisitos: Node.js 22, Python 3.12, Go 1.26.5 e Chromium do Playwright.

```powershell
python -m pip install -r requirements-test.txt
python -m playwright install chromium

Get-ChildItem .\assets\js\*.js | ForEach-Object { node --check $_.FullName }
node --check .\sw.js

Get-ChildItem .\tests\*.js | ForEach-Object { node $_.FullName }
Get-ChildItem .\tests\*.test.py | ForEach-Object { python $_.FullName }
python .\tests\static_integrity.py

Push-Location .\server
go test ./...
go vet ./...
Pop-Location
```

A CI repete essas verificações e também compara o executável Windows recompilado com `CentralPDF_Local_Server.exe`.

## Estrutura principal

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Entrada da aplicação |
| `assets/` | Interface, estilos, scripts e recursos visuais |
| `vendor/` | Motores locais usados pelo navegador |
| `server/` | Servidor HTTP local reproduzível em Go |
| `scripts/` | Preparação e verificação dos motores offline |
| `tests/` | Testes JavaScript, Python e de integridade |
| `docs/` | Guias, referências, relatórios e histórico |
| `.github/workflows/` | CI e publicação automática do GitHub Pages |

## Documentação

- [Guia completo do usuário](docs/guides/GUIA_DO_USUARIO_1.0.md)
- [Uso offline e projetos](docs/guides/OFFLINE_E_PROJETOS.md)
- [Acessibilidade](docs/guides/ACESSIBILIDADE_1.0.md)
- [Fluxos, resultados e predefinições](docs/guides/FLUXOS_RESULTADOS_E_PREDEFINICOES.md)
- [Limitações conhecidas](docs/reference/LIMITACOES_CONHECIDAS_1.0.md)
- [Estrutura do projeto](docs/reference/ESTRUTURA_DO_PROJETO.md)
- [Auditoria das 34 ferramentas](docs/testing/AUDITORIA_34_FERRAMENTAS_1.2.0.md)
- [Auditoria técnica e de segurança](docs/reports/AUDITORIA_TECNICA_1.2.0.md)
- [Histórico de alterações](CHANGELOG.md)

Contribuições devem ser feitas em uma branch, validadas pela CI e revisadas em pull request antes do merge na `main`.
