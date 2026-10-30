/** Stateless API: Auth + live-session/membership/MFA RLS on every private request.
 * No privileged key, documents, cookies or caller-selected user IDs. */
export type WorkerEnv = Env;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
type Fetcher = typeof fetch;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function readJson(
  response: Response,
  limit = 262144,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_json");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, "payload_too_large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_json");
  } finally {
    reader.releaseLock();
  }
}
function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    },
  });
}
const ready = (env: WorkerEnv) =>
  !!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);
async function provider(
  env: WorkerEnv,
  path: string,
  token: string | null,
  init: RequestInit = {},
  fetcher: Fetcher = fetch,
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("apikey", env.SUPABASE_PUBLISHABLE_KEY);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", "Bearer " + token);
  let response: Response;
  try {
    response = await fetcher(env.SUPABASE_URL + path, {
      ...init,
      headers,
      credentials: "omit",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(503, "service_unavailable");
  }
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new ApiError(503, "unexpected_redirect");
  }
  if (!response.ok) {
    if (response.status === 409) throw new ApiError(409, "revision_conflict");
    if (response.status === 401) throw new ApiError(401, "session_expired");
    if (response.status === 403) throw new ApiError(403, "access_denied");
    if (response.status === 429) throw new ApiError(429, "rate_limited");
    throw new ApiError(response.status >= 500 ? 503 : 400, "operation_failed");
  }
  return readJson(response);
}
function bearer(request: Request): string {
  const match = /^Bearer ([A-Za-z0-9._-]{20,8192})$/.exec(
    request.headers.get("Authorization") || "",
  );
  if (!match) throw new ApiError(401, "authentication_required");
  return match[1];
}
export function validateNotice(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "invalid_notice");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) =>
        ![
          "id",
          "title",
          "message",
          "level",
          "state",
          "starts_at",
          "ends_at",
          "revision",
        ].includes(k),
    )
  )
    throw new ApiError(400, "invalid_notice");
  if (
    typeof v.title !== "string" ||
    v.title.trim().length < 1 ||
    v.title.length > 80 ||
    typeof v.message !== "string" ||
    v.message.trim().length < 1 ||
    v.message.length > 240
  )
    throw new ApiError(400, "invalid_notice");
  if (
    !["info", "warning"].includes(String(v.level)) ||
    !["draft", "published", "withdrawn"].includes(String(v.state))
  )
    throw new ApiError(400, "invalid_notice");
  if (v.id !== null && (typeof v.id !== "string" || !UUID.test(v.id)))
    throw new ApiError(400, "invalid_notice");
  if (
    (v.id === null && v.state !== "draft") ||
    (v.id !== null &&
      (!Number.isSafeInteger(v.revision) || Number(v.revision) < 1))
  )
    throw new ApiError(400, "invalid_notice");
  const start = typeof v.starts_at === "string" ? Date.parse(v.starts_at) : NaN;
  const end =
    v.ends_at === null
      ? null
      : typeof v.ends_at === "string"
        ? Date.parse(v.ends_at)
        : NaN;
  if (
    !Number.isFinite(start) ||
    (end !== null && (!Number.isFinite(end) || end <= start))
  )
    throw new ApiError(400, "invalid_notice");
  return {
    p_id: v.id,
    p_title: v.title.trim(),
    p_message: v.message.trim(),
    p_level: v.level,
    p_state: v.state,
    p_starts_at: new Date(start).toISOString(),
    p_ends_at: end === null ? null : new Date(end).toISOString(),
    p_revision: v.id === null ? null : v.revision,
  };
}
export async function handle(
  request: Request,
  env: WorkerEnv,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (!(url.pathname === "/api" || url.pathname.startsWith("/api/")))
    return env.ASSETS.fetch(request);
  try {
    if (url.origin !== env.APP_ORIGIN)
      throw new ApiError(403, "invalid_origin");
    if (!["GET", "POST"].includes(request.method))
      throw new ApiError(405, "method_not_allowed");
    if (
      request.method === "POST" &&
      request.headers.get("Origin") !== env.APP_ORIGIN
    )
      throw new ApiError(403, "invalid_origin");
    const path = url.pathname;
    if (path === "/api/config" && request.method === "GET")
      return json({
        environment: env.ENVIRONMENT,
        authConfigured: ready(env),
        adminReady: env.ADMIN_READY === "true",
        supabaseUrl: env.SUPABASE_URL,
        publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      });
    if (path === "/api/health" && request.method === "GET")
      return json({
        status: "available",
        environment: env.ENVIRONMENT,
        version: "0.1.0",
      });
    if (!ready(env)) throw new ApiError(503, "configuration_required");
    if (path === "/api/public/notices" && request.method === "GET")
      return json(
        await provider(
          env,
          "/rest/v1/rpc/published_notices",
          null,
          { method: "POST", body: "{}" },
          fetcher,
        ),
      );
    const token = bearer(request);
    const user = (await provider(env, "/auth/v1/user", token, {}, fetcher)) as {
      id?: string;
    };
    if (typeof user.id !== "string" || !UUID.test(user.id))
      throw new ApiError(401, "session_expired");
    if (
      (await provider(
        env,
        "/rest/v1/rpc/admin_membership",
        token,
        { method: "POST", body: "{}" },
        fetcher,
      )) !== true
    )
      throw new ApiError(403, "access_denied");
    const access = await provider(
      env,
      "/rest/v1/rpc/admin_access",
      token,
      { method: "POST", body: "{}" },
      fetcher,
    );
    if (path === "/api/session" && request.method === "GET")
      return json({ administrator: true, mfaRequired: access !== true });
    if (access !== true) throw new ApiError(403, "mfa_required");
    if (request.method === "GET") {
      if (path === "/api/overview") {
        const days = url.searchParams.get("period") === "today" ? 1 : 7;
        const since = new Date(Date.now() - (days - 1) * 86400000)
          .toISOString()
          .slice(0, 10);
        return json({
          metrics: await provider(
            env,
            `/rest/v1/admin_daily_metrics?select=day,tool,completed,failed&day=gte.${since}&order=day.asc&limit=238`,
            token,
            {},
            fetcher,
          ),
          collectionEnabled: false,
          activeSessions: null,
        });
      }
      if (path === "/api/notices")
        return json(
          await provider(
            env,
            "/rest/v1/admin_notices?select=*&order=updated_at.desc&limit=50",
            token,
            {},
            fetcher,
          ),
        );
      if (path === "/api/history")
        return json(
          await provider(
            env,
            "/rest/v1/admin_audit?select=id,action,object_id,revision,changed_at&order=changed_at.desc&limit=100",
            token,
            {},
            fetcher,
          ),
        );
      if (path === "/api/diagnostics")
        return json({
          connected: false,
          issues: [],
          url:
            "https://" +
            encodeURIComponent(env.SENTRY_ORG) +
            ".sentry.io/issues/",
          reason: "read_integration_pending",
        });
    }
    if (path === "/api/notices" && request.method === "POST") {
      if (
        !(request.headers.get("Content-Type") || "").startsWith(
          "application/json",
        )
      )
        throw new ApiError(415, "json_required");
      const value = await readJson(new Response(request.body), 4096);
      return json(
        await provider(
          env,
          "/rest/v1/rpc/save_admin_notice",
          token,
          { method: "POST", body: JSON.stringify(validateNotice(value)) },
          fetcher,
        ),
      );
    }
    throw new ApiError(404, "not_found");
  } catch (error) {
    const failure =
      error instanceof ApiError ? error : new ApiError(500, "internal_error");
    return json({ error: failure.code }, failure.status);
  }
}
export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handle(request, env);
  },
};
