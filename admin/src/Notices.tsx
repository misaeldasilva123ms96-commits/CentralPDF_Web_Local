import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { api } from "./auth";
import { useData, type Notice, type NoticePage } from "./data";
import { Empty, Heading, Message, Modal } from "./ui";
type Draft = Omit<
  Notice,
  "id" | "updated_at" | "revision" | "published_value"
> & { id: string | null; revision: number | null };
const fresh = (): Draft => ({
  id: null,
  title: "",
  message: "",
  level: "info",
  state: "draft",
  starts_at: new Date().toISOString(),
  ends_at: null,
  revision: null,
});
export function Notices({ client }: { client: SupabaseClient }) {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useData<NoticePage>(
    client,
    "notices?page=" + page,
  );
  const [draft, setDraft] = useState<Draft>(fresh),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [confirm, setConfirm] = useState(false),
    [published, setPublished] = useState(false);
  async function save(state: Draft["state"]) {
    setBusy(true);
    setFailure("");
    try {
      const saved = await api<Notice>(client, "notices", {
        id: draft.id,
        title: draft.title,
        message: draft.message,
        level: draft.level,
        state,
        starts_at: draft.starts_at,
        ends_at: draft.ends_at,
        revision: draft.revision,
      });
      setDraft(saved);
      setPublished(!!saved.published_value);
      setMessage(
        state === "published"
          ? "Aviso publicado somente no ambiente de homologação. Clientes online com a integração recebem a versão publicada."
          : state === "withdrawn"
            ? "Aviso retirado da homologação."
            : "Rascunho salvo. Ele permanece privado.",
      );
      setConfirm(false);
      setPage(0);
      reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Não foi possível salvar.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void save("draft");
  }
  return (
    <>
      <Heading
        title="Avisos"
        description="Prepare orientações para a equipe com prévia antes de publicar."
      />
      {message && <Message>{message}</Message>}
      {failure && <Message error>{failure}</Message>}
      {error && (
        <Message error>
          {error} <button onClick={reload}>Tentar novamente</button>
        </Message>
      )}
      <div className="form-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Mensagem para a equipe</h2>
            <span className="pill neutral">
              {draft.state === "draft"
                ? "Rascunho"
                : draft.state === "published"
                  ? "Publicado em homologação"
                  : "Retirado"}
            </span>
          </div>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="notice-title">Título</label>
              <input
                id="notice-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={80}
                required
                disabled={busy}
              />
            </div>
            <div className="field">
              <label htmlFor="notice-message">Mensagem</label>
              <textarea
                id="notice-message"
                value={draft.message}
                onChange={(e) =>
                  setDraft({ ...draft, message: e.target.value })
                }
                maxLength={240}
                required
                disabled={busy}
              />
              <small>
                Até 240 caracteres. Não inclua dados de documentos ou pessoas.
              </small>
            </div>
            <div className="field">
              <label htmlFor="notice-level">Tipo de aviso</label>
              <select
                id="notice-level"
                value={draft.level}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    level: e.target.value as Draft["level"],
                  })
                }
                disabled={busy}
              >
                <option value="info">Informativo</option>
                <option value="warning">Atenção</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="notice-end">Fim da vigência (opcional)</label>
              <input
                id="notice-end"
                type="datetime-local"
                value={draft.ends_at ? localDate(draft.ends_at) : ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ends_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                disabled={busy}
              />
              <small>Publicação começa imediatamente após a confirmação.</small>
            </div>
            <div className="button-row">
              <button disabled={busy}>Salvar rascunho</button>
              <button
                type="button"
                className="primary"
                disabled={
                  busy ||
                  !draft.id ||
                  !draft.title.trim() ||
                  !draft.message.trim()
                }
                onClick={() => setConfirm(true)}
              >
                Publicar aviso
              </button>
            </div>
            <p className="hint">
              Salve o rascunho antes de publicar. Alterações não salvas não
              afetam o aviso publicado.
            </p>
          </form>
        </section>
        <aside>
          <section className="panel">
            <div className="panel-head">
              <h2>Prévia no aplicativo</h2>
            </div>
            <div className="preview" data-level={draft.level}>
              <strong>{draft.title || "Título do aviso"}</strong>
              <p>{draft.message || "Sua mensagem aparecerá aqui."}</p>
            </div>
            <p className="hint">
              Prévia de edição. Apenas a versão confirmada como publicada fica
              disponível na API pública desta homologação.
            </p>
          </section>
          <div className="note-box">
            A integração consulta apenas avisos publicados. Clientes offline
            podem continuar com uma versão anterior; o processamento local não depende do painel.
          </div>
        </aside>
      </div>
      <section className="panel notices-list">
        <div className="panel-head">
          <h2>Avisos salvos</h2>
          <button
            onClick={() => {
              setDraft(fresh());
              setPublished(false);
              setMessage("");
              setFailure("");
            }}
            disabled={busy}
          >
            Novo aviso
          </button>
        </div>
        {loading ? (
          <Message>Carregando avisos…</Message>
        ) : !data?.notices.length ? (
          <Empty>
            {page ? "Nenhum aviso nesta página." : "Nenhum aviso salvo."}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Revisão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.notices.map((n) => (
                  <tr key={n.id}>
                    <td>{n.title}</td>
                    <td>
                      {n.state === "draft"
                        ? "Rascunho"
                        : n.state === "published"
                          ? "Publicado"
                          : "Retirado"}
                      {n.state === "draft" && n.published_value
                        ? " · mantém versão publicada"
                        : ""}
                    </td>
                    <td>{n.revision}</td>
                    <td>
                      <button
                        className="row-action"
                        onClick={() => {
                          setDraft(n);
                          setPublished(!!n.published_value);
                          setMessage("");
                          setFailure("");
                        }}
                        disabled={busy}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav className="button-row" aria-label="Páginas de avisos">
          <button
            disabled={busy || loading || page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Página anterior
          </button>
          <span aria-live="polite">Página {page + 1}</span>
          <button
            disabled={busy || loading || !data?.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima página
          </button>
        </nav>
      </section>
      {draft.id && published && (
        <button
          className="withdraw-button"
          onClick={() => void save("withdrawn")}
          disabled={busy}
        >
          Retirar aviso
        </button>
      )}
      {confirm && (
        <Modal
          title="Publicar aviso na homologação"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            A mensagem ficará disponível na API pública desta homologação e nos clientes online com a integração. Confirme o texto antes de publicar.
          </p>
          <div className="preview" data-level={draft.level}>
            <strong>{draft.title}</strong>
            <p>{draft.message}</p>
          </div>
          <div className="button-row">
            <button onClick={() => setConfirm(false)} disabled={busy}>
              Cancelar
            </button>
            <button
              className="primary"
              onClick={() => void save("published")}
              disabled={busy}
            >
              {busy ? "Publicando…" : "Confirmar publicação"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
