#!/usr/bin/env python3
"""Fetch the pinned Compatibility Gate corpus and verify every byte."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "tests" / "pdf-corpus" / "manifest.json"
CACHE_ROOT = (ROOT / "tests" / "pdf-corpus" / "cache").resolve()
MAX_PUBLIC_BYTES = 10 * 1024 * 1024
ALLOWED_HOST = "raw.githubusercontent.com"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_target(relative: str) -> Path:
    target = (CACHE_ROOT / relative).resolve()
    if target != CACHE_ROOT and CACHE_ROOT not in target.parents:
        raise ValueError(f"Unsafe corpus path: {relative}")
    return target


def source_url(case: dict, sources: dict) -> str:
    source = sources[case["source"]]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", source["repo"]):
        raise ValueError(f"Unsafe source repository: {source['repo']}")
    if not re.fullmatch(r"[0-9a-f]{40}", source["commit"]):
        raise ValueError(f"Unpinned source commit: {source['commit']}")
    upstream_path = PurePosixPath(case["path"])
    if upstream_path.is_absolute() or ".." in upstream_path.parts:
        raise ValueError(f"Unsafe upstream path: {case['path']}")
    quoted = urllib.parse.quote(case["path"], safe="/")
    return f"https://{ALLOWED_HOST}/{source['repo']}/{source['commit']}/{quoted}"


def download(url: str) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST:
        raise ValueError(f"Blocked corpus URL: {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "CentralPDF-Compatibility-Gate/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            final = urllib.parse.urlparse(response.geturl())
            if final.scheme != "https" or final.hostname != ALLOWED_HOST:
                raise ValueError(f"Blocked redirect: {response.geturl()}")
            declared = response.headers.get("Content-Length")
            if declared and int(declared) > MAX_PUBLIC_BYTES:
                raise ValueError(f"Fixture exceeds {MAX_PUBLIC_BYTES} bytes: {url}")
            data = response.read(MAX_PUBLIC_BYTES + 1)
    except urllib.error.URLError as error:
        raise RuntimeError(f"Could not download {url}: {error}") from error
    if len(data) > MAX_PUBLIC_BYTES:
        raise ValueError(f"Fixture exceeds {MAX_PUBLIC_BYTES} bytes: {url}")
    return data


def generate_local_fixtures() -> None:
    subprocess.run(
        ["node", str(ROOT / "scripts" / "generate-pdf-compat-fixtures.mjs")],
        cwd=ROOT,
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-only", action="store_true", help="Do not download or generate missing fixtures")
    parser.add_argument("--record-hashes", action="store_true", help="Record hashes only for manifest entries that are empty")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    if not args.verify_only:
        generate_local_fixtures()

    changed = False
    totals: dict[str, int] = {}
    for case in manifest["cases"]:
        target = safe_target(case["file"])
        expected_hash = case.get("sha256", "").lower()
        if case["source"] != "generated" and (not target.exists() or (expected_hash and digest(target.read_bytes()) != expected_hash)):
            if args.verify_only:
                raise FileNotFoundError(f"Missing or invalid fixture: {case['id']}")
            data = download(source_url(case, manifest["sources"]))
            downloaded_hash = digest(data)
            if expected_hash and downloaded_hash != expected_hash:
                raise ValueError(
                    f"Downloaded SHA-256 mismatch for {case['id']}: "
                    f"expected {expected_hash}, got {downloaded_hash}"
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            partial = target.with_suffix(target.suffix + ".partial")
            partial.write_bytes(data)
            os.replace(partial, target)
        if not target.exists():
            raise FileNotFoundError(f"Generated fixture missing: {case['id']}")
        actual_hash = digest(target.read_bytes())
        if not expected_hash:
            if not args.record_hashes:
                raise ValueError(f"Manifest hash missing for {case['id']}; use --record-hashes only after reviewing the pinned source")
            case["sha256"] = actual_hash
            changed = True
        elif actual_hash != expected_hash and args.record_hashes and case["source"] == "generated":
            case["sha256"] = actual_hash
            changed = True
        elif actual_hash != expected_hash:
            raise ValueError(f"SHA-256 mismatch for {case['id']}: expected {expected_hash}, got {actual_hash}")
        totals[case["source"]] = totals.get(case["source"], 0) + 1

    if changed:
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(manifest['cases'])} corpus files: {totals}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
