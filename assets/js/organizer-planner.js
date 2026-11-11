(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OrganizerPlanner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function normalizeIndexes(indexes, length) {
    return [...new Set((indexes || []).map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < length))].sort((a,b)=>a-b);
  }
  function insertItems(items, additions, index) {
    const copy = items.slice();
    const at = Math.max(0, Math.min(copy.length, Number.isInteger(index) ? index : copy.length));
    copy.splice(at, 0, ...additions);
    return copy;
  }
  function deleteIndexes(items, indexes) {
    const selected = new Set(normalizeIndexes(indexes, items.length));
    return items.filter((_, index) => !selected.has(index));
  }
  function duplicateIndexes(items, indexes, clone) {
    const selected = normalizeIndexes(indexes, items.length);
    if (!selected.length) return items.slice();
    const last = selected[selected.length - 1];
    const copies = selected.map(index => clone ? clone(items[index], index) : { ...items[index] });
    return insertItems(items, copies, last + 1);
  }
  function moveIndexesToEdge(items, indexes, edge) {
    const selected = normalizeIndexes(indexes, items.length);
    if (!selected.length) return items.slice();
    const set = new Set(selected);
    const moving = items.filter((_,i)=>set.has(i));
    const rest = items.filter((_,i)=>!set.has(i));
    return edge === 'start' ? [...moving, ...rest] : [...rest, ...moving];
  }
  function calculateInsertIndex(mode, selectedIndexes, length) {
    const selected = normalizeIndexes(selectedIndexes, length);
    if (mode === 'start') return 0;
    if (mode === 'before' && selected.length) return selected[0];
    if (mode === 'after' && selected.length) return selected[selected.length - 1] + 1;
    return length;
  }
  // Keep descriptors intact: sorting must not change identity, rotation or source.
  function sortPages(items, sourceKeys = [], direction = 'ascending') {
    const sources = new Map(sourceKeys.map((key, index) => [key, index]));
    const sign = direction === 'descending' ? -1 : 1;
    const collator = new Intl.Collator('pt-BR', { numeric: true });
    const rank = page => page.kind === 'blank' ? sources.size + 1 : (sources.get(page.sourceKey) ?? sources.size);
    const pageNumber = page => page.kind === 'pdf' ? page.sourceIndex : page.kind === 'blank' ? Number(String(page.id).match(/\d+$/)?.[0] || 0) : 0;
    return items.slice().sort((a, b) => {
      const source = rank(a) - rank(b) || (a.sourceKey === b.sourceKey ? 0 : collator.compare(String(a.sourceKey || ''), String(b.sourceKey || '')));
      return sign * (source || pageNumber(a) - pageNumber(b));
    });
  }
  return { normalizeIndexes, insertItems, deleteIndexes, duplicateIndexes, moveIndexesToEdge, calculateInsertIndex, sortPages };
});
