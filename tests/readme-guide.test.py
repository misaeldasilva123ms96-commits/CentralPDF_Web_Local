import re
from pathlib import Path


root = Path(__file__).resolve().parents[1]
readme = (root / "README.md").read_text(encoding="utf-8")
modules = (root / "docs" / "reference" / "MODULES.md").read_text(encoding="utf-8")
baseline = (root / "docs" / "architecture" / "BASELINE_1.2.1.md").read_text(encoding="utf-8")

tool_names = re.findall(r"^\d+\. (.+)$", modules, flags=re.MULTILINE)
assert len(tool_names) == 34, f"catálogo legado contém {len(tool_names)} ferramentas"
assert baseline.strip(), "baseline legado vazio"

for tool_name in (
    "Juntar PDFs",
    "Extrair texto de PDF",
    "PDF para imagens",
    "Proteger PDF",
    "Comprimir PDF",
):
    assert tool_name in readme, f"ferramenta 2.0 ausente no README: {tool_name}"

required_guidance = [
    "# CentralPDF 2.0.0-alpha.1",
    "https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/",
    "https://github.com/misaeldasilva123ms96-commits/CentralPDF_Web_Local/releases",
    "ABRIR_CENTRAL_PDF.bat",
    "CentralPDF_Web_Local_v2.0.0-alpha.1.sha256",
    "gh attestation verify",
    "npm run typecheck",
    "npm run test",
    "docs/architecture/BASELINE_1.2.1.md",
    "docs/releases/2.0.0-alpha.1.md",
]

for value in required_guidance:
    assert value in readme, f"orientação obrigatória ausente no README: {value}"

for linked_path in re.findall(r"\]\(([^)]+)\)", readme):
    if linked_path.startswith(("http://", "https://", "#")):
        continue
    assert (root / linked_path).is_file(), f"link local inválido no README: {linked_path}"

print("readme-guide: passed")
