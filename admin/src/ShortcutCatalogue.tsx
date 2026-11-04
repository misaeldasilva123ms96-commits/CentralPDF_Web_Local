import { useState } from "react";
import { matchesShortcut, shortcuts } from "./catalog";

const categories: Record<string, string> = {
  organize: "Organização", edit: "Edição", convert: "Conversão", security: "Segurança",
};

export function ShortcutCatalogue() {
  const [query, setQuery] = useState("");
  const filtered = shortcuts.filter(shortcut => matchesShortcut(shortcut, query));
  return <details className="panel shortcut-catalogue">
    <summary><span>Atalhos do site <small>{shortcuts.length} disponíveis</small></span><span>Consultar catálogo</span></summary>
    <p className="hint">Os mesmos nomes e formatos da página pública. Este catálogo é uma referência da entrega; não habilita ou desabilita ferramentas.</p>
    <label className="search">Buscar atalho do site
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Word, Excel, girar imagens…" />
    </label>
    <p className="hint" role="status">{filtered.length} de {shortcuts.length} atalhos</p>
    <ul className="shortcut-list">
      {filtered.map(shortcut => <li key={shortcut.id}>
        <span className="shortcut-category">{categories[shortcut.category] || "Documentos"}</span>
        <strong>{shortcut.title}</strong><p>{shortcut.description}</p>
      </li>)}
    </ul>
    {!filtered.length && <p>Nenhum atalho encontrado. Tente outro nome ou formato.</p>}
    <p className="hint">As contagens abaixo pertencem a famílias de processamento. Word, Excel e PowerPoint compartilham os indicadores de Office; os usos não são duplicados por atalho.</p>
  </details>;
}
