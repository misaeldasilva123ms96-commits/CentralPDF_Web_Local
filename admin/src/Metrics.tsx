import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { summarize, toolNames, csvCell, useData, type Overview } from "./data";
import { Empty, Heading, Message } from "./ui";
export function Metrics({
  client,
  tools = false,
}: {
  client: SupabaseClient;
  tools?: boolean;
}) {
  const [period, setPeriod] = useState("week"),
    [search, setSearch] = useState("");
  const { data, error, loading, reload } = useData<Overview>(
    client,
    "overview?period=" + period,
  );
  const rows = summarize(data?.metrics || []);
  const totals = rows.reduce(
    (t, r) => ({
      completed: t.completed + r.completed,
      failed: t.failed + r.failed,
    }),
    { completed: 0, failed: 0 },
  );
  const total = totals.completed + totals.failed;
  function exportCsv() {
    const lines = [
      "CentralPDF — métricas registradas",
      "Ferramenta;Concluídos;Falhas",
      ...rows.map(
        (r) =>
          `${csvCell(toolNames[r.tool] || r.tool)};${r.completed};${r.failed}`,
      ),
    ];
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "CentralPDF — resumo de utilização.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <Heading
        title={tools ? "Ferramentas" : "Visão geral"}
        description={
          tools
            ? "Identifique o que é mais utilizado e onde melhorar."
            : "Acompanhe os registros recebidos pelo CentralPDF."
        }
      >
        <div className="button-row">
          <select
            aria-label="Período"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">Últimos 7 dias</option>
            <option value="today">Hoje (UTC)</option>
          </select>
          <button onClick={exportCsv} disabled={!rows.length || loading}>
            Exportar resumo
          </button>
        </div>
      </Heading>
      {error && (
        <Message error>
          {error} <button onClick={reload}>Tentar novamente</button>
        </Message>
      )}
      {loading ? (
        <Message>Carregando indicadores…</Message>
      ) : (
        data && (
          <>
            {!data.collectionEnabled && (
              <Message>
                A coleta de utilização ainda não foi habilitada nesta
                homologação. Os indicadores mostrarão apenas registros
                efetivamente recebidos.
              </Message>
            )}
            {!tools && (
              <dl className="metrics">
                {[
                  [
                    "Sessões ativas (estimativa)",
                    data.activeSessions === null
                      ? "Sem dados"
                      : String(data.activeSessions),
                  ],
                  ["Processamentos", rows.length ? String(total) : "Sem dados"],
                  [
                    "Taxa de conclusão",
                    total
                      ? ((totals.completed / total) * 100).toLocaleString(
                          "pt-BR",
                          { maximumFractionDigits: 1 },
                        ) + "%"
                      : "Sem dados",
                  ],
                  ["Falhas", rows.length ? String(totals.failed) : "Sem dados"],
                ].map(([label, value]) => (
                  <div className="metric" key={label}>
                    <dt>{label}</dt>
                    <dd className={!rows.length ? "no-data" : ""}>{value}</dd>
                    <small>Cobertura limitada aos registros recebidos</small>
                  </div>
                ))}
              </dl>
            )}
            <section className="panel">
              <div className="panel-head">
                <h2>Processamentos por ferramenta</h2>
              </div>
              {tools && (
                <div className="toolbar">
                  <label className="search">
                    Buscar ferramenta
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
              )}
              {!rows.length ? (
                <Empty>
                  Sem dados de utilização neste período.
                  <br />
                  <small>Isso não significa que ninguém utilizou o site.</small>
                </Empty>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ferramenta</th>
                        <th>Processamentos</th>
                        <th>Concluídos</th>
                        <th>Falhas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .filter((r) =>
                          (toolNames[r.tool] || r.tool)
                            .toLocaleLowerCase("pt-BR")
                            .includes(search.toLocaleLowerCase("pt-BR")),
                        )
                        .map((r) => (
                          <tr key={r.tool}>
                            <td>{toolNames[r.tool] || r.tool}</td>
                            <td>{r.completed + r.failed}</td>
                            <td>{r.completed}</td>
                            <td>{r.failed}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {!tools && (
              <div className="note-box">
                Documentos continuam no dispositivo de cada pessoa. Não há
                acesso central a PDFs, imagens ou nomes de arquivos.
              </div>
            )}
          </>
        )
      )}
    </>
  );
}
