(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SplitPlanner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function integer(value, label) {
    const number = Number(value);
    if (!Number.isInteger(number)) throw new Error(`${label} deve ser um número inteiro.`);
    return number;
  }

  function validatePageCount(pageCount) {
    const total = integer(pageCount, 'A quantidade de páginas');
    if (total < 1) throw new Error('O PDF não possui páginas válidas.');
    return total;
  }

  function parsePageExpression(text, pageCount) {
    const total = validatePageCount(pageCount);
    const source = String(text || '').trim();
    if (!source) throw new Error('Informe as páginas. Exemplo: 1-3,5.');
    const result = [];
    const seen = new Set();
    for (const rawToken of source.split(',')) {
      const token = rawToken.trim();
      if (!token) continue;
      let numbers = [];
      const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start > end) throw new Error(`Intervalo invertido: ${token}.`);
        numbers = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      } else if (/^\d+$/.test(token)) {
        numbers = [Number(token)];
      } else {
        throw new Error(`Página ou intervalo inválido: ${token}.`);
      }
      for (const pageNumber of numbers) {
        if (pageNumber < 1 || pageNumber > total) {
          throw new Error(`A página ${pageNumber} não existe. O PDF possui ${total} página(s).`);
        }
        const zeroBased = pageNumber - 1;
        if (!seen.has(zeroBased)) {
          seen.add(zeroBased);
          result.push(zeroBased);
        }
      }
    }
    if (!result.length) throw new Error('Nenhuma página válida foi informada.');
    return result;
  }

  function parseCustomGroups(text, pageCount) {
    const source = String(text || '').trim();
    if (!source) throw new Error('Informe ao menos um grupo. Exemplo: 1-2;3-5;6.');
    const chunks = source.split(/[;\n]+/).map(item => item.trim()).filter(Boolean);
    if (!chunks.length) throw new Error('Nenhum grupo válido foi informado.');
    return chunks.map(chunk => parsePageExpression(chunk, pageCount));
  }

  function buildEveryPage(pageCount) {
    const total = validatePageCount(pageCount);
    return Array.from({ length: total }, (_, index) => [index]);
  }

  function buildFixedSize(pageCount, size) {
    const total = validatePageCount(pageCount);
    const chunkSize = integer(size, 'A quantidade de páginas por arquivo');
    if (chunkSize < 1) throw new Error('A quantidade de páginas por arquivo deve ser maior que zero.');
    const groups = [];
    for (let start = 0; start < total; start += chunkSize) {
      groups.push(Array.from({ length: Math.min(chunkSize, total - start) }, (_, index) => start + index));
    }
    return groups;
  }

  function buildEqualParts(pageCount, parts) {
    const total = validatePageCount(pageCount);
    const count = integer(parts, 'A quantidade de partes');
    if (count < 2) throw new Error('Informe pelo menos 2 partes.');
    if (count > total) throw new Error(`Não é possível criar ${count} partes com apenas ${total} página(s).`);
    const baseSize = Math.floor(total / count);
    const remainder = total % count;
    const groups = [];
    let cursor = 0;
    for (let index = 0; index < count; index++) {
      const size = baseSize + (index < remainder ? 1 : 0);
      groups.push(Array.from({ length: size }, (_, offset) => cursor + offset));
      cursor += size;
    }
    return groups;
  }

  function buildFromCuts(pageCount, cutsText) {
    const total = validatePageCount(pageCount);
    const source = String(cutsText || '').trim();
    if (!source) throw new Error('Informe os pontos de corte. Exemplo: 2,5.');
    const cuts = [];
    const seen = new Set();
    for (const token of source.split(/[;,\s]+/).filter(Boolean)) {
      if (!/^\d+$/.test(token)) throw new Error(`Ponto de corte inválido: ${token}.`);
      const cut = Number(token);
      if (cut < 1 || cut >= total) {
        throw new Error(`O corte ${cut} deve estar entre 1 e ${total - 1}.`);
      }
      if (!seen.has(cut)) {
        seen.add(cut);
        cuts.push(cut);
      }
    }
    cuts.sort((a, b) => a - b);
    const groups = [];
    let start = 1;
    for (const cut of cuts) {
      groups.push(Array.from({ length: cut - start + 1 }, (_, index) => start - 1 + index));
      start = cut + 1;
    }
    groups.push(Array.from({ length: total - start + 1 }, (_, index) => start - 1 + index));
    return groups;
  }

  function buildOddEven(pageCount) {
    const total = validatePageCount(pageCount);
    const odd = [];
    const even = [];
    for (let page = 1; page <= total; page++) {
      (page % 2 === 1 ? odd : even).push(page - 1);
    }
    return [odd, even].filter(group => group.length);
  }

  function appendUnmentioned(groups, pageCount) {
    const used = new Set(groups.flat());
    const remaining = Array.from({ length: pageCount }, (_, index) => index).filter(index => !used.has(index));
    return remaining.length ? [...groups, remaining] : groups;
  }

  function buildSplitPlan(mode, pageCount, options) {
    const total = validatePageCount(pageCount);
    const config = options || {};
    let groups;
    switch (mode) {
      case 'everyPage': groups = buildEveryPage(total); break;
      case 'fixedSize': groups = buildFixedSize(total, config.pagesPerFile); break;
      case 'equalParts': groups = buildEqualParts(total, config.parts); break;
      case 'cuts': groups = buildFromCuts(total, config.cuts); break;
      case 'custom':
        groups = parseCustomGroups(config.groups, total);
        if (config.includeUnmentioned) groups = appendUnmentioned(groups, total);
        break;
      case 'oddEven': groups = buildOddEven(total); break;
      default: throw new Error('Modo de divisão não reconhecido.');
    }
    if (!groups.length) throw new Error('O plano de divisão não gerou arquivos.');
    return groups;
  }

  function formatPages(pages) {
    if (!Array.isArray(pages) || !pages.length) return '';
    const oneBased = pages.map(index => index + 1);
    const parts = [];
    let start = oneBased[0];
    let previous = oneBased[0];
    for (let index = 1; index <= oneBased.length; index++) {
      const current = oneBased[index];
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

  function describePlan(groups) {
    return groups.map((pages, index) => ({
      index,
      pages,
      label: formatPages(pages),
      pageCount: pages.length
    }));
  }

  return {
    parsePageExpression,
    parseCustomGroups,
    buildEveryPage,
    buildFixedSize,
    buildEqualParts,
    buildFromCuts,
    buildOddEven,
    buildSplitPlan,
    formatPages,
    describePlan
  };
});
