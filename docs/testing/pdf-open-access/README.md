# PDFs que abrem sem senha — correção da entrada

## Causa e comportamento

Os dois anexos privados abrem com senha de usuário vazia. Ambos usam AES-128,
revisão 4, com restrições de permissões. `pdf-lib` rejeita qualquer `/Encrypt`
na carga estrita; a mensagem era interpretada como exigência de senha de abertura.

A entrada comum agora tenta somente a senha vazia em um Worker descartável com
QPDF 12.2.0. A saída nativa é revalidada pelo parser e usada como cópia de
trabalho, mantendo nome, MIME e data do arquivo. Não usa `ignoreEncryption`,
não rasteriza páginas e não envia documentos pela rede. Uma senha real continua
necessária e o arquivo protegido continua rejeitado na entrada comum.

Diagnosticar, Recuperar, Desbloquear e Classificar/renomear mantêm os bytes originais na entrada. A classificação analisa o original com PDF.js e inclui no ZIP exatamente os mesmos bytes, preservando criptografia e assinaturas; apenas o nome muda.
Desbloquear permite o campo vazio apenas quando a inspeção já comprovou a
abertura sem senha. Originais em disco permanecem inalterados. Estruturas de
assinatura continuam detectadas para os avisos existentes; regravar um PDF não
preserva a validade criptográfica de uma assinatura.

## Runtime e distribuição

- Pacote fixado `@neslinesli93/qpdf-wasm` 0.3.1, QPDF 12.2.0, single-thread.
- JS/WASM locais versionados (aproximadamente 1,3 MB) e hashes verificados também
  pelo preparo offline; sem SharedArrayBuffer, COOP/COEP ou popup.
- Worker terminado após sucesso, erro ou timeout. Logs nativos ficam privados
  no Worker e apenas códigos de erro classificados chegam ao aplicativo.
- Servidor local permite compilação WASM somente na resposta desse Worker;
  JavaScript eval e rede externa seguem bloqueados nesse contexto.
- Windows recompilado com Go 1.26.10 e flags reproduzíveis; checksum atualizado.
- Cache pages-53 e URLs da entrada renovadas. Catálogo Admin sincronizado;
  nenhuma mudança em Auth, MFA, banco, preferências ou formato de projetos.

## Evidências e privacidade

`tests/pdf-open-access.test.py` usa os parsers e Worker reais, inclusive sem
isolamento de origem e com a CSP restrita. Os fixtures públicos são sintéticos:
AES-128/AES-256 com senha de abertura vazia, senha verdadeira e PDF comum.
Os anexos privados e suas cópias processadas não foram adicionados ao Git.

Execuções direcionadas passaram em Chromium e Firefox:

- Os dois anexos reais aceitos, nomes preservados e união baixada/reaberta.
- Texto, dimensões e pixels renderizados da união idênticos aos originais.
- Originais em disco com hashes inalterados; nenhuma escrita de rede.
- Controle com senha verdadeira ainda rejeitado e PDF comum aceito.
- Entrada de Editar, Dividir, Organizar, PDF para imagens e Diagnosticar.
- Desbloqueio sem digitar senha nos arquivos que comprovadamente já abrem assim.
- ZIP de classificação/renomeação baixado e aberto: cada PDF é idêntico byte a byte ao original, em ambos os navegadores.
- Encerramento da análise pelo loading task do PDF.js, compatível com o motor atual.
- Mesmo contrato com fixtures AES-128/AES-256, em `synthetic-report.json`.
- Testes Go/vet, ingestão JavaScript, contenção de recuperação e migração de cache.

A suíte completa e os checks da PR registram a validação integrada. Uma primeira
execução local da suíte completa encontrou uma diferença na contagem de eventos
no teste de telemetria; a repetição isolada passou sem alterações. O resultado
da CI deve ser consultado antes da integração. Não foram alterados testes ou transporte de
telemetria para contornar essa falha.

## Rollback

Reverter a normalização, arquivos locais do QPDF e a exceção CSP como unidade,
recompilar o servidor e avançar a revisão de cache novamente. Não apagar os
arquivos, projetos ou preferências dos usuários. Esta entrega permanece em PR
para revisão; não publica o site, Admin, tag ou ZIP Windows automaticamente.
