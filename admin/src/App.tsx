import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { api, createAuth, HttpError, type Config } from "./auth";
import { Access, type AccessState } from "./Access";
import { Account } from "./Account";
import { Metrics } from "./Metrics";
import { Notices } from "./Notices";
import { Diagnostics, History, Settings } from "./OtherPages";
import { Icon, Message, Theme } from "./ui";
const pages = {
  overview: ["Visão geral", "home"],
  tools: ["Ferramentas", "tools"],
  diagnostics: ["Diagnósticos", "pulse"],
  announcements: ["Avisos", "bell"],
  settings: ["Ajustes", "settings"],
  history: ["Histórico", "clock"],
  account: ["Conta e segurança", "user"],
} as const;
type Page = keyof typeof pages;
function pageFromHash(): Page {
  const key = location.hash.slice(1);
  return key in pages ? (key as Page) : "overview";
}
export function App() {
  const [config, setConfig] = useState<Config | null>(null),
    [client, setClient] = useState<SupabaseClient | null>(null),
    [failure, setFailure] = useState(""),
    [state, setState] = useState<AccessState>("loading");
  const [page, setPage] = useState<Page>(pageFromHash),
    [menu, setMenu] = useState(false);
  const recovery = useRef(false);
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    void fetch("/api/config", {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(10000),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const config: Config = await response.json();
        if (!active) return;
        setConfig(config);
        if (!config.authConfigured) {
          setFailure(
            "A autenticação ainda não foi configurada neste ambiente.",
          );
          return;
        }
        const next = createAuth(config);
        setClient(next);
        const sub = next.auth.onAuthStateChange((event) => {
          if (event === "INITIAL_SESSION") return;
          if (event === "PASSWORD_RECOVERY") {
            recovery.current = true;
            setState("new-password");
          } else if (event === "SIGNED_OUT") {
            recovery.current = false;
            setState("login");
          } else {
            setTimeout(() => {
              if (active && !recovery.current) void check(next);
            }, 0);
          }
        });
        cleanup = () => {
          sub.data.subscription.unsubscribe();
          void next.auth.stopAutoRefresh();
        };
        await next.auth.getSession();
        if (!recovery.current) await check(next);
      })
      .catch(() => {
        if (active)
          setFailure(
            "Não foi possível conectar ao ambiente. Verifique sua conexão e recarregue.",
          );
      });
    return () => {
      active = false;
      cleanup?.();
    };
  }, []);
  async function check(auth = client) {
    if (!auth) return;
    try {
      const { data } = await auth.auth.getSession();
      if (!data.session) {
        setState("login");
        return;
      }
      if (recovery.current) {
        setState("new-password");
        return;
      }
      const result = await api<{
        administrator: boolean;
        mfaRequired: boolean;
      }>(auth, "session");
      if (location.pathname === "/auth/invite") {
        recovery.current = true;
        history.replaceState(null, "", "/");
        setState("new-password");
      } else setState(result.mfaRequired ? "mfa" : "ready");
    } catch (error) {
      if (error instanceof HttpError && error.status === 403)
        setState("denied");
      else
        setFailure(
          "Não foi possível validar sua sessão. Verifique a conexão e entre novamente.",
        );
    }
  }
  useEffect(() => {
    function change() {
      setPage(pageFromHash());
      setMenu(false);
      window.scrollTo(0, 0);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("h1")?.focus(),
      );
    }
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("nav-open", menu);
    return () => document.body.classList.remove("nav-open");
  }, [menu]);
  useEffect(() => {
    document.title =
      (state === "ready" ? pages[page][0] : "Acesso") +
      " · CentralPDF · Homologação";
  }, [page, state]);
  if (failure)
    return (
      <div className="access-screen">
        <section className="access-card">
          <div className="login-logo">
            <span className="logo">P</span>
            <b>CentralPDF</b>
          </div>
          <h1>Conexão indisponível</h1>
          <Message error>{failure}</Message>
          <button onClick={() => location.reload()}>Tentar novamente</button>
        </section>
      </div>
    );
  if (!config || !client)
    return (
      <div className="access-screen">
        <Message>Carregando ambiente de homologação…</Message>
      </div>
    );
  if (state !== "ready")
    return (
      <Access
        client={client}
        config={config}
        state={state}
        setState={setState}
        refresh={() => check()}
      />
    );
  return (
    <>
      <button
        className="scrim"
        aria-label="Fechar menu"
        onClick={() => setMenu(false)}
      />
      <aside className="sidebar" id="sidebar">
        <a className="brand" href="#overview">
          <span className="logo">P</span>
          <div>
            <b>CentralPDF</b>
            <span>Administração</span>
          </div>
        </a>
        <nav aria-label="Seções do painel">
          {Object.entries(pages).map(([key, [label, icon]]) => (
            <a
              key={key}
              className="nav-link"
              href={"#" + key}
              aria-current={key === page ? "page" : undefined}
            >
              <Icon name={icon} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="account">
            <Icon name="user" />
            <div>
              <strong>Administrador</strong>
              <small>Acesso privado · homologação</small>
            </div>
          </div>
          <button
            className="quiet"
            onClick={() =>
              void client.auth.signOut({ scope: "local" }).then((result) => {
                if (result.error)
                  setFailure(
                    "Não foi possível confirmar a saída. Verifique sua conexão e tente novamente.",
                  );
              })
            }
          >
            Sair da conta
          </button>
        </div>
      </aside>
      <div className="app">
        <header className="topbar">
          <button
            className="quiet menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={menu}
            aria-controls="sidebar"
            onClick={() => setMenu(!menu)}
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            CentralPDF <span>/ Administração</span>
          </div>
          <div className="top-actions">
            <span className="environment-label">Homologação</span>
            <Theme />
          </div>
        </header>
        <main>
          <div className="demo-banner">
            Homologação · dados deste ambiente · o site público permanece
            independente
          </div>
          {page === "overview" ? (
            <Metrics client={client} />
          ) : page === "tools" ? (
            <Metrics client={client} tools />
          ) : page === "announcements" ? (
            <Notices client={client} />
          ) : page === "account" ? (
            <Account client={client} />
          ) : page === "diagnostics" ? (
            <Diagnostics client={client} />
          ) : page === "history" ? (
            <History client={client} />
          ) : (
            <Settings />
          )}
        </main>
      </div>
    </>
  );
}
