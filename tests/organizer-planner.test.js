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
console.log('organizer-planner tests: ok');
