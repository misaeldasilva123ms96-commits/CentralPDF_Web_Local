import type { SupabaseClient } from "@supabase/supabase-js";
import { useData } from "./data";
import { Empty, Heading, Message } from "./ui";
export function Diagnostics({ client }: { client: SupabaseClient }) {
  const { data, error, loading, reload } = useData<{
    connected: boolean;
    url: string;
  }>(client, "diagnostics");
  return (
    <>
      <Heading
        title="Diagnósticos"
        description="Investigue padrões de erro sem acessar os documentos da equipe."
      />
      {error && (
        <Message error>
          {error} <button onClick={reload}>Tentar novamente</button>
        </Message>
      )}
      <section className="panel">
        <div className="panel-head">
          <h2>Sentry</h2>
          <span className="pill neutral">
            {loading
              ? "Verificando…"
              : data?.connected
                ? "Conectado"
                : "Leitura não conectada"}
          </span>
        </div>
        <Empty>
          A consulta de erros pelo painel depende da configuração de leitura do
          projeto Sentry.
        </Empty>
        {data && (
          <a
            className="external-button"
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir Sentry privado ↗
          </a>
        )}
        <p className="hint">
          O compartilhamento de erros já existente no site continua independente
          deste painel. O DSN público não permite ler eventos.
        </p>
      </section>
    </>
  );
}
interface Audit {
  id: number;
  action: string;
  object_id: string;
  revision: number;
  changed_at: string;
}
const actions: Record<string, string> = {
  notice_created: "Criou um aviso",
  notice_draft: "Salvou um rascunho",
  notice_published: "Publicou um aviso",
  notice_withdrawn: "Retirou um aviso",
};
export function History({ client }: { client: SupabaseClient }) {
  const { data, error, loading, reload } = useData<Audit[]>(client, "history");
  return (
    <>
      <Heading
        title="Histórico"
        description="Acompanhe as alterações administrativas registradas."
      />
      {error && (
        <Message error>
          {error} <button onClick={reload}>Tentar novamente</button>
        </Message>
      )}
      <section className="panel">
        {loading ? (
          <Message>Carregando histórico…</Message>
        ) : !data?.length ? (
          <Empty>Nenhuma alteração administrativa registrada.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Revisão</th>
                  <th>Horário</th>
                  <th>Ambiente</th>
                </tr>
              </thead>
              <tbody>
                {data.map((h) => (
                  <tr key={h.id}>
                    <td>{actions[h.action] || "Alteração administrativa"}</td>
                    <td>{h.revision}</td>
                    <td>{new Date(h.changed_at).toLocaleString("pt-BR")}</td>
                    <td>Homologação</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">
          O banco registra a conta responsável junto da alteração. Este
          histórico cobre avisos; os eventos de autenticação ficam no provedor
          Auth.
        </p>
      </section>
    </>
  );
}
export function Settings() {
  return (
    <>
      <Heading
        title="Ajustes"
        description="Configuração do ambiente e limites de operação."
      />
      <section className="panel">
        <div className="panel-head">
          <h2>Ambiente de homologação</h2>
          <span className="pill neutral">Cloudflare Free</span>
        </div>
        <div className="security-meta">
          <strong>Site público</strong>
          <small>Continua no GitHub Pages, independente deste painel.</small>
        </div>
        <div className="security-meta">
          <strong>Coleta de utilização</strong>
          <small>
            Não habilitada. Nenhum documento ou nome de arquivo é recebido.
          </small>
        </div>
        <div className="security-meta">
          <strong>Ajustes globais</strong>
          <small>
            Etapa posterior ao piloto. Não há controles remotos de código ou
            bloqueio de ferramentas.
          </small>
        </div>
        <div className="note-box">
          O Omni não é utilizado por esta aplicação. Não há contratação
          automática de recursos pagos.
        </div>
      </section>
    </>
  );
}
