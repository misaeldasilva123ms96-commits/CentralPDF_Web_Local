"""Run a Python test with real Sentry destinations blocked in Playwright.

Only browser requests are guarded. Tests can register a later, explicit route
for their local receiver. Product sources and consent defaults are untouched.
"""
from pathlib import Path
import re
import runpy
import sys
from playwright.sync_api import Browser, BrowserType

SENTRY = re.compile(r'^https?://(?:[^/]+\.)?sentry\.io(?::\d+)?/')


def guard(context):
    context.route(SENTRY, lambda route: route.abort('blockedbyclient'))
    return context


def install_guard():
    original_context = Browser.new_context
    original_page = Browser.new_page
    original_persistent = BrowserType.launch_persistent_context

    def new_context(self, *args, **kwargs):
        return guard(original_context(self, *args, **kwargs))

    def new_page(self, *args, **kwargs):
        page = original_page(self, *args, **kwargs)
        guard(page.context)
        return page

    def persistent(self, *args, **kwargs):
        return guard(original_persistent(self, *args, **kwargs))

    Browser.new_context = new_context
    Browser.new_page = new_page
    BrowserType.launch_persistent_context = persistent


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python scripts/run-browser-test.py TEST.py [arguments]')
    install_guard()
    target = Path(sys.argv[1]).resolve()
    sys.argv = [str(target), *sys.argv[2:]]
    sys.path.insert(0, str(target.parent))
    runpy.run_path(str(target), run_name='__main__')
