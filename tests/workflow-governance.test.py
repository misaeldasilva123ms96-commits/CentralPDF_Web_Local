from pathlib import Path

import yaml


root = Path(__file__).resolve().parents[1]
ci = (root / ".github/workflows/ci.yml").read_text(encoding="utf-8")
pages = (root / ".github/workflows/pages.yml").read_text(encoding="utf-8")
ci_config = yaml.load(ci, Loader=yaml.BaseLoader)
pages_config = yaml.load(pages, Loader=yaml.BaseLoader)

for name, config in (("CI", ci_config), ("Pages", pages_config)):
    triggers = config["on"]
    assert "workflow_dispatch" in triggers, f"{name} precisa permitir execução manual"
    assert triggers["pull_request"]["types"] == [
        "opened",
        "synchronize",
        "reopened",
        "ready_for_review",
    ]
    assert triggers["push"]["branches"] == ["main"]
    assert config["permissions"] == {"contents": "read"}
    assert "github.event.pull_request.number || github.ref" in config["concurrency"]["group"]
    assert config["concurrency"]["cancel-in-progress"] == (
        "${{ github.event_name == 'pull_request' }}"
    )

assert ci_config["concurrency"]["group"] == (
    "ci-${{ github.event.pull_request.number || github.ref }}"
)
assert pages_config["concurrency"]["group"] == (
    "pages-${{ github.event.pull_request.number || github.ref }}"
)
assert {"test"} <= set(ci_config["jobs"]), "o check obrigatório precisa se chamar test"
assert {"build", "deploy"} <= set(pages_config["jobs"])
assert pages_config["jobs"]["deploy"]["if"] == (
    "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'"
)
assert pages_config["jobs"]["deploy"]["permissions"] == {
    "pages": "write",
    "id-token": "write",
}
for job_name, job in pages_config["jobs"].items():
    if job_name != "deploy":
        assert "permissions" not in job, f"{job_name} não deve elevar permissões"

print("workflow-governance: passed")
