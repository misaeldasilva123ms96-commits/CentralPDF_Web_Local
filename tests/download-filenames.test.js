const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const helpers = [
  ['app.js', /function baseName\(name\) \{[^\n]+\}/, 'baseName'],
  ['conversions-0.19.js', /function baseName\(name\) \{[^\n]+\}/, 'baseName'],
  ['conversions-0.19.js', /function normalizeOutputName\(name, fallback\) \{[^\n]+\}/, 'normalizeOutputName'],
  ['ocr-0.16.js', /function fileBase\(name\) \{[^\n]+\}/, 'fileBase'],
  ['forms-signatures-0.18.js', /const baseName = [^\n]+/, 'baseName'],
  ['compare-0.17.js', /function base\(n\)\{[^\n]+\}/, 'base'],
  ['intelligence-0.20.js', /function baseName\(name\) \{[\s\S]*?\n  \}/, 'baseName'],
];
for (const [file, pattern, helper] of helpers) {
  const source = fs.readFileSync(`${__dirname}/../assets/js/${file}`, 'utf8');
  const definition = source.match(pattern)?.[0];
  assert.ok(definition, `${file}: helper not found`);
  const call = name => vm.runInNewContext(`${definition}\n${helper}(${JSON.stringify(name)}, 'resultado')`);
  for (const name of ['NF 36 medição.pdf', 'João  da Silva.pdf', 'Medic\u0327a\u0303o.pdf']) {
    assert.equal(call(name), name.slice(0, -4), file);
  }
  assert.ok(!/[\\/:*?"<>|\u0000-\u001f]/.test(call('pasta/João: medição?.pdf')), file);
}
const source = fs.readFileSync(`${__dirname}/../assets/js/redaction-0.17.js`, 'utf8');
const expression = source.match(/const base=(.*?);const outputs/)[1];
assert.equal(vm.runInNewContext(expression, {files: [{name:'NF 36 medição.pdf'}]}), 'NF 36 medição');
console.log('Download filenames preserve spaces and composed/decomposed accents across tools.');
