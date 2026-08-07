import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appJs = readFileSync(resolve(import.meta.dirname, '../assets/js/app.js'), 'utf8');

const start = appJs.indexOf('const toolConfig = {');
const endMarker = appJs.indexOf('\n  };', start);
if (start < 0 || endMarker < 0) throw new Error('toolConfig block not found');
const block = appJs.slice(start + 'const toolConfig = {'.length, endMarker);

const idRegex = /\n    (\w+): \{/g;
const entries = [];
let m;
while ((m = idRegex.exec(block)) !== null) entries.push(m[1]);

const tools = [];
for (let i = 0; i < entries.length; i++) {
  const id = entries[i];
  const entryStart = block.indexOf(`\n    ${id}: {`);
  const nextEntry = entries[i + 1];
  const entryEnd = nextEntry
    ? block.indexOf(`\n    ${nextEntry}: {`, entryStart)
    : block.length;
  const entryBody = block.slice(entryStart, entryEnd);
  const grab = (re) => (entryBody.match(re) || [])[1] ?? '';
  const rawSettings = grab(/settings:\s*(`[\s\S]*?`|'[^']*')/);
  tools.push({
    id,
    title: grab(/title: '([^']*)'/),
    description: grab(/description: '([^']*)'/),
    accept: grab(/accept: '([^']*)'/),
    multiple: entryBody.includes('multiple: true'),
    typeLabel: grab(/typeLabel: '([^']*)'/),
    button: grab(/button: '([^']*)'/),
    outputExt: grab(/outputExt: '([^']*)'/),
    outputBase: grab(/outputBase: '([^']*)'/),
    professional: entryBody.includes('professional: true'),
    settingsCharacters: rawSettings.length,
    settingIds: Array.from(rawSettings.matchAll(/\bid=["']([^"']+)["']/g), (match) => match[1])
  });
}
if (tools.length === 0) throw new Error('No tools parsed');

writeFileSync(
  resolve(import.meta.dirname, '../docs/architecture/_CATALOGO_RAW.md'),
  `# Catálogo de ferramentas (gerado)

Gerado por \`scripts/extract-tool-catalog.mjs\` a partir de \`assets/js/app.js\` (toolConfig, v1.2.1).

| id | título | múltiplo | tipo | aceita | saída | professional | settings chars | n. settings ids |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n` +
    tools.map((t) => `| ${t.id} | ${t.title} | ${t.multiple ? 'sim' : 'não'} | ${t.typeLabel} | \`${t.accept}\` | ${t.outputExt} | ${t.professional ? 'sim' : '-'} | ${t.settingsCharacters} | ${t.settingIds.length} |\n`).join(''),
  'utf8'
);

console.log(`Gerado catálogo com ${tools.length} ferramentas.`);
for (const t of tools) console.log(`- ${t.id}: ${t.title} (${t.settingIds.length} settings ids)`);