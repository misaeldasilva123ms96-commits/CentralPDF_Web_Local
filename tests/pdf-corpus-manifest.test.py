import json
import re
from collections import Counter
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "tests" / "pdf-corpus" / "manifest.json"

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
cases = manifest["cases"]
sources = manifest["sources"]

assert manifest["version"] == "CentralPDF Compatibility Gate 1.0"
assert 40 <= len(cases) <= 60
assert Counter(case["source"] for case in cases) == {
    "mozilla": 20,
    "verapdf": 14,
    "pdfassociation": 7,
    "pdfium": 4,
    "generated": 7,
}

ids = [case["id"] for case in cases]
files = [case["file"] for case in cases]
assert len(ids) == len(set(ids))
assert len(files) == len(set(files))

for source, metadata in sources.items():
    assert re.fullmatch(r"[0-9a-f]{40}", metadata["commit"]), source
    assert re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", metadata["repo"]), source
    assert metadata["license"], source

for case in cases:
    fixture = PurePosixPath(case["file"])
    assert not fixture.is_absolute(), case["id"]
    assert ".." not in fixture.parts, case["id"]
    assert fixture.suffix.lower() == ".pdf", case["id"]
    assert case["source"] == "generated" or case["source"] in sources, case["id"]
    assert case["expected"] in {"PASS", "EXPECTED_REJECTION"}, case["id"]
    assert re.fullmatch(r"[0-9a-f]{64}", case["sha256"]), case["id"]
    assert case["categories"], case["id"]
    if case["source"] == "generated":
        assert "path" not in case, case["id"]
    else:
        upstream = PurePosixPath(case["path"])
        assert case["path"] and not upstream.is_absolute() and ".." not in upstream.parts, case["id"]

categories = {category for case in cases for category in case["categories"]}
required_categories = {
    "50mb",
    "600-pages",
    "acroform",
    "annotations",
    "attachments",
    "digital-signature",
    "encryption",
    "fake-extension",
    "fonts",
    "images",
    "incremental-update",
    "linearized",
    "metadata",
    "outlines",
    "pdf-2.0",
    "pdf-a-1",
    "pdf-a-2",
    "pdf-a-3",
    "pdf-a-4",
    "pdf-ua-1",
    "pdf-ua-2",
    "recoverable",
    "transparency",
    "truncated",
    "unicode",
    "vectors",
    "xfa",
    "xref",
}
assert required_categories <= categories, sorted(required_categories - categories)

gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
assert "tests/pdf-corpus/cache/" in gitignore

print(f"pdf-corpus-manifest: passed ({len(cases)} cases, {len(categories)} categories)")
