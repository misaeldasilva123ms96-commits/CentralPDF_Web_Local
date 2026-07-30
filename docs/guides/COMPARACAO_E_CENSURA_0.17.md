# Comparação e censura definitiva — 0.17

## Comparar PDFs

Adicione exatamente dois PDFs. O primeiro é tratado como original e o segundo como revisado. O pacote ZIP contém `relatorio.html`, `relatorio.json` e, quando habilitado, imagens original/revisada/diferenças por página.

A comparação textual normaliza espaços e pode ignorar maiúsculas. A visual compara os pixels renderizados. Pequenas diferenças de fonte, scanner e renderização podem gerar alertas.

## Censura definitiva

Marque áreas arrastando sobre a página ou use a localização de texto. As páginas afetadas são renderizadas, recebem a censura e são reconstruídas em um PDF novo. O conteúdo original dessas páginas não é copiado.

O modo **reconstruir todas as páginas** oferece sanitização máxima, mas remove texto selecionável, links, formulários, anotações e assinaturas digitais de todo o documento.

O relatório JSON registra o hash SHA-256 de entrada e saída, páginas reconstruídas e quantidade de áreas. Preserve sempre o original em local separado.
