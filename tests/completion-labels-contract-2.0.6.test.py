from pathlib import Path

from bs4 import BeautifulSoup


root = Path(__file__).resolve().parents[1]
index = (root / "index.html").read_text(encoding="utf-8")
app = (root / "assets/js/app.js").read_text(encoding="utf-8")
soup = BeautifulSoup(index, "html.parser")

expected = {
    "organize": ("Continuar organizando", "Nova organização"),
    "editPdf": ("Continuar editando", "Nova edição"),
    "merge": ("Continuar juntando", "Nova junção"),
    "split": ("Continuar dividindo", "Nova divisão"),
    "extract": ("Continuar extraindo", "Nova extração"),
    "rotate": ("Continuar girando", "Nova rotação"),
    "watermark": ("Continuar ajustando", "Nova marca-d’água"),
    "pageNumbers": ("Continuar numerando", "Nova numeração"),
    "imagesToPdf": ("Continuar montando", "Novo PDF de imagens"),
    "imageConvert": ("Continuar convertendo", "Nova conversão"),
    "compress": ("Continuar comprimindo", "Nova compressão"),
    "pdfToImage": ("Continuar convertendo", "Nova conversão em imagens"),
    "crop": ("Continuar recortando", "Novo recorte"),
    "metadata": ("Continuar limpando", "Nova limpeza"),
    "normalize": ("Continuar normalizando", "Nova normalização"),
    "pdfToText": ("Continuar extraindo", "Nova extração de texto"),
    "ocr": ("Continuar reconhecendo", "Novo OCR"),
    "compare": ("Continuar comparando", "Nova comparação"),
    "redact": ("Continuar censurando", "Nova censura"),
    "formBuilder": ("Continuar criando", "Novo formulário"),
    "signPdf": ("Continuar assinando", "Nova assinatura"),
    "pdfToOffice": ("Continuar convertendo", "Nova conversão para Office"),
    "documentsToPdf": ("Continuar convertendo", "Nova conversão para PDF"),
    "extractImages": ("Continuar extraindo", "Nova extração de imagens"),
    "archivePdf": ("Continuar preparando", "Novo arquivamento"),
    "documentAssistant": ("Continuar analisando", "Nova análise"),
    "structuredExtraction": ("Continuar extraindo", "Nova extração estruturada"),
    "documentAudit": ("Continuar auditando", "Nova auditoria"),
    "classifyRename": ("Continuar classificando", "Nova classificação"),
    "protect": ("Continuar protegendo", "Nova proteção"),
    "unlock": ("Continuar desbloqueando", "Nova remoção de senha"),
    "diagnose": ("Continuar diagnosticando", "Novo diagnóstico"),
    "repairAdvanced": ("Continuar recuperando", "Nova recuperação"),
    "flattenForms": ("Continuar fixando", "Nova fixação"),
}

assert len(expected) == 34
assert len(soup.select(".tool-card[data-tool]")) == 34
assert soup.select_one(".panel-heading #clearButton") is None
completion = soup.select_one("#completionActions")
assert completion is not None and "hidden" in completion.get("class", [])
assert completion.select_one("#continueEditingButton") is not None
assert completion.select_one("#clearButton") is not None

for tool, labels in expected.items():
    assert f"{tool}: ['{labels[0]}', '{labels[1]}']" in app, tool

assert "setCompletionState(true, result?.message)" in app
assert "if (state.taskCompleted) processButton.disabled = true" in app
assert "continueEditingButton.addEventListener('click', continueEditing)" in app

print("completion-labels-contract-2.0.6: passed")
