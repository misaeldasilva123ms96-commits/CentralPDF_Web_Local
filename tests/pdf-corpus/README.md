# CentralPDF Compatibility Gate 1.0 corpus

The PDFs themselves are not committed. `manifest.json` pins every public file to
an upstream repository commit and records its SHA-256. The fetcher accepts only
HTTPS downloads from `raw.githubusercontent.com`, enforces a 10 MiB limit per
public fixture, verifies hashes, and writes atomically beneath the ignored
`tests/pdf-corpus/cache/` directory.

Sources and licenses:

- Mozilla PDF.js test PDFs — Apache-2.0, commit pinned in the manifest.
- veraPDF corpus — CC BY 4.0, commit pinned in the manifest.
- PDF Association PDF 2.0 examples — CC BY-SA 4.0, commit pinned.
- Chromium PDFium test resources — BSD-3-Clause/Apache-2.0 notices in the
  upstream repository, commit pinned in the manifest.
- Locally generated fixtures — generated from project dependencies and never
  committed as binary artifacts.

Prepare and run:

```text
python scripts/fetch-pdf-corpus.py
python tests/pdf-compatibility-gate.py
```

Use `--verify-only` to prohibit downloads. A changed upstream byte sequence is
an error; do not refresh hashes without reviewing the pinned source revision.
