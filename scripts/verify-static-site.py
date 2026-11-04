#!/usr/bin/env python3
"""Validate local HTML/CSS/cache references and prepared engine hashes before upload."""
from __future__ import annotations
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

SOURCE=Path(__file__).resolve().parents[1]
class References(HTMLParser):
    def __init__(self): super().__init__(); self.urls=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in {'script','img','source'} and a.get('src'): self.urls.append(a['src'])
        if tag=='link' and a.get('href'): self.urls.append(a['href'])

def validate(root: Path, require_engines=False):
    root=root.resolve(); errors=[]; checked=set(); versions={}
    def check(raw, origin='index.html', version=False):
        u=urlsplit(raw)
        if u.scheme or u.netloc or not u.path: return
        target=(root/Path(origin).parent/unquote(u.path)).resolve()
        if not target.is_relative_to(root): errors.append(f'{origin}: path outside package: {raw}'); return
        if target==root: target=root/'index.html'
        checked.add(str(target.relative_to(root)))
        if not target.is_file(): errors.append(f'{origin}: missing {raw}')
        if version:
            key=target.relative_to(root).as_posix()
            versions.setdefault(key,set()).add(u.query)
    for name in ['index.html','sw.js','manifest.webmanifest','vendor/pdfjs-manifest.js','vendor/offline-status.js']:
        if not (root/name).is_file(): errors.append(f'missing {name}')
    if errors:return {'ok':False,'references':0,'errors':errors}
    parser=References();parser.feed((root/'index.html').read_text(encoding='utf-8'))
    for url in parser.urls:check(url,version=True)
    if (root/'office/index.html').is_file():
        office=References();office.feed((root/'office/index.html').read_text(encoding='utf-8'))
        for url in office.urls:check(url,'office/index.html')
        check('./sw.js','office/index.html')
    sw=(root/'sw.js').read_text(encoding='utf-8')
    match=re.search(r'const CORE_ASSETS\s*=\s*\[(.*?)\n\];',sw,re.S)
    if not match:errors.append('Cannot locate CORE_ASSETS')
    else:
        for url in re.findall(r"['\"](\./[^'\"]*)['\"]",match[1]):check(url,'sw.js',version=True)
    for css in (root/'assets').rglob('*.css'):
        for url in re.findall(r'url\(\s*[\'"]?([^\)\'"\s]+)',css.read_text(encoding='utf-8')):
            check(url,css.relative_to(root).as_posix())
    for item in json.loads((root/'manifest.webmanifest').read_text(encoding='utf-8')).get('icons',[]):check(item['src'],'manifest.webmanifest')
    manifest=(root/'vendor/pdfjs-manifest.js').read_text(encoding='utf-8')
    for url in re.findall(r'"(\./[^\"]+)"',manifest):check(url,'sw.js')
    for path,queries in versions.items():
        if len(queries)>1:errors.append(f'inconsistent asset revisions: {path}: {sorted(queries)}')
    if require_engines:
        office_manifest=root/'vendor/office/manifest.json'
        if not office_manifest.is_file():errors.append('missing prepared Office engine manifest')
        else:
            office=json.loads(office_manifest.read_text())
            expected={'browser.js','browser.worker.global.js','soffice.js','soffice.worker.js','soffice.wasm','soffice.data'}
            if office.get('version')!='2.7.2' or set(office.get('files',{}))!=expected:errors.append('unexpected Office runtime manifest')
            for name in expected:
                entry=office.get('files',{}).get(name,{})
                file=root/'vendor/office'/name
                if not file.is_file() or file.stat().st_size!=entry.get('bytes') or hashlib.sha256(file.read_bytes()).hexdigest()!=entry.get('sha256'):
                    errors.append(f'invalid prepared Office runtime: {name}')
            if not (root/'vendor/office/LICENSE.txt').is_file():errors.append('missing Office MPL license')
        spec=(SOURCE/'scripts/prepare-offline.ps1').read_text(encoding='utf-8')
        items=re.findall(r"Path = '([^']+)'; MinBytes = (\d+); Sha256 = '([a-f0-9]{64})'",spec)
        for path,size,digest in items:
            f=root/path
            if not f.is_file():errors.append(f'missing prepared engine: {path}')
            elif f.stat().st_size<int(size) or hashlib.sha256(f.read_bytes()).hexdigest()!=digest:errors.append(f'invalid engine hash: {path}')
        for key,name in [('ApiSha256','pdf.min.mjs'),('WorkerSha256','pdf.worker.min.mjs')]:
            f=root/'vendor/pdfjs'/name;want=re.search(key+r" = '([^']+)'",spec)[1]
            if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=want:errors.append(f'invalid PDF.js engine: {name}')
        if 'prepared: true' not in (root/'vendor/offline-status.js').read_text() and 'prepared:true' not in (root/'vendor/offline-status.js').read_text():errors.append('offline status is not prepared')
        declared=set(re.findall(r'"(\./vendor/pdfjs/[^"]+)"',manifest))
        actual={'./'+p.relative_to(root).as_posix() for p in (root/'vendor/pdfjs').rglob('*') if p.is_file()}
        if not declared:errors.append('prepared PDF.js asset manifest is empty')
        if declared!=actual:errors.append('PDF.js cache manifest does not cover the prepared resource tree')
    return {'ok':not errors,'references':len(checked),'errors':errors}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('root',type=Path,nargs='?',default=SOURCE);p.add_argument('--require-engines',action='store_true');args=p.parse_args()
    result=validate(args.root,args.require_engines);print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(not result['ok'])
