import re
from pathlib import Path


root = Path(__file__).resolve().parents[1]
readme = (root / "README.md").read_text(encoding="utf-8")
modules = (root / "docs" / "reference" / "MODULES.md").read_text(encoding="utf-8")

tool_names = re.findall(r"^\d+\. (.+)$", modules, flags=re.MULTILINE)

assert len(tool_names) == 34, f"catálogo de referência contém {len(tool_names)} ferramentas"
for tool_name in tool_names:
    assert tool_name in readme, f"ferramenta ausente no README: {tool_name}"

required_guidance = [
    "https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/",
    "PREPARAR_OFFLINE.bat",
    "ABRIR_CENTRAL_PDF.bat",
    "checksums.sha256",
    "Ctrl+K",
    "Atualizações técnicas avaliadas",
    "Solução de problemas",
]

for value in required_guidance:
    assert value in readme, f"orientação obrigatória ausente no README: {value}"

for linked_path in re.findall(r"\]\(([^)]+)\)", readme):
    if linked_path.startswith(("http://", "https://", "#")):
        continue
    assert (root / linked_path).is_file(), f"link local inválido no README: {linked_path}"

print("readme-guide: passed")
