"""Exercise the real workflow prelude against Ubuntu APT config formats."""
from pathlib import Path
from tempfile import TemporaryDirectory
import shlex
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[1]
for filename, job, step_name in [
    ('ci.yml', 'test', 'Install Python test dependencies'),
    ('pages.yml', 'build', 'Install real browser regression dependencies'),
]:
    workflow = yaml.safe_load((ROOT / '.github/workflows' / filename).read_text())
    step = next(s for s in workflow['jobs'][job]['steps'] if s.get('name') == step_name)
    # Run only APT source selection, never pip/apt downloads or sudo on this host.
    prelude = step['run'].split('python -m pip', 1)[0]
    with TemporaryDirectory(prefix='centralpdf apt ') as tmp:
        apt = Path(tmp)
        fixtures = {
            'sources.list': 'deb http://azure.archive.ubuntu.com/ubuntu noble main\n',
            'sources.list.d/ubuntu.sources': 'URIs: https://azure.archive.ubuntu.com/ubuntu/\nSuites: noble-updates\n',
            'apt-mirrors.txt': 'http://azure.archive.ubuntu.com/ubuntu/\n',
            'apt-security-mirrors.txt': 'https://azure.archive.ubuntu.com/ubuntu\n',
            'sources.list.d/microsoft.list': 'deb https://packages.microsoft.com/ubuntu/24.04/prod noble main\n',
            'preferences.d/unchanged.conf': 'http://azure.archive.ubuntu.com/ubuntu\n',
        }
        for name, content in fixtures.items():
            path = apt / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        command = prelude.replace('sudo find /etc/apt', f'find {shlex.quote(tmp)}')
        subprocess.run(['bash', '-euo', 'pipefail', '-c', command], check=True)
        for name, content in fixtures.items():
            if name.endswith(('.list', '.sources', 'mirrors.txt')):
                expected = content.replace('http://azure.archive.ubuntu.com/ubuntu/', 'https://archive.ubuntu.com/ubuntu/').replace('http://azure.archive.ubuntu.com/ubuntu', 'https://archive.ubuntu.com/ubuntu/').replace('https://azure.archive.ubuntu.com/ubuntu/', 'https://archive.ubuntu.com/ubuntu/').replace('https://azure.archive.ubuntu.com/ubuntu', 'https://archive.ubuntu.com/ubuntu/')
            else:
                expected = content
            assert (apt / name).read_text() == expected, (filename, name)
print('browser-dependency-mirror: CI and Pages cover lists, deb822, mirror lists and preserve unrelated sources')
