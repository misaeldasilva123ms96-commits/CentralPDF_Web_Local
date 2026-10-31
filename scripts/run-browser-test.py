"""Run a Python test with real Sentry destinations blocked in Playwright.

Only the app's browser fetch transport is guarded. A test may explicitly allow
its intercepted local receiver via __centralPdfTestLocalReceiver. Product sources and consent defaults are untouched.
"""
from pathlib import Path
import runpy
import sys
from playwright.sync_api import Browser, BrowserType

GUARD = r"""(() => {
  const original = window.fetch;
  window.fetch = function(...args) {
    try {
      const input=args[0];
      const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
      if((url.hostname==='sentry.io'||url.hostname.endsWith('.sentry.io')||url.hostname==='centralpdf-admin-homologacao.misaeldasilva123-ms96.workers.dev') &&
          url.href!==window.__centralPdfTestLocalReceiver) {
        return Promise.reject(new TypeError('Sentry blocked by browser test runner'));
      }
    } catch (_) { /* Let the browser validate ordinary fetch arguments. */ }
    return Reflect.apply(original,this,args);
  };
})();"""


def guard(context):
    # Routing disables the HTTP cache and interferes with offline regression.
    # Guard the app's fetch transport before page scripts execute instead.
    context.add_init_script(GUARD)
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
        page.evaluate(GUARD)
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
