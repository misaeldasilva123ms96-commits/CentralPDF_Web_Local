"""Ambiente de execucao dos testes: usa o Chromium completo no Windows.

No Windows, o chromium-headless-shell instalado pelo Playwright pode falhar
ao abrir paginas (TargetClosedError) enquanto o Chromium completo funciona.
Este modulo, carregado via PYTHONPATH=tests, faz o launch padrao do Chromium
usar o canal `chromium` (novo headless) quando o executavel escolhido for o
shell quebrado ou um caminho inexistente (ex.: /usr/bin/chromium do Linux).
"""

import os
from pathlib import Path

if os.name == "nt":
    try:
        from playwright.sync_api._generated import BrowserType as _BrowserType
    except Exception:
        pass
    else:
        _original_launch = _BrowserType.launch

        def _launch(self, *args, **kwargs):
            exe = kwargs.get("executable_path")
            if exe is not None and not Path(exe).exists():
                kwargs.pop("executable_path", None)
            if "executable_path" not in kwargs and "channel" not in kwargs:
                kwargs["channel"] = "chromium"
            return _original_launch(self, *args, **kwargs)

        _BrowserType.launch = _launch