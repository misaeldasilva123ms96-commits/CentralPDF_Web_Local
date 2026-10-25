# Central PDF & Imagem 2.0.1

<p align="center">
  <img src="assets/icons/icon-192.png" width="80" height="80" alt="Ícone do Central PDF & Imagem" />
</p>

<p align="center"><strong>Seus PDFs e imagens, organizados no seu dispositivo.</strong><br />
34 ferramentas para editar, organizar, converter e revisar documentos no navegador.</p>

[![CI](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/ci.yml/badge.svg)](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/ci.yml)
[![Pages](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml/badge.svg)](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/actions/workflows/pages.yml)

**[Abrir o aplicativo](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/)** · **[Baixar para Windows](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/releases/latest)** · **[Documentação](docs/README.md)** · **[Contribuir](CONTRIBUTING.md)**

O processamento de PDFs e imagens acontece no navegador, sem upload dos documentos para um servidor da aplicação. Use o site ou um servidor local no computador. O diagnóstico compartilhado com Sentry é opcional, exige autorização em cada navegador e envia apenas categorias técnicas previstas — não os documentos.

> **Estado da documentação — 25/10/2026.** O site usa a aplicação da raiz (`index.html` + `assets/`). A migração React/TypeScript em [`app/`](app/README.md) é separada e ainda não substitui o produto publicado. O número da versão continua **2.0.1**; a `main` contém melhorias posteriores à release Windows de mesmo número. Consulte o [histórico](CHANGELOG.md) e a data da release antes de comparar as distribuições.

**Nesta página:** [Começar](#começar) · [Editor](#editor-pdf) · [Ferramentas](#as-34-ferramentas) · [Projetos](#projetos-e-continuidade) · [Privacidade](#privacidade-e-diagnósticos) · [Suporte](#solução-de-problemas) · [Desenvolvimento](#desenvolvimento)

## Começar

| Opção | Como usar | O que considerar |
| --- | --- | --- |
| **Site** | [Abrir no navegador](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/) | Recebe as mudanças publicadas da `main`; o primeiro acesso carrega interface e motores. |
| **Windows** | Extrair o ZIP de [Releases](https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/releases/latest) e executar `ABRIR_CENTRAL_PDF.bat` | Pacote independente do site; conferir a data, o hash e os motores offline. |
| **Código-fonte** | Servir a raiz por HTTP local | Instruções e validação em [Contribuir](CONTRIBUTING.md). |

### Pelo site

1. Escolha uma ferramenta ou use `Ctrl+K` para pesquisar.
2. Adicione arquivos por clique ou arraste. Na Home, **Abrir arquivos** ajuda a escolher uma ferramenta compatível.
3. Confira a sequência, as páginas e as opções. Em **Juntar PDFs**, as capas representam os documentos inteiros; “Só capas” não exclui suas páginas.
4. Ajuste o **Nome do arquivo final** e execute a operação.
5. Revise o resultado e faça o download. O original não é sobrescrito automaticamente.

Espaços e acentos do nome escolhido são preservados; caracteres inválidos para nomes de arquivo são tratados. Depois do download, as ações permitem continuar com os arquivos atuais ou iniciar outra tarefa.

### No Windows

1. Baixe o ZIP da release e **extraia todo o conteúdo** para uma pasta comum.
2. Abra o PowerShell nessa pasta e confira o executável:

   ```powershell
   (Get-FileHash -Algorithm SHA256 .\CentralPDF_Local_Server.exe).Hash.ToLowerInvariant()
   Get-Content .\checksums.sha256
   ```

   Compare o hash calculado com a entrada de `CentralPDF_Local_Server.exe`.
3. O pacote de release inclui motores offline verificados. Se estiver usando uma cópia do código-fonte, faltarem motores ou precisar reparar a preparação, execute `PREPARAR_OFFLINE.bat` **com internet**.
4. Execute `ABRIR_CENTRAL_PDF.bat`. O servidor Go abre o navegador em `127.0.0.1`, em uma porta disponível. O inicializador também oferece fallback para Python na porta `8765`.
5. Salve resultados e projetos antes de encerrar o servidor.

Não abra o aplicativo de dentro do ZIP nem use `file://`: Workers, módulos ESM e cache podem falhar. Veja [Offline e projetos](docs/guides/OFFLINE_E_PROJETOS.md).

<details>
<summary><strong>Conferir a procedência de uma release</strong></summary>

Com o [GitHub CLI](https://cli.github.com/), na pasta dos arquivos baixados:

```powershell
gh attestation verify .\CentralPDF_Web_Local_vX.Y.Z.zip --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local
gh attestation verify .\CentralPDF_Local_Server.exe --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local
gh attestation verify .\CentralPDF_Web_Local_vX.Y.Z.sha256 --repo misaeldasilva123ms96-commits/CentralPDF_Web_Local
```

Substitua `X.Y.Z` pela versão baixada. A atestação vincula o artefato ao workflow e ao commit que o produziram. O executável ainda não tem assinatura Authenticode reconhecida pelo Windows.

</details>

## Editor PDF

| Recurso | Comportamento atual |
| --- | --- |
| **Texto adicionado** | Caixa inicial compacta; texto, fonte, tamanho, cor e formatação na barra contextual junto à página. |
| **Texto original** | Modo Avançado → Texto original → selecionar trecho → conferir prévia → aplicar. Reescreve o trecho compatível no PDF e informa quando precisa usar fonte alternativa. |
| **Imagens** | Inserção compacta, arraste, oito alças de tamanho e alça de rotação. Duplicar, excluir, medidas, proporção, alinhamento e camadas em **Ações da imagem selecionada**, recolhível acima da página, acessível por toque. Sem painel suspenso sobre a imagem. |
| **Páginas** | Miniaturas sob demanda, reordenação, seleção em lote, rotação, exclusão e substituição com prévia e confirmação. |
| **Conferência** | **Original e resultado**, Desfazer/Refazer e exportação em nova cópia. |

A edição original depende da estrutura e das fontes do PDF. Digitalizações não viram texto visual editável ao executar OCR; parágrafos não são recompostos automaticamente. Consulte o [guia do editor](docs/guides/EDITOR_PDF.md) e a [compatibilidade de texto original](docs/editor-native-text.md).

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

O catálogo é do aplicativo publicado na raiz. A disponibilidade na migração React é diferente; consulte o [README de `app/`](app/README.md). Veja também a [referência das ferramentas](docs/reference/MODULES.md).

## Projetos e continuidade

| Área | Para que serve | Persistência |
| --- | --- | --- |
| **Projetos** | Exportar e reabrir um `.cpdf` com arquivos e estado compatível da ferramenta. | Arquivo salvo por você. Contém cópias dos documentos; proteja-o como o original. |
| **Recuperação automática** | Recuperar trabalho após alterações, quando habilitada e dentro dos limites. | Armazenamento do navegador; não substitui o projeto exportado. |
| **Resultados** | Baixar novamente ou encaminhar a saída a outra ferramenta. | Memória da aba; desaparece ao fechá-la. |
| **Processos** | Acompanhar tarefas e progresso. | Memória da sessão; não é uma fila de servidor. |
| **Fluxos e predefinições** | Reutilizar sequências e ajustes. | Preferências locais; senhas e arquivos não integram as predefinições. |

Os dados locais dependem do perfil e da origem — inclusive a porta no uso local. Limpar dados do site pode apagar preferências, diagnósticos e recuperação. Exporte os projetos importantes. [Mais sobre continuidade](docs/guides/OFFLINE_E_PROJETOS.md).

## Privacidade e diagnósticos

- **Documentos:** processamento no dispositivo; servidor Go limitado a `127.0.0.1`, sem rota de upload.
- **Motores:** versões fixas e verificação SHA-256 na preparação offline. Carregar recursos do site ou de fornecedores é diferente de enviar documentos.
- **Logs locais:** até 250 registros únicos, com repetições agrupadas, no navegador atual. É possível buscar, copiar, baixar e limpar em **Qualidade / Autodiagnóstico**. Revise o arquivo antes de compartilhá-lo: ele pode conter nomes e mensagens técnicas.
- **Sentry opcional:** destino configurado, envio desligado por padrão até consentimento em cada navegador. Envia categorias e metadados técnicos limitados, sem PDFs, imagens, textos digitados, nomes de arquivos ou histórico local. O serviço receptor observa metadados normais da conexão, como IP e cabeçalhos.
- **Consulta central:** disponível ao responsável no painel privado do Sentry; não representa todos os usuários nem todas as falhas. Limpar logs locais não apaga eventos já recebidos pelo serviço.

Leia a [política de segurança](SECURITY.md) e o [guia dos diagnósticos](docs/diagnosticos-sentry.md).

## Limitações que merecem revisão

- OCR pode errar; conversões Office podem simplificar layout, fórmulas e gráficos.
- **Assinar e rubricar** cria marca visual, sem assinatura digital ICP-Brasil.
- **Preparar para arquivamento** não certifica conformidade PDF/A.
- Cobrir uma área no editor não remove necessariamente o conteúdo interno. Use a ferramenta específica de **Censura definitiva** e confira a saída.
- Reconstrução/rasterização de páginas pode perder texto selecionável, links, formulários, comentários e assinaturas digitais.
- Auditorias, comparações e assistentes são apoio à revisão humana. Arquivos grandes dependem de memória, armazenamento e capacidade do navegador.
- O cancelamento é cooperativo: pode aguardar a etapa atual e não desfaz downloads já iniciados.

Veja [Limitações conhecidas](docs/reference/LIMITACOES_CONHECIDAS_1.0.md).

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl+K` | Pesquisar ferramentas |
| `Alt+H` | Início |
| `Alt+R` | Resultados |
| `Alt+P` | Projetos |
| `Alt+Q` | Qualidade e diagnóstico |
| `Alt+A` | Acessibilidade |
| `F9` | Alternar barra lateral |
| `Ctrl+Shift+F` | Modo de foco |
| `?` | Ajuda |

No editor: `Ctrl+Z` desfaz; `Ctrl+Y` ou `Ctrl+Shift+Z` refaz; `Ctrl+D` duplica o objeto selecionado; `Delete` o exclui. Esses atalhos de objeto não atuam enquanto você digita em um campo.

## Solução de problemas

| Situação | Próximo passo |
| --- | --- |
| Site aparenta versão antiga | Salve o trabalho, recarregue e tente `Ctrl+F5`. Se persistir, confira Qualidade antes de limpar dados do site. |
| Motor indisponível | Confira **Sistema** e, no pacote local, prepare novamente com `PREPARAR_OFFLINE.bat` e internet. |
| Servidor local não abriu | Execute o inicializador na pasta extraída; confira antivírus e copie o endereço `127.0.0.1` exibido pelo servidor. |
| Texto original não seleciona ou rejeita caracteres | Confira o modo Avançado e os [limites de fontes/estrutura](docs/editor-native-text.md). Não confunda digitalização com texto editável. |
| Arquivo grande interrompeu o processamento | Tente lotes menores, feche abas pesadas e preserve o original. |
| Precisa relatar erro | Exporte o diagnóstico, revise informações sensíveis e informe ferramenta, navegador e passos de reprodução, preferindo um exemplo sintético. |

Para atualizar o Windows, baixe a release desejada em **nova pasta**, confira os hashes e reabra os projetos exportados. O site e o ZIP têm ciclos de atualização distintos; atualizar um não atualiza o outro.

## Desenvolvimento

A aplicação publicada é estática. Para iniciar pela raiz:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8765/`. Motores locais completos exigem a preparação offline; o comando Python não os baixa. Para instalar dependências de teste, validar o código ou trabalhar na migração React, siga [CONTRIBUTING.md](CONTRIBUTING.md).

### Atualizações técnicas avaliadas

Estas são **versões adotadas no repositório**, não uma afirmação sobre a última versão disponível nos fornecedores:

| Componente | Referência atual |
| --- | --- |
| Produto e pacote React | `2.0.1`; distribuições podem apontar para commits diferentes |
| PDF.js | `6.2.108`, legacy ESM com Worker, fontes, CMaps e WASM |
| pdf-lib | `1.17.1` |
| Tesseract.js / core | `7.0.0`, com idiomas português e inglês na preparação offline |
| Go | CI e compilação reproduzível em `1.26.10`; `go.mod` declara `1.23` |
| Node.js / Python | CI em Node.js `22` e Python `3.12` |
| Migração da interface | React `19`, TypeScript `5`, Vite `7` |

A CI valida as duas interfaces e o executável. O workflow Pages monta o site da raiz; publica em eventos elegíveis da `main`, e não em pull requests. Releases Windows são geradas por um fluxo próprio baseado em tags. [Arquitetura e distribuição](docs/reference/ESTRUTURA_DO_PROJETO.md).

## Documentação

- **[Central de documentação](docs/README.md):** caminhos para usuários, desenvolvimento e histórico.
- [Guia do usuário](docs/guides/GUIA_DO_USUARIO_1.0.md) e [editor PDF](docs/guides/EDITOR_PDF.md).
- [Offline e projetos](docs/guides/OFFLINE_E_PROJETOS.md), [fluxos e resultados](docs/guides/FLUXOS_RESULTADOS_E_PREDEFINICOES.md) e [acessibilidade](docs/guides/ACESSIBILIDADE_1.0.md).
- [Segurança](SECURITY.md), [diagnósticos opcionais](docs/diagnosticos-sentry.md) e [componentes de terceiros](THIRD_PARTY_NOTICES.md).
- [Histórico de alterações](CHANGELOG.md) e [notas das releases](docs/releases/2.0.1.md).

Contribuições passam por branch, validação e pull request antes da integração à `main`.
