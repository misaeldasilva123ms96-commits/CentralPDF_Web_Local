import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export interface Config {
  environment: string;
  authConfigured: boolean;
  adminReady: boolean;
  supabaseUrl: string;
  publishableKey: string;
}
// Session tokens stay in this tab. Only the short-lived PKCE verifier crosses tabs,
// so a recovery link opened from webmail can complete the same-browser exchange.
const verifierTtl = 10 * 60 * 1000;
export const authStorage = {
  getItem(key: string) {
    if (!key.endsWith("-code-verifier")) return sessionStorage.getItem(key);
    try {
      const entry = JSON.parse(localStorage.getItem(key) || "null");
      if (!entry || Date.now() - entry.at > verifierTtl) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.value as string;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (key.endsWith("-code-verifier"))
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
    else sessionStorage.setItem(key, value);
  },
  removeItem(key: string) {
    sessionStorage.removeItem(key);
    if (key.endsWith("-code-verifier")) localStorage.removeItem(key);
  },
};
export function createAuth(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.publishableKey, {
    auth: {
      flowType: "pkce",
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  client: SupabaseClient,
  path: string,
  body?: unknown,
): Promise<T> {
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("Entre novamente para continuar.");
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + data.session.access_token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  const value = await response.json();
  if (!response.ok)
    throw new HttpError(
      response.status,
      response.status === 409
        ? "Este aviso mudou em outra aba. Recarregue antes de salvar."
        : response.status === 403
          ? "Sua sessão não tem a permissão ou o segundo fator necessário."
          : response.status === 401
            ? "Sua sessão expirou. Entre novamente."
            : "Não foi possível concluir. Tente novamente em instantes.",
    );
  return value as T;
}
export function strongPassword(value: string) {
  return (
    value.length >= 12 &&
    value.length <= 128 &&
    !/^\d+$/.test(value) &&
    !/(.)\1{7}/.test(value)
  );
}
