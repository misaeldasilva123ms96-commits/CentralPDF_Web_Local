const assert = require('assert');
const Planner = require('../assets/js/organizer-planner.js');

const items = ['A','B','C','D'];
assert.deepStrictEqual(Planner.normalizeIndexes([3,1,1,-1,9], 4), [1,3]);
assert.deepStrictEqual(Planner.insertItems(items, ['X','Y'], 2), ['A','B','X','Y','C','D']);
assert.deepStrictEqual(Planner.deleteIndexes(items, [1,3]), ['A','C']);
assert.deepStrictEqual(Planner.duplicateIndexes(items, [1,3], x => x + x), ['A','B','C','D','BB','DD']);
assert.deepStrictEqual(Planner.moveIndexesToEdge(items, [1,3], 'start'), ['B','D','A','C']);
assert.deepStrictEqual(Planner.moveIndexesToEdge(items, [1,3], 'end'), ['A','C','B','D']);
assert.strictEqual(Planner.calculateInsertIndex('before', [2], 4), 2);
assert.strictEqual(Planner.calculateInsertIndex('after', [2], 4), 3);
assert.strictEqual(Planner.calculateInsertIndex('start', [], 4), 0);
assert.strictEqual(Planner.calculateInsertIndex('end', [], 4), 4);
const pages = Object.freeze([
  Object.freeze({ id:'page-5', kind:'blank', rotation:90 }),
  Object.freeze({ id:'page-4', kind:'pdf', sourceKey:'added', sourceIndex:0 }),
  Object.freeze({ id:'page-2', kind:'pdf', sourceKey:'main', sourceIndex:1, rotation:270 }),
  Object.freeze({ id:'page-6', kind:'pdf', sourceKey:'main', sourceIndex:1, rotation:90 }),
  Object.freeze({ id:'page-1', kind:'pdf', sourceKey:'main', sourceIndex:0 }),
  Object.freeze({ id:'page-3', kind:'image', sourceKey:'image' }),
]);
const ascending = Planner.sortPages(pages, ['main','added','image']);
assert.deepStrictEqual(ascending.map(page => page.id), ['page-1','page-2','page-6','page-4','page-3','page-5']);
assert.deepStrictEqual(Planner.sortPages(pages, ['main','added','image'], 'descending').map(page => page.id), ['page-5','page-3','page-4','page-2','page-6','page-1']);
assert.strictEqual(ascending[1], pages[2]);
assert.strictEqual(ascending[1].rotation, 270);
assert.strictEqual(ascending[2].rotation, 90);
assert.deepStrictEqual(Planner.sortPages([], []), []);
console.log('organizer-planner tests: ok');
