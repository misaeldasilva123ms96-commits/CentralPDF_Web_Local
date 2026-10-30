import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { strongPassword } from "./auth";
import { Heading, Icon, Message, Modal } from "./ui";
export function Account({ client }: { client: SupabaseClient }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("new-password"));
    setError("");
    if (
      !strongPassword(password) ||
      password !== data.get("confirm-password")
    ) {
      setError(
        "Use pelo menos 12 caracteres, evite sequências numéricas e confirme a mesma senha.",
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({
        password,
        current_password: String(data.get("current-password")),
      });
      if (error) throw error;
      form.reset();
      if (data.get("end-sessions")) {
        const result = await client.auth.signOut({ scope: "others" });
        if (result.error) {
          setMessage(
            "Senha alterada. Não foi possível confirmar o encerramento das outras sessões; tente novamente abaixo.",
          );
          setOpen(false);
          return;
        }
      }
      setOpen(false);
      setMessage(
        "Senha alterada. " +
          (data.get("end-sessions")
            ? "As outras sessões foram encerradas."
            : ""),
      );
    } catch {
      setError(
        "Não foi possível alterar a senha. Confira a senha atual e tente novamente. Se o provedor exigir nova autenticação, saia e entre novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function endSessions() {
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.signOut({ scope: "others" });
      if (error) throw error;
      setMessage(
        "As outras sessões foram encerradas. Esta sessão permanece ativa.",
      );
    } catch {
      setError("Não foi possível encerrar as outras sessões. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Conta e segurança"
        description="Gerencie seu acesso administrativo em um só lugar."
      />
      {message && <Message>{message}</Message>}
      {error && !open && <Message error>{error}</Message>}
      <div className="security-grid">
        <section className="panel">
          <div className="security-label">
            <Icon name="user" />
            <h2>Acesso à conta</h2>
          </div>
          <div className="security-meta">
            <strong>Administrador do CentralPDF</strong>
            <small>Identidade verificada pelo provedor de autenticação.</small>
          </div>
          <div className="security-meta">
            <strong>Senha</strong>
            <small>Altere sua senha sem precisar sair do painel.</small>
          </div>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => {
                setError("");
                setOpen(true);
              }}
            >
              Alterar senha
            </button>
          </div>
          <div className="note-box">
            Confirme sua senha atual e use uma senha forte e exclusiva. Nunca
            compartilhe sua senha.
          </div>
        </section>
        <aside className="security-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Verificação em duas etapas</h2>
              <span className="pill">Validada nesta sessão</span>
            </div>
            <p>
              O segundo fator é obrigatório para acessar dados e ações
              administrativas.
            </p>
            <small>
              A recuperação do segundo fator é separada da recuperação de senha.
              Guarde seus meios de recuperação com segurança.
            </small>
          </section>
          <section className="panel">
            <h2>Sessões e dispositivos</h2>
            <p>
              Encerre outros acessos quando trocar de equipamento ou suspeitar
              de uso indevido.
            </p>
            <button onClick={() => void endSessions()} disabled={busy}>
              Encerrar outras sessões
            </button>
            <p className="hint">
              A lista individual de dispositivos ainda não está disponível.
            </p>
          </section>
        </aside>
      </div>
      {open && (
        <Modal
          title="Alterar senha"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={(event) => void change(event)}>
            {error && <Message error>{error}</Message>}
            <div className="field">
              <label htmlFor="current-password">Senha atual</label>
              <input
                id="current-password"
                name="current-password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                disabled={busy}
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">Nova senha</label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
              />
              <small>
                Pelo menos 12 caracteres. Evite sequências numéricas.
              </small>
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirmar nova senha</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
              />
            </div>
            <label className="switch-row">
              <div>
                <strong>Encerrar outras sessões</strong>
                <small>Proteja os outros acessos após a troca.</small>
              </div>
              <input
                type="checkbox"
                name="end-sessions"
                defaultChecked
                disabled={busy}
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar nova senha"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
