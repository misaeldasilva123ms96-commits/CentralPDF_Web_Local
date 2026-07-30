const assert = require('assert');
const planner = require('../assets/js/advanced-planner.js');

assert.deepStrictEqual(planner.parsePageSpec('1-3,5', 6), [0,1,2,4]);
assert.deepStrictEqual(planner.parsePageSpec('3,1,3', 4, { allowDuplicates: true }), [2,0,2]);
assert.deepStrictEqual(planner.resolveScope('odd', 6), [0,2,4]);
assert.deepStrictEqual(planner.resolveScope('even', 6), [1,3,5]);
assert.deepStrictEqual(planner.resolveScope('exclude', 5, '2,4'), [0,2,4]);
assert.deepStrictEqual(planner.buildExtractPlan('groups', 8, { groups: '1-2;3,5;6-8' }), [[0,1],[2,4],[5,6,7]]);
assert.deepStrictEqual(planner.buildExtractPlan('remove', 5, { pages: '2,4' }), [[0,2,4]]);
assert.deepStrictEqual(planner.buildExtractPlan('oddEven', 5, {}), [[0,2,4],[1,3]]);
assert.deepStrictEqual(planner.buildMergePlan([5,4,3], 'all;2-3;1,3').map(x => x.pages), [[0,1,2,3,4],[1,2],[0,2]]);
assert.strictEqual(planner.formatPages([0,1,2,4,6,7]), '1-3,5,7-8');
assert.deepStrictEqual(planner.compressionProfile('custom', { dpi: 180, quality: 65, grayscale: true }), { rasterize: true, dpi: 180, quality: .65, grayscale: true });
assert.strictEqual(planner.normalizeHexColor('#AABBCC'), '#aabbcc');
assert.throws(() => planner.parsePageSpec('8', 7), /não existe/);
assert.throws(() => planner.buildExtractPlan('remove', 2, { pages: '1-2' }), /todas/);
console.log('advanced-planner: 14 checks passed');
