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
  const checkVersion = useRef(0);
  const invitationIntent = useRef(
    ["/", "/auth/invite"].includes(location.pathname) &&
      new URLSearchParams(location.hash.slice(1)).get("type") === "invite",
  );
  const callbackIntent = useRef(
    ["/auth/invite", "/auth/callback"].includes(location.pathname) ||
      invitationIntent.current,
  );
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
            // Only this document's fixed callback may start password recovery;
            // another tab's broadcast must not replace our account screen.
            if (!callbackIntent.current) return;
            checkVersion.current++;
            recovery.current = true;
            setState("loading");
            // Auth callbacks run under the SDK lock; defer network checks.
            setTimeout(() => {
              if (active) void check(next);
            }, 0);
          } else if (event === "SIGNED_OUT") {
            checkVersion.current++;
            // The SDK broadcasts other tabs' events even with sessionStorage.
            // Recheck this tab instead of treating another session's exit as ours.
            setTimeout(() => {
              if (active) void check(next);
            }, 0);
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
        const { data: initial } = await next.auth.getSession();
        if (!initial.session && callbackIntent.current) {
          setFailure(
            "Este link de acesso é inválido, expirou ou pertence a outro navegador. Solicite um novo link na tela de acesso.",
          );
          return;
        }
        await check(next);
      })
      .catch(() => {
        if (active)
          setFailure(
            "Não foi possível conectar ao ambiente. Verifique sua conexão e recarregue.",
          );
      });
    return () => {
      active = false;
      checkVersion.current++;
      cleanup?.();
    };
  }, []);
  async function check(auth = client) {
    if (!auth) return;
    const version = ++checkVersion.current;
    try {
      const { data } = await auth.auth.getSession();
      if (version !== checkVersion.current) return;
      if (!data.session) {
        recovery.current = false;
        invitationIntent.current = false;
        setState("login");
        return;
      }
      const result = await api<{
        administrator: boolean;
        mfaRequired: boolean;
      }>(auth, "session");
      if (version !== checkVersion.current) return;
      if (recovery.current) {
        // Recovery proves email access, not the existing second factor. Auth
        // refuses password changes at AAL1 when a verified factor exists.
        const { data: factors, error } = await auth.auth.mfa.listFactors();
        if (error) throw error;
        if (version !== checkVersion.current) return;
        setState(
          result.mfaRequired && factors.totp.some((f) => f.status === "verified")
            ? "mfa"
            : "new-password",
        );
        return;
      }
      if (location.pathname === "/auth/invite" || invitationIntent.current) {
        invitationIntent.current = false;
        recovery.current = true;
        history.replaceState(null, "", "/");
        setState("new-password");
      } else setState(result.mfaRequired ? "mfa" : "ready");
    } catch (error) {
      if (version !== checkVersion.current) return;
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
          <h1>
            {callbackIntent.current
              ? "Acesso não confirmado"
              : "Conexão indisponível"}
          </h1>
          <Message error>{failure}</Message>
          <button
            onClick={() =>
              callbackIntent.current ? location.replace("/") : location.reload()
            }
          >
            {callbackIntent.current ? "Voltar ao acesso" : "Tentar novamente"}
          </button>
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
