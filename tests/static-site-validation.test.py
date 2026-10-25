"""Corrupt real package copies: the publication gate must reject broken assets."""
import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('sitecheck',ROOT/'scripts/verify-static-site.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class StaticPackage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.site=Path(cls.tmp.name)
        for name in ['index.html','sw.js','manifest.webmanifest']:shutil.copy2(ROOT/name,cls.site/name)
        for name in ['assets','vendor']:shutil.copytree(ROOT/name,cls.site/name)
    @classmethod
    def tearDownClass(cls):cls.tmp.cleanup()
    def corrupt(self,name,transform,expected):
        p=self.site/name;before=p.read_bytes()
        try:
            p.write_text(transform(before.decode()),encoding='utf-8')
            result=module.validate(self.site)
            self.assertFalse(result['ok']);self.assertTrue(any(expected in e for e in result['errors']),result)
        finally:p.write_bytes(before)
    def test_real_root(self):self.assertTrue(module.validate(ROOT)['ok'])
    def test_missing_script(self):self.corrupt('index.html',lambda s:s.replace('assets/js/app.js?', 'assets/js/missing-audit.js?'),'missing-audit.js')
    def test_missing_css_image(self):self.corrupt('assets/css/styles.css',lambda s:s+'\n.audit { background:url(missing-audit.png) }','missing-audit.png')
    def test_outside_package(self):self.corrupt('index.html',lambda s:s.replace('assets/js/app.js?','../private.js?'),'outside package')
    def test_mismatched_cache_revision(self):self.corrupt('sw.js',lambda s:s.replace('pdf-editor.js?v=2.0.1-editor5','pdf-editor.js?v=obsolete'),'inconsistent asset revisions')
    def test_missing_worker_manifest(self):self.corrupt('vendor/pdfjs-manifest.js',lambda s:'self.CentralPDFPdfJsAssets=Object.freeze(["./vendor/pdfjs/missing-worker.mjs"]);','missing-worker.mjs')
if __name__=='__main__':unittest.main()
