import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const source = read('assets/js/app.js').replace(/\r\n/g, '\n');
const start = source.indexOf('const toolConfig = {');
const end = source.indexOf('\n  };', start);
if (start < 0 || end < 0) throw new Error('Tool catalogue not found');
const block = source.slice(start, end);
const entries = [...block.matchAll(/\n    (\w+): \{/g)];
const tools = entries.map((entry, index) => {
  const body = block.slice(entry.index, entries[index + 1]?.index ?? block.length);
  const title = body.match(/title: '([^']*)'/)?.[1];
  const description = body.match(/description: '([^']*)'/)?.[1];
  if (!title || !description) throw new Error(`Missing metadata: ${entry[1]}`);
  return { id: entry[1], title, description };
});
if (!tools.length || new Set(tools.map(tool => tool.id)).size !== tools.length)
  throw new Error('Invalid tool catalogue');
const version = JSON.parse(read('app/package.json')).version;
const decode = value => value.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, entity =>
  ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"})[entity]);
const shortcuts = [...read('index.html').matchAll(/<button\b[^>]*class="[^"]*\btool-card\b[^>]*>[\s\S]*?<\/button>/g)].map(([html]) => {
  const attribute = name => decode(html.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '');
  const text = tag => decode(html.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1] || '');
  const familyId = attribute('data-tool');
  const title = text('strong');
  const description = text('p');
  const category = attribute('data-category');
  const shortcut = attribute('data-shortcut');
  if (!title || !description || !category || !tools.some(tool => tool.id === familyId)) throw new Error('Invalid public shortcut');
  return {id: shortcut ? `shortcut:${shortcut}` : familyId, familyId, title,
    description, category, searchTerms: attribute('data-search')};
});
if (!shortcuts.length || new Set(shortcuts.map(shortcut => shortcut.id)).size !== shortcuts.length)
  throw new Error('Invalid public shortcuts');
const sitePdfJsVersion = read('assets/js/engine-loader.js').match(/const PDFJS_VERSION = '([^']+)'/)?.[1];
const reactPdfJsVersion = JSON.parse(read('app/package-lock.json')).packages['node_modules/pdfjs-dist']?.version;
if (!sitePdfJsVersion || !reactPdfJsVersion) throw new Error('Missing PDF.js release metadata');
const revision = read('sw.js').match(/const CACHE_VERSION = '([^']+)'/)?.[1];
const office = read('scripts/prepare-office-engine.py').match(/^VERSION = '([^']+)'/m)?.[1];
if (!revision || !office || !revision.startsWith(`centralpdf-v${version}-`))
  throw new Error('Application release metadata is inconsistent');
const value = {
  applicationVersion: version,
  applicationRevision: revision,
  adminVersion: JSON.parse(read('admin/package.json')).version,
  officeEngineVersion: office,
  sitePdfJsVersion,
  reactPdfJsVersion,
  shortcutCount: shortcuts.length,
  shortcuts,
  tools,
};
const output = JSON.stringify(value, null, 2) + '\n';
const destination = resolve(root, 'admin/shared/catalog.json');
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== output)
    throw new Error('Admin catalogue is stale. Run npm run sync:catalog --prefix admin.');
} else writeFileSync(destination, output);
console.log(`Admin catalogue: ${tools.length} tools, CentralPDF ${version}, Office ${office}`);
