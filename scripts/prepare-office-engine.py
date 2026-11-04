#!/usr/bin/env python3
"""Prepare the pinned browser-only LibreOffice WASM runtime, never document data.

Binaries are build artifacts, not Git blobs (soffice.wasm exceeds GitHub's 100 MB
file limit). The browser loads them automatically when the first Office conversion starts.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import tarfile
import urllib.request

VERSION = '2.7.2'
URL = f'https://registry.npmjs.org/@matbee/libreoffice-converter/-/libreoffice-converter-{VERSION}.tgz'
INTEGRITY = '62S8uLiFvwbXiCu3IfkO1cDjTyZWUy5nlMsTrmj3l+G5zf5fQcgpvzfRDR9wId+bduarrv11ZDb8Olz5zj4zJA=='
FILES = {
    'dist/browser.js': 'browser.js',
    'dist/browser.worker.global.js': 'browser.worker.global.js',
    'wasm/soffice.js': 'soffice.js',
    'wasm/soffice.worker.js': 'soffice.worker.js',
    'wasm/soffice.wasm': 'soffice.wasm',
    'wasm/soffice.data': 'soffice.data',
}

def prepare(root):
    with urllib.request.urlopen(URL, timeout=90) as response:
        data = response.read(160 * 1024 * 1024 + 1)
    if len(data) > 160 * 1024 * 1024 or hashlib.sha512(data).digest() != base64.b64decode(INTEGRITY):
        raise RuntimeError('Office runtime archive failed its pinned integrity check')
    destination = root / 'vendor' / 'office'
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {'version': VERSION, 'source': URL, 'license': 'MPL-2.0', 'files': {}}
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for source, name in FILES.items():
            member = archive.getmember('package/' + source)
            if not member.isfile() or member.size > 160 * 1024 * 1024:
                raise RuntimeError('Unexpected runtime member')
            content = archive.extractfile(member).read()
            if name == 'soffice.js':
                # Upstream #19: a pool of four can deadlock in documentLoad on
                # slower CPUs. Explicit, reproducible MPL-covered modification.
                needle = b'var pthreadPoolSize=4;'
                if content.count(needle) != 1:
                    raise RuntimeError('Upstream pthread workaround no longer matches')
                content = content.replace(needle, b'var pthreadPoolSize=8;')
            (destination / name).write_bytes(content)
            manifest['files'][name] = {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (destination / 'LICENSE.txt').write_bytes((Path(__file__).resolve().parents[1] / 'docs/licenses/MPL-2.0.txt').read_bytes())
    (destination / 'MODIFICATIONS.txt').write_text(
        'LibreOffice WASM 2.7.2, MPL-2.0. Source: https://github.com/matbeedotcom/libreoffice-document-converter\n'
        'CentralPDF modification: wasm/soffice.js pthreadPoolSize 4 -> 8, upstream issue #19.\n'
        'https://github.com/matbeedotcom/libreoffice-document-converter/issues/19\n'
        'License: https://www.mozilla.org/MPL/2.0/\n')
    print(f'Office {VERSION}: {sum(v["bytes"] for v in manifest["files"].values())} bytes verified and prepared')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', type=Path, default=Path(__file__).resolve().parents[1])
    prepare(parser.parse_args().root.resolve())
