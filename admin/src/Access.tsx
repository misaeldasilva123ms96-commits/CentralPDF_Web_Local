import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { strongPassword, totpImageSource, type Config } from "./auth";
import { Message, Theme } from "./ui";
export type AccessState =
  "login" | "recover" | "new-password" | "mfa" | "denied" | "loading" | "ready";
export function Access({
  client,
  config,
  state,
  setState,
  refresh,
}: {
  client: SupabaseClient;
  config: Config;
  state: AccessState;
  setState: (s: AccessState) => void;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(() => {
      const updated = sessionStorage.getItem(
        "centralpdf-admin-password-updated",
      );
      sessionStorage.removeItem("centralpdf-admin-password-updated");
      return updated ? "Senha atualizada. Entre novamente para continuar." : "";
    }),
    [error, setError] = useState("");
  const [factor, setFactor] = useState(""),
    [qr, setQr] = useState("");
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch {
      setError(
        "Não foi possível concluir. Confira as informações e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(async () => {
      if (state === "login") {
        const { error } = await client.auth.signInWithPassword({
          email: String(data.get("email")),
          password: String(data.get("password")),
        });
        if (error) throw error;
        form.reset();
        await refresh();
      } else if (state === "recover") {
        const { error } = await client.auth.resetPasswordForEmail(
          String(data.get("email")),
          { redirectTo: location.origin + "/auth/callback" },
        );
        if (error && error.status && error.status >= 500) throw error;
        setMessage(
          "Se houver uma conta habilitada para esse endereço, você receberá as instruções de recuperação.",
        );
        form.reset();
      } else if (state === "new-password") {
        const password = String(data.get("password"));
        if (!strongPassword(password) || password !== data.get("confirm")) {
          setError(
            "Use pelo menos 12 caracteres, evite sequências numéricas e confirme a mesma senha.",
          );
          return;
        }
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        form.reset();
        const logout = await client.auth.signOut({ scope: "global" });
        if (logout.error) {
          setError(
            "Senha alterada, mas não foi possível confirmar o encerramento das sessões. Use a nova senha no próximo acesso e tente sair novamente.",
          );
          return;
        }
        sessionStorage.setItem("centralpdf-admin-password-updated", "1");
        location.replace("/");
      } else if (state === "mfa") {
        if (!factor) throw new Error();
        const { error } = await client.auth.mfa.challengeAndVerify({
          factorId: factor,
          code: String(data.get("code")),
        });
        if (error) throw error;
        setQr("");
        form.reset();
        await refresh();
      }
    });
  }
  async function beginMfa() {
    await run(async () => {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw error;
      const existing = data.totp.find((f) => f.status === "verified");
      if (existing) {
        setFactor(existing.id);
        return;
      }
      for (const old of data.all.filter((f) => f.status === "unverified")) {
        const result = await client.auth.mfa.unenroll({ factorId: old.id });
        if (result.error) throw result.error;
      }
      const result = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "CentralPDF administrador",
      });
      if (result.error) throw result.error;
      setFactor(result.data.id);
      setQr(result.data.totp.qr_code);
    });
  }
  const title =
    state === "recover"
      ? "Esqueci minha senha"
      : state === "new-password"
        ? "Definir nova senha"
        : state === "mfa"
          ? "Verificação em duas etapas"
          : state === "denied"
            ? "Acesso não autorizado"
            : "Acesso do administrador";
  return (
    <div className="access-screen">
      <div className="access-theme">
        <Theme />
      </div>
      <section className="access-card">
        <div className="login-logo">
          <span className="logo">P</span>
          <b>CentralPDF</b>
        </div>
        <h1>{title}</h1>
        <p className="section-intro">
          {state === "mfa"
            ? "Confirme seu segundo fator para acessar os controles."
            : state === "denied"
              ? "Esta conta não tem permissão administrativa."
              : "Área exclusiva do administrador. Os colegas continuam usando as ferramentas sem login."}
        </p>
        <div className="demo-banner">
          Homologação · Cloudflare Free · documentos processados no dispositivo
        </div>
        {!config.adminReady && (
          <Message>
            A configuração do primeiro acesso ainda está em andamento. O login e
            a recuperação serão liberados após validar convite, redirecionamento
            e segurança da conta.
          </Message>
        )}
        {error && <Message error>{error}</Message>}
        {message && <Message>{message}</Message>}
        {state === "loading" ? (
          <Message>Validando sua sessão…</Message>
        ) : state === "denied" ? (
          <button
            className="primary"
            onClick={() =>
              void run(async () => {
                const result = await client.auth.signOut({ scope: "local" });
                if (result.error) throw result.error;
                location.replace("/");
              })
            }
          >
            Voltar ao acesso
          </button>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            {(state === "login" || state === "recover") && (
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  disabled={busy || !config.adminReady}
                />
              </div>
            )}
            {(state === "login" || state === "new-password") && (
              <div className="field">
                <label htmlFor="password">
                  {state === "login" ? "Senha" : "Nova senha"}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    state === "login" ? "current-password" : "new-password"
                  }
                  minLength={state === "login" ? 1 : 12}
                  maxLength={128}
                  required
                  disabled={busy || !config.adminReady}
                />
              </div>
            )}
            {state === "new-password" && (
              <div className="field">
                <label htmlFor="confirm">Confirmar nova senha</label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={busy || !config.adminReady}
                />
              </div>
            )}
            {state === "mfa" && !factor && (
              <button
                type="button"
                className="primary"
                onClick={() => void beginMfa()}
                disabled={busy}
              >
                Configurar ou confirmar segundo fator
              </button>
            )}
            {state === "mfa" && factor && (
              <>
                {qr && (
                  <div className="mfa-qr">
                    <img
                      alt="QR code para cadastrar o CentralPDF no autenticador"
                      src={totpImageSource(qr)}
                    />
                    <p>
                      Escaneie no seu aplicativo autenticador. Guarde os meios
                      de recuperação em local seguro.
                    </p>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="code">Código do autenticador</label>
                  <input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    disabled={busy}
                  />
                </div>
              </>
            )}
            {(state !== "mfa" || factor) && (
              <button
                className="primary access-submit"
                disabled={busy || !config.adminReady}
              >
                {busy
                  ? "Aguarde…"
                  : state === "recover"
                    ? "Enviar instruções"
                    : state === "new-password"
                      ? "Salvar nova senha"
                      : state === "mfa"
                        ? "Confirmar código"
                        : "Entrar"}
              </button>
            )}
          </form>
        )}
        <div className="access-links">
          {state === "login" ? (
            <button
              className="text-link"
              onClick={() => {
                setError("");
                setMessage("");
                setState("recover");
              }}
            >
              Esqueci minha senha
            </button>
          ) : state === "recover" ? (
            <button
              className="text-link"
              onClick={() => {
                setError("");
                setMessage("");
                setState("login");
              }}
            >
              Voltar ao acesso
            </button>
          ) : state === "mfa" || state === "new-password" ? (
            <button
              className="text-link"
              onClick={() =>
                void run(async () => {
                  const result = await client.auth.signOut({ scope: "local" });
                  if (result.error) throw result.error;
                  location.replace("/");
                })
              }
            >
              Sair desta conta
            </button>
          ) : null}
          <a
            href="https://misaeldasilva123ms96-commits.github.io/CentralPDF_Web_Local/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir ferramentas ↗
          </a>
        </div>
      </section>
    </div>
  );
}
