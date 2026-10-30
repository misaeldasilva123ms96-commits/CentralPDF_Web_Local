import { describe, it, expect, vi } from "vitest";
import {
  handle,
  validateNotice,
  readJson,
  type WorkerEnv,
} from "../worker/index";
const origin = "https://admin.example.test";
const env: WorkerEnv = {
  ASSETS: {
    fetch: vi.fn(async () => new Response("shell")),
    connect() {
      throw new Error("not used");
    },
  },
  ENVIRONMENT: "staging",
  APP_ORIGIN: origin,
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SENTRY_ORG: "test",
  SENTRY_PROJECT: "",
  ADMIN_READY: "false",
};
const token = "test-valid-token-only-for-contract-tests";
const request = (path: string, options: RequestInit = {}) =>
  new Request(origin + path, options);
const authorized = (path: string) =>
  request(path, { headers: { Authorization: "Bearer " + token } });
function upstream(member = true, aal2 = true) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user"))
      return Response.json({
        id: "80000000-0000-4000-8000-000000000001",
        user_metadata: { admin: true },
      });
    if (url.endsWith("admin_membership")) return Response.json(member);
    if (url.endsWith("admin_access")) return Response.json(aal2);
    return Response.json([]);
  });
}
const notice = {
  id: null,
  title: "Aviso",
  message: "Mensagem",
  level: "info",
  state: "draft",
  starts_at: "2026-10-30T12:00:00Z",
  ends_at: null,
  revision: null,
};
describe("private API boundaries", () => {
  it("never returns the SPA for unauthenticated API routes", async () => {
    const f = upstream();
    for (const path of [
      "/api",
      "/api/overview",
      "/api/notices",
      "/api/history",
      "/api/missing",
    ]) {
      const r = await handle(request(path), env, f);
      expect(r.status).toBe(401);
      expect(r.headers.get("Cache-Control")).toContain("no-store");
    }
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects alternate hosts and cross-origin writes before upstream calls", async () => {
    const f = upstream();
    expect(
      (await handle(new Request("https://other.test/api/history"), env, f))
        .status,
    ).toBe(403);
    expect(
      (
        await handle(
          request("/api/notices", {
            method: "POST",
            headers: {
              Origin: "https://other.test",
              Authorization: "Bearer " + token,
            },
          }),
          env,
          f,
        )
      ).status,
    ).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });
  it("does not grant access from editable metadata", async () => {
    const f = upstream(false);
    expect((await handle(authorized("/api/history"), env, f)).status).toBe(403);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("allows only membership status before MFA", async () => {
    const f = upstream(true, false);
    expect(
      await (await handle(authorized("/api/session"), env, f)).json(),
    ).toEqual({ administrator: true, mfaRequired: true });
    for (const p of ["overview", "notices", "history", "diagnostics"])
      expect((await handle(authorized("/api/" + p), env, f)).status).toBe(403);
  });
  it("fails closed when Auth is unavailable and conceals provider details", async () => {
    const f = vi.fn<typeof fetch>(
      async () => new Response("sensitive provider message", { status: 500 }),
    );
    const r = await handle(authorized("/api/history"), env, f);
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("sensitive");
  });
  it("does not claim missing utilization as zero", async () => {
    const r = await handle(authorized("/api/overview"), env, upstream());
    expect(await r.json()).toEqual({
      metrics: [],
      collectionEnabled: false,
      activeSessions: null,
    });
  });
  it("uses only the narrow RPC for anonymous notice projection", async () => {
    const f = upstream();
    expect((await handle(request("/api/public/notices"), env, f)).status).toBe(
      200,
    );
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toContain("rpc/published_notices");
    expect(new Headers(f.mock.calls[0][1]?.headers).has("Authorization")).toBe(
      false,
    );
  });
  it("maps revision conflicts and forwards only validated notice fields", async () => {
    const f = upstream();
    f.mockImplementation(async (input) =>
      String(input).endsWith("save_admin_notice")
        ? new Response("{}", { status: 409 })
        : upstream()(input),
    );
    const r = await handle(
      request("/api/notices", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notice),
      }),
      env,
      f,
    );
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "revision_conflict" });
  });
});
describe("bounded inputs", () => {
  it("rejects oversized streaming bodies even without Content-Length", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("x".repeat(5000)));
        c.close();
      },
    });
    await expect(readJson(new Response(stream), 4096)).rejects.toMatchObject({
      status: 413,
    });
  });
  it("validates lengths, fields, states, revisions and date order", () => {
    expect(validateNotice(notice)).toMatchObject({
      p_id: null,
      p_state: "draft",
    });
    for (const v of [
      { ...notice, state: "published" },
      { ...notice, title: " " },
      { ...notice, title: "x".repeat(81) },
      { ...notice, extra: "unexpected" },
      { ...notice, ends_at: "2026-10-29" },
      { ...notice, id: "80000000-0000-4000-8000-000000000001", revision: 0 },
    ])
      expect(() => validateNotice(v)).toThrow();
  });
});
