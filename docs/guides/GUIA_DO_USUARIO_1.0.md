# Guia do usuário — Central PDF & Imagem

Referência da versão declarada **2.0.1**, revisada em **29/10/2026**. O nome deste arquivo foi mantido para preservar os links existentes.

[Documentação](../README.md) · [Editor PDF](EDITOR_PDF.md) · [Offline e projetos](OFFLINE_E_PROJETOS.md)

## Escolha como abrir

- **Site:** acesse o [Central PDF & Imagem](https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/). A interface e os motores são carregados pelo navegador; os documentos são processados no dispositivo.
- **Windows:** extraia o pacote de Releases, confira o hash e execute `ABRIR_CENTRAL_PDF.bat`. Se faltarem motores, prepare-os com `PREPARAR_OFFLINE.bat` enquanto houver internet.
- **Código-fonte:** use um servidor HTTP na raiz. Evite abrir `index.html` por `file://`, que limita Workers, módulos e cache.

A versão do site acompanha as publicações da `main`; o ZIP corresponde à sua release e pode ser anterior, mesmo com o mesmo número de versão.

## Fluxo básico

1. Escolha uma ferramenta por busca, categoria, favoritos ou recentes. A Home também aceita **Abrir arquivos** e arraste, oferecendo ferramentas compatíveis.
2. Adicione os arquivos e confira formatos, quantidade e avisos. Algumas ferramentas aceitam um documento por operação; siga a orientação para remover o anterior antes de substituí-lo.
3. Confira páginas, sequência e configurações. Em **Juntar PDFs**, “Só capas” representa documentos inteiros e não remove as páginas internas.
4. Defina o **Nome do arquivo final**. Espaços e acentos são preservados, com tratamento de caracteres inválidos para nomes de arquivo.
5. Execute, acompanhe o progresso e revise a saída. O original não é sobrescrito automaticamente.
6. Na conclusão, continue usando os arquivos atuais ou inicie outra tarefa. **Resultados** permite reutilizar saídas na mesma aba.

## Editar documentos

O [guia do editor](EDITOR_PDF.md) explica os modos Simples/Avançado, texto original, imagens, organização de páginas e exportação. Os controles de texto ficam junto à página. As imagens têm ações recolhíveis acima dela, com botões acessíveis por toque e sem barra suspensa sobre o documento.

Use **Original e resultado** e **Desfazer/Refazer** antes de exportar. Edição pode invalidar assinaturas digitais; assinatura visual não equivale a certificado ICP-Brasil.

## Trabalhos longos e privacidade

- Exporte **Projetos → Salvar projeto atual** para obter um `.cpdf` com cópias dos documentos e estado compatível da ferramenta.
- **Recuperação automática** depende do armazenamento do navegador e possui limite de tamanho; não substitui um projeto salvo por você.
- **Processos** acompanha tarefas; **Resultados** mantém arquivos na memória da aba, sem persistir após fechá-la.
- Prepare os motores offline antes de trabalhar sem internet. Limpar dados do site pode apagar a recuperação, preferências e logs locais.

Consulte [Offline e projetos](OFFLINE_E_PROJETOS.md) e [Fluxos, resultados e predefinições](FLUXOS_RESULTADOS_E_PREDEFINICOES.md).

## Diagnóstico e suporte

Abra **Qualidade / Autodiagnóstico** pelo menu de configurações ou `Alt+Q`. A verificação informa motores, ferramentas, modo de execução, armazenamento e recursos disponíveis.

O registro local possui até **250 registros únicos**, agrupando repetições. Use busca/filtro, copiar, baixar ou limpar. O contador de ocorrências não representa pessoas; os logs pertencem ao navegador e à origem atuais. Revise o JSON antes de compartilhá-lo, pois pode conter nomes e mensagens técnicas.

O envio de novos erros técnicos para **Sentry** é automático por padrão. Em Qualidade / Autodiagnóstico, desmarque **Compartilhar erros técnicos automaticamente** para desativá-lo; desativações anteriores são preservadas. Compartilhar tempos de processamento exige marcar uma segunda opção, inicialmente desativada. O responsável consulta eventos recebidos no painel privado do serviço; arquivos e logs antigos não são enviados automaticamente. Desmarcar revoga o envio futuro; limpar a lista local não apaga eventos centrais. [Detalhes e limites](../diagnosticos-sentry.md).

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl+K` | Buscar ferramentas |
| `Alt+H` | Início |
| `Alt+R` | Resultados |
| `Alt+P` | Projetos |
| `Alt+Q` | Diagnóstico |
| `Alt+A` | Acessibilidade |
| `?` | Ajuda |
| `F9` | Alternar barra lateral |
| `Ctrl+Shift+F` | Modo de foco |

Consulte também [Acessibilidade](ACESSIBILIDADE_1.0.md), [Segurança](../../SECURITY.md) e [Limitações conhecidas](../reference/LIMITACOES_CONHECIDAS_1.0.md).
