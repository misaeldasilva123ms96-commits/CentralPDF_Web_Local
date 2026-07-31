from hashlib import sha256
from pathlib import Path

from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
pptx_path = root / "vendor" / "pptxgen.min.js"
license_path = root / "vendor" / "pptxgen.LICENSE.txt"
pptx_bytes = pptx_path.read_bytes()

assert b"PptxGenJS 4.0.1" in pptx_bytes[:256]
assert sha256(pptx_bytes).hexdigest() == "097f0b92e15035a72bba72b59ef1ece62ab45ec6075ac85fe0e2d80d3f59b8e3"
assert "MIT License" in license_path.read_text(encoding="utf-8")

jszip = (root / "vendor" / "jszip.min.js").read_text(encoding="utf-8")
pptxgen = pptx_path.read_text(encoding="utf-8")
module = (root / "assets" / "js" / "conversions-0.19.js").read_text(encoding="utf-8")
html = f"<!doctype html><html><body><script>{jszip}</script><script>{pptxgen}</script><script>{module}</script></body></html>"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    )
    page = browser.new_page()
    page_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.set_content(html, wait_until="domcontentloaded")
    result = page.evaluate(
        """async () => {
          async function testPage(pageNumber, label, color) {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 360;
            const context = canvas.getContext('2d');
            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = '#ffffff';
            context.font = 'bold 36px sans-serif';
            context.fillText(label, 48, 190);
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            return {
              pageNumber,
              text: `Conteúdo textual ${label}`,
              rows: [],
              imageBlob,
              imageWidth: canvas.width,
              imageHeight: canvas.height,
            };
          }

          const pages = [
            await testPage(1, 'Página azul', '#075985'),
            await testPage(2, 'Página verde', '#166534'),
          ];
          const blob = await CentralPDFConversions.buildPptx({title: 'Auditoria PPTX', pages});
          const zip = await JSZip.loadAsync(blob);
          const names = Object.keys(zip.files).filter(name => !zip.files[name].dir).sort();
          const malformedXml = [];
          for (const name of names.filter(name => /(?:\.xml|\.rels)$/.test(name))) {
            const source = await zip.file(name).async('text');
            const document = new DOMParser().parseFromString(source, 'application/xml');
            if (document.getElementsByTagName('parsererror').length) malformedXml.push(name);
          }
          const notes = [];
          for (const name of names.filter(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))) {
            notes.push(await zip.file(name).async('text'));
          }
          const parsed = await CentralPDFConversions.parsePptx(new File(
            [blob],
            'auditoria.pptx',
            {type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'},
          ));
          return {size: blob.size, names, malformedXml, notes, parsed};
        }"""
    )
    browser.close()

required_parts = {
    "[Content_Types].xml",
    "_rels/.rels",
    "ppt/presentation.xml",
    "ppt/_rels/presentation.xml.rels",
    "ppt/slides/slide1.xml",
    "ppt/slides/slide2.xml",
    "ppt/slides/_rels/slide1.xml.rels",
    "ppt/slides/_rels/slide2.xml.rels",
    "ppt/notesSlides/notesSlide1.xml",
    "ppt/notesSlides/notesSlide2.xml",
}

assert result["size"] > 10_000, result
assert required_parts.issubset(result["names"]), result["names"]
assert len([name for name in result["names"] if name.startswith("ppt/media/")]) == 2, result["names"]
assert not result["malformedXml"], result["malformedXml"]
assert len(result["notes"]) == 2, result["notes"]
assert "Conteúdo textual Página azul" in result["notes"][0], result["notes"]
assert "Conteúdo textual Página verde" in result["notes"][1], result["notes"]
assert "Slide 1" in result["parsed"] and "Slide 2" in result["parsed"], result["parsed"]
assert not page_errors, page_errors

print("pptxgenjs-4.0.1: passed")
