(() => {
  'use strict';
  const aliases = {
    documentsToPdf: 'office ofice word doc docx odt excel xls xlsx ods calc planilha powerpoint ppt pptx odp impress documento converter pdf',
    pdfToOffice: 'office ofice word docx excel xlsx planilha powerpoint pptx converter pdf',
    imagesToPdf: 'imagens para pdf jpg jpeg png webp imagem foto converter pdf',
    pdfToImage: 'jpg jpeg png webp imagem foto converter pdf'
  };
  const normalize = value => String(value || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  function matches(query, tool, ...labels) {
    const words = normalize(query).split(/\s+/).filter(word => word && !['para', 'em', 'de', 'do', 'da'].includes(word));
    const haystack = normalize([...labels, aliases[tool] || ''].join(' '));
    return words.every(word => haystack.includes(word));
  }
  window.CentralPDFToolSearch = Object.freeze({ matches });
})();
