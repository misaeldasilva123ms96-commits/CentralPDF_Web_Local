import type { SupabaseClient } from "@supabase/supabase-js";
import { useData } from "./data";
import { Empty, Heading, Message } from "./ui";
import { useState } from 'react';
import { api } from './auth';
export function Diagnostics({ client }: { client: SupabaseClient }) {
  const { data, error, loading, reload } = useData<{
    connected: boolean;
    url: string;
    issues: {id:string;code:string;count:string|null;lastSeen:string|null;level:string;url:string}[];
  }>(client, "diagnostics");
  return (
    <>
      <Heading
        title="Diagnósticos"
        description="Investigue padrões de erro sem acessar os documentos da equipe."
      />
      <button onClick={reload} disabled={loading}>Atualizar diagnósticos</button>
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
              : error ? "Indisponível" : data?.connected
                ? "Conectado"
                : "Leitura não conectada"}
          </span>
        </div>
        {data?.connected ? data.issues?.length ? <div className="table-wrap"><table><thead><tr><th>Categoria técnica</th><th>Ocorrências</th><th>Último registro</th></tr></thead><tbody>{data.issues.map(issue=><tr key={issue.id}><td><a href={issue.url} target="_blank" rel="noopener noreferrer">{issue.code.replaceAll('_',' ')}</a></td><td>{issue.count??'Não informado'}</td><td>{issue.lastSeen?new Date(issue.lastSeen).toLocaleString('pt-BR'):'Não informado'}</td></tr>)}</tbody></table></div> : <Empty>Nenhuma ocorrência recebida do Sentry nos últimos 7 dias.</Empty> : <Empty>A consulta depende da credencial de leitura do Sentry no servidor.</Empty>}
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
  usage_collection_enabled: 'Ativou estatísticas opcionais',
  usage_collection_disabled: 'Pausou estatísticas opcionais',
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
          histórico cobre avisos e ajustes de coleta; os eventos de autenticação ficam no provedor
          Auth.
        </p>
      </section>
    </>
  );
}
export function Settings({client}:{client:SupabaseClient}) {
  const {data,error,loading,reload}=useData<{enabled:boolean;revision:number}>(client,'usage/settings');
  const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');
  async function toggle(){if(!data)return;setBusy(true);setFailure('');try{await api(client,'usage/settings',{enabled:!data.enabled,revision:data.revision});reload();}catch(e){setFailure(e instanceof Error?e.message:'Falha ao salvar.');}finally{setBusy(false);}}
  return (
    <>
      <Heading
        title="Ajustes"
        description="Configuração do ambiente e limites de operação."
      />
      {(error||failure)&&<Message error>{error||failure}</Message>}
      <section className="panel">
        <div className="panel-head">
          <h2>Ambiente de homologação</h2>
          <span className="pill neutral">Cloudflare Free</span>
        </div>
        <div className="security-meta">
          <strong>Site público</strong>
          <small>GitHub Pages: ferramentas sem login, avisos publicados e estatísticas opcionais.</small>
        </div>
        <div className="security-meta">
          <strong>Coleta de utilização</strong>
          <small>
            Somente ferramenta, resultado e atividade temporária de abas que autorizaram a coleta. Sem documentos ou nomes de arquivos.
          </small>
          <button onClick={()=>void toggle()} disabled={loading||busy||!data}>{data?.enabled?'Pausar estatísticas':'Ativar estatísticas opcionais'}</button>
          <p>Limites: 5.000 envios/dia no serviço; 720 por aba/dia. Eventos por 7 dias, agregados por 90 dias e auditoria por 180 dias. A pausa global não altera a escolha de cada navegador.</p>
        </div>
        <div className="security-meta">
          <strong>Ajustes globais</strong>
          <small>
            A pausa de estatísticas e as alterações de avisos ficam registradas no histórico. A escolha de compartilhar uso continua sendo de cada navegador.
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
