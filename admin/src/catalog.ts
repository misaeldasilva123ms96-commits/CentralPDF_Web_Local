import catalogue from "../shared/catalog.json";
import type { Metric } from "./data";

export const release = catalogue;
export const shortcuts = catalogue.shortcuts;
export const toolNames: Record<string, string> = Object.fromEntries(
  catalogue.tools.map(tool => [tool.id, tool.title]),
);
const aliases: Record<string, string> = {
  imagesToPdf: "imagens para pdf jpg jpeg png webp foto",
  documentsToPdf: "word docx odt excel xlsx ods calc powerpoint ppt pptx odp office ofice",
  pdfToOffice: "word docx excel xlsx powerpoint ppt pptx office ofice",
};
const normalize = (value: string) => value.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export function matchesTool(id: string, query: string) {
  const tool = catalogue.tools.find(tool => tool.id === id);
  const haystack = normalize([toolNames[id] || id, tool?.description, aliases[id]].join(" "));
  return normalize(query).split(/\s+/).filter(word => word && !["para", "de", "em"].includes(word))
    .every(word => haystack.includes(word));
}
export function matchesShortcut(shortcut: typeof shortcuts[number], query: string) {
  const haystack = normalize([shortcut.title, shortcut.description, shortcut.searchTerms].join(" "));
  return normalize(query).split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
}
export function catalogueRows(recorded: Pick<Metric, "tool" | "completed" | "failed">[]) {
  const received = new Map(recorded.map(row => [row.tool, row]));
  const ids = [...catalogue.tools.map(tool => tool.id), ...recorded.map(row => row.tool).filter(id => !(id in toolNames))];
  return ids.map(id => ({ tool: id, completed: received.get(id)?.completed ?? 0,
    failed: received.get(id)?.failed ?? 0, recorded: received.has(id) }))
    .sort((a, b) => (b.completed + b.failed) - (a.completed + a.failed) ||
      (toolNames[a.tool] || a.tool).localeCompare(toolNames[b.tool] || b.tool, "pt-BR"));
}
