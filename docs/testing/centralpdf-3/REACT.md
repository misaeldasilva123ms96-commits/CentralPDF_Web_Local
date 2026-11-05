# Checkpoint 5 — migração React parcial

Entrega empilhada após aplicativo original e Admin. **Não substitui nem publica
a aplicação da raiz.** A versão técnica permanece 2.0.1; disponibilidade e limites
das ferramentas existentes continuam explícitos no catálogo.

## Implementação

- Marca SVG local e linguagem 3.0 em Home, navegação, cartões, workspace, painel
  de ajustes, arquivos, progresso, erros e resultados reais.
- Tokens claros/escuros com contraste, foco, redução de movimento e fallback
  para cores forçadas.
- Comando de tema acessível com preferência própria `centralpdf-react-theme`,
  tolerando storage indisponível. Não mistura preferências do site e do Admin.
- Alternar o tema mantém a ferramenta e o estado do workspace.

## Verificação

- **241 testes Vitest passaram**, incluindo o novo cenário de alternância com
  preservação do workspace e restauração da preferência.
- TypeScript e build passaram.
- `app/tests/design-browser.py` exercita o build local em 320/390/768/1440 px,
  claro/escuro, verifica a marca e overflow e realiza uma fusão/download de PDFs
  sintéticos. Reabre o PDF e verifica as cinco páginas por dimensões distintas;
  registra SHA-256 e capturas. A validação de navegador deve ser conferida no
  relatório antes de aprovar.

A primeira execução de suítes simultâneas excedeu o orçamento do ambiente (duas
CPUs), com timeouts de testes e de início dos workers. As verificações foram
repetidas em sequência; nenhum timeout foi convertido em PASS nem houve aumento
dos limites para ocultá-lo. Avisos esperados de Canvas do jsdom nos testes de
limites de rasterização não substituem a validação em navegador.

## Pendências e rollback

Revisão manual de UX, leitor de tela, toque físico e zoom 200%. Os motores
experimentais continuam experimentais; não se promove o catálogo parcial.

Rollback: reverter estilo 3.0, marca e apresentação/preferência do tema; não
apagar os arquivos do usuário ou o estado do produto principal.
