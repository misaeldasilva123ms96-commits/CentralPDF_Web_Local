import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { api } from "./auth";
export interface Metric {
  day: string;
  tool: string;
  completed: number;
  failed: number;
}
export interface Overview {
  metrics: Metric[];
  activeSessions: number | null;
  collectionEnabled: boolean;
}
export interface Notice {
  published_value?: {
    title: string;
    message: string;
    level: string;
    revision: number;
  } | null;
  id: string;
  title: string;
  message: string;
  level: "info" | "warning";
  state: "draft" | "published" | "withdrawn";
  starts_at: string;
  ends_at: string | null;
  revision: number;
  updated_at: string;
}
export function useData<T>(client: SupabaseClient, path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    void api<T>(client, path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Não foi possível carregar.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, path, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function summarize(metrics: Metric[]) {
  const map = new Map<
    string,
    { tool: string; completed: number; failed: number }
  >();
  for (const row of metrics) {
    const current = map.get(row.tool) || {
      tool: row.tool,
      completed: 0,
      failed: 0,
    };
    current.completed += row.completed;
    current.failed += row.failed;
    map.set(row.tool, current);
  }
  return [...map.values()].sort(
    (a, b) => b.completed + b.failed - (a.completed + a.failed),
  );
}
export const toolNames: Record<string, string> = {
  organize: "Organizar PDF",
  editPdf: "Editar PDF",
  merge: "Juntar PDFs",
  split: "Dividir PDF",
  extract: "Extrair ou remover páginas",
  rotate: "Girar páginas",
  watermark: "Marca-d’água avançada",
  pageNumbers: "Numerar páginas avançado",
  imagesToPdf: "Imagens para PDF avançado",
  imageConvert: "Converter imagens",
  compress: "Comprimir PDF avançado",
  pdfToImage: "PDF para imagens avançado",
  crop: "Recortar PDF avançado",
  metadata: "Limpar metadados",
  normalize: "Normalizar PDF",
  pdfToText: "Extrair texto do PDF",
  ocr: "OCR e PDF pesquisável",
  compare: "Comparar PDFs",
  redact: "Censura definitiva",
  formBuilder: "Criar formulário preenchível",
  signPdf: "Assinar e rubricar PDF",
  pdfToOffice: "PDF para Office",
  documentsToPdf: "Documentos para PDF",
  extractImages: "Extrair imagens do PDF",
  archivePdf: "Preparar para arquivamento",
  documentAssistant: "Assistente documental",
  structuredExtraction: "Extração estruturada",
  documentAudit: "Auditoria documental",
  classifyRename: "Classificar e renomear",
  protect: "Proteger PDF",
  unlock: "Remover senha",
  diagnose: "Diagnosticar PDF",
  repairAdvanced: "Recuperar PDF",
  flattenForms: "Fixar formulários",
};

export function csvCell(value: string) {
  const safe = /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}
