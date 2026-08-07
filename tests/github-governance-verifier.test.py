import importlib.util
from pathlib import Path


root = Path(__file__).resolve().parents[1]
module_path = root / "scripts" / "verify-github-governance.py"
spec = importlib.util.spec_from_file_location("github_governance", module_path)
assert spec and spec.loader
governance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(governance)


valid_ruleset = {
    "name": "Protect main",
    "target": "branch",
    "enforcement": "active",
    "bypass_actors": [],
    "conditions": {"ref_name": {"include": ["refs/heads/main"], "exclude": []}},
    "rules": [
        {"type": "deletion"},
        {"type": "non_fast_forward"},
        {
            "type": "pull_request",
            "parameters": {"required_review_thread_resolution": True},
        },
        {
            "type": "required_status_checks",
            "parameters": {
                "strict_required_status_checks_policy": True,
                "required_status_checks": [
                    {"context": "test"},
                    {"context": "build"},
                ],
            },
        },
    ],
}

assert governance.audit_ruleset(valid_ruleset) == []

unsafe_ruleset = {
    **valid_ruleset,
    "enforcement": "disabled",
    "bypass_actors": [{"actor_type": "RepositoryRole", "actor_id": 5}],
    "conditions": {
        "ref_name": {
            "include": ["refs/heads/main", "refs/heads/release"],
            "exclude": ["refs/heads/release"],
        }
    },
    "rules": [
        {
            "type": "required_status_checks",
            "parameters": {
                "strict_required_status_checks_policy": False,
                "required_status_checks": [{"context": "test"}],
            },
        }
    ],
}
errors = governance.audit_ruleset(unsafe_ruleset)
for expected in (
    "ruleset não se limita exclusivamente à main",
    "ruleset contém exclusões de referência inesperadas",
    "ruleset permite bypass",
    "ruleset não está ativo",
    "exclusão da main não está bloqueada",
    "force push não está bloqueado",
    "pull request não é obrigatório",
    "checks obrigatórios ausentes: build",
    "branch atualizada não é obrigatória antes do merge",
):
    assert expected in errors, expected

print("github-governance-verifier: passed")
