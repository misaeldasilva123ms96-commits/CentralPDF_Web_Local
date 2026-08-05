(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdvancedPlanner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function assertPageCount(pageCount) {
    const value = Number(pageCount);
    if (!Number.isInteger(value) || value < 1) throw new Error('Quantidade de páginas inválida.');
    return value;
  }

  function parsePageSpec(text, pageCount, options = {}) {
    const count = assertPageCount(pageCount);
    const input = String(text || '').trim();
    if (!input) throw new Error('Informe as páginas. Exemplo: 1-3,5.');
    const result = [];
    const seen = new Set();
    for (const rawToken of input.split(',')) {
      const token = rawToken.trim();
      if (!token) continue;
      let values = [];
      const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start > end) throw new Error(`Intervalo invertido: ${token}`);
        values = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      } else if (/^\d+$/.test(token)) {
        values = [Number(token)];
      } else {
        throw new Error(`Página ou intervalo inválido: ${token}`);
      }
      for (const pageNumber of values) {
        if (pageNumber < 1 || pageNumber > count) throw new Error(`A página ${pageNumber} não existe. O PDF possui ${count} página(s).`);
        const zeroBased = pageNumber - 1;
        if (options.allowDuplicates || !seen.has(zeroBased)) {
          result.push(zeroBased);
          seen.add(zeroBased);
        }
      }
    }
    if (!result.length) throw new Error('Nenhuma página válida foi informada.');
    return result;
  }

  function complementPages(selected, pageCount) {
    const selectedSet = new Set(selected);
    return Array.from({ length: assertPageCount(pageCount) }, (_, index) => index).filter(index => !selectedSet.has(index));
  }

  function resolveScope(mode, pageCount, pageText = '') {
    const count = assertPageCount(pageCount);
    switch (mode) {
      case 'all': return Array.from({ length: count }, (_, index) => index);
      case 'selected': return parsePageSpec(pageText, count);
      case 'exclude': return complementPages(parsePageSpec(pageText, count), count);
      case 'odd': return Array.from({ length: count }, (_, index) => index).filter(index => index % 2 === 0);
      case 'even': return Array.from({ length: count }, (_, index) => index).filter(index => index % 2 === 1);
      case 'first': return [0];
      case 'last': return [count - 1];
      default: throw new Error(`Modo de páginas desconhecido: ${mode}`);
    }
  }

  function parseGroups(text, pageCount, allowDuplicates = false) {
    const groups = String(text || '').split(';').map(item => item.trim()).filter(Boolean);
    if (!groups.length) throw new Error('Informe pelo menos um grupo separado por ponto e vírgula.');
    return groups.map(group => parsePageSpec(group, pageCount, { allowDuplicates }));
  }

  function buildExtractPlan(mode, pageCount, options = {}) {
    const count = assertPageCount(pageCount);
    let groups;
    switch (mode) {
      case 'single': groups = [parsePageSpec(options.pages, count, { allowDuplicates: Boolean(options.allowDuplicates) })]; break;
      case 'groups': groups = parseGroups(options.groups, count, Boolean(options.allowDuplicates)); break;
      case 'remove': {
        const kept = complementPages(parsePageSpec(options.pages, count), count);
        if (!kept.length) throw new Error('A remoção excluiria todas as páginas.');
        groups = [kept];
        break;
      }
      case 'odd': groups = [resolveScope('odd', count)]; break;
      case 'even': {
        const pages = resolveScope('even', count);
        if (!pages.length) throw new Error('Este PDF não possui páginas pares.');
        groups = [pages];
        break;
      }
      case 'oddEven': {
        const odd = resolveScope('odd', count);
        const even = resolveScope('even', count);
        groups = even.length ? [odd, even] : [odd];
        break;
      }
      default: throw new Error(`Modo de extração desconhecido: ${mode}`);
    }
    return groups;
  }

  function parsePerFileRanges(text, fileCount) {
    const count = Number(fileCount);
    if (!Number.isInteger(count) || count < 1) return [];
    const tokens = String(text || '').split(';').map(item => item.trim());
    return Array.from({ length: count }, (_, index) => tokens[index] || 'all');
  }

  function buildMergePlan(pageCounts, perFileText) {
    const specs = parsePerFileRanges(perFileText, pageCounts.length);
    return pageCounts.map((pageCount, index) => {
      const spec = specs[index];
      const pages = /^all$/i.test(spec) || !spec ? resolveScope('all', pageCount) : parsePageSpec(spec, pageCount, { allowDuplicates: true });
      return { fileIndex: index, pages, spec };
    });
  }

  function formatPages(pages) {
    if (!pages.length) return 'nenhuma';
    const numbers = [...pages].map(index => index + 1);
    const parts = [];
    let start = numbers[0];
    let previous = numbers[0];
    for (let index = 1; index <= numbers.length; index++) {
      const current = numbers[index];
      if (current === previous + 1) {
        previous = current;
        continue;
      }
      parts.push(start === previous ? String(start) : `${start}-${previous}`);
      start = current;
      previous = current;
    }
    return parts.join(',');
  }

  function compressionProfile(mode, custom = {}) {
    if (mode === 'preserve') return { rasterize: false, adaptive: false, attempts: [], targetReduction: 0, grayscale: false };
    if (mode === 'recommended') return {
      rasterize: true, adaptive: true, targetReduction: .48, grayscale: false,
      largeDocumentAttempt: { dpi: 52, quality: .27, minImageCoverage: .008 },
      attempts: [
        { dpi: 78, quality: .48, minImageCoverage: .05 },
        { dpi: 64, quality: .36, minImageCoverage: .02 },
        { dpi: 56, quality: .30, minImageCoverage: .01 }
      ]
    };
    if (mode === 'extreme') return {
      rasterize: true, adaptive: true, targetReduction: .60, grayscale: false,
      largeDocumentAttempt: { dpi: 46, quality: .22, minImageCoverage: .005 },
      attempts: [
        { dpi: 60, quality: .34, minImageCoverage: .02 },
        { dpi: 52, quality: .27, minImageCoverage: .008 },
        { dpi: 46, quality: .22, minImageCoverage: .005 }
      ]
    };
    if (mode === 'custom') {
      const dpi = Math.max(40, Math.min(300, Number(custom.dpi || 96)));
      const quality = Math.max(.2, Math.min(1, Number(custom.quality || 52) / 100));
      return { rasterize: true, adaptive: false, dpi, quality, minImageCoverage: 0, grayscale: Boolean(custom.grayscale) };
    }
    throw new Error(`Perfil de compressão desconhecido: ${mode}`);
  }
  function chooseCompressionCandidate(candidates, originalSize, targetReduction = 0) {
    const list = (candidates || []).filter(item => item?.bytes?.byteLength >= 0).map(item => ({
      ...item,
      reduction: originalSize ? 1 - item.bytes.byteLength / originalSize : 0
    }));
    if (!list.length) return null;
    const target = list.find(item => item.reduction >= targetReduction);
    if (target) return target;
    return list.reduce((best, item) => item.bytes.byteLength < best.bytes.byteLength ? item : best);
  }

  function normalizeHexColor(value, fallback = '#000000') {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
  }

  return {
    parsePageSpec,
    complementPages,
    resolveScope,
    parseGroups,
    buildExtractPlan,
    parsePerFileRanges,
    buildMergePlan,
    formatPages,
    compressionProfile,
    chooseCompressionCandidate,
    normalizeHexColor,
  };
});
