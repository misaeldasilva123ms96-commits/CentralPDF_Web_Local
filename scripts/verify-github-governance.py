#!/usr/bin/env python3
"""Verify CentralPDF GitHub branch governance without changing repository state."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any


DEFAULT_REPOSITORY = "misaeldasilva123ms96-commits/CentralPDF_Web_Local"
DEFAULT_RULESET = "Protect main"
DEFAULT_CHECKS = ("build", "test")


def gh_api(endpoint: str) -> Any:
    completed = subprocess.run(
        ["gh", "api", endpoint],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if completed.returncode:
        message = completed.stderr.strip() or "GitHub API request failed"
        raise RuntimeError(message)
    return json.loads(completed.stdout)


def audit_ruleset(
    ruleset: dict[str, Any], expected_checks: tuple[str, ...] = DEFAULT_CHECKS
) -> list[str]:
    errors: list[str] = []
    conditions = ruleset.get("conditions", {}).get("ref_name", {})
    includes = set(conditions.get("include", []))
    if includes != {"refs/heads/main"}:
        errors.append("ruleset não se limita exclusivamente à main")
    if conditions.get("exclude", []):
        errors.append("ruleset contém exclusões de referência inesperadas")
    if ruleset.get("bypass_actors"):
        errors.append("ruleset permite bypass")
    if ruleset.get("target") != "branch":
        errors.append("ruleset não tem target branch")
    if ruleset.get("enforcement") != "active":
        errors.append("ruleset não está ativo")

    rules = {rule.get("type"): rule for rule in ruleset.get("rules", [])}
    if "deletion" not in rules:
        errors.append("exclusão da main não está bloqueada")
    if "non_fast_forward" not in rules:
        errors.append("force push não está bloqueado")

    pull_request = rules.get("pull_request", {}).get("parameters", {})
    if not pull_request:
        errors.append("pull request não é obrigatório")
    elif not pull_request.get("required_review_thread_resolution", False):
        errors.append("resolução de conversas não é obrigatória")

    status = rules.get("required_status_checks", {}).get("parameters", {})
    configured = {
        item.get("context") for item in status.get("required_status_checks", [])
    }
    missing = set(expected_checks) - configured
    if missing:
        errors.append("checks obrigatórios ausentes: " + ", ".join(sorted(missing)))
    if not status.get("strict_required_status_checks_policy", False):
        errors.append("branch atualizada não é obrigatória antes do merge")
    return errors


def verify(repository: str, ruleset_name: str, expected_checks: tuple[str, ...]) -> list[str]:
    errors: list[str] = []
    branch = gh_api(f"repos/{repository}/branches/main")
    if not branch.get("protected", False):
        errors.append("main não aparece como protegida")

    summaries = gh_api(f"repos/{repository}/rulesets")
    matches = [item for item in summaries if item.get("name") == ruleset_name]
    if len(matches) != 1:
        errors.append(
            f"esperado exatamente um ruleset {ruleset_name!r}; encontrado(s): {len(matches)}"
        )
        return errors

    ruleset_id = matches[0].get("id")
    details = gh_api(f"repos/{repository}/rulesets/{ruleset_id}")
    errors.extend(audit_ruleset(details, expected_checks))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPOSITORY)
    parser.add_argument("--ruleset", default=DEFAULT_RULESET)
    parser.add_argument("--check", action="append", dest="checks")
    args = parser.parse_args()
    checks = tuple(args.checks) if args.checks else DEFAULT_CHECKS

    try:
        errors = verify(args.repo, args.ruleset, checks)
    except (RuntimeError, json.JSONDecodeError) as exc:
        print(f"governance verification failed: {exc}", file=sys.stderr)
        return 1

    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1
    print(
        f"GitHub governance verified for {args.repo}: "
        f"ruleset {args.ruleset!r}, checks {', '.join(checks)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
