import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { POST as logout } from "@/app/api/auth/logout/route";

function makeReq(body: object, cookieHeader?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookieHeader) headers.cookie = cookieHeader;
  return new NextRequest("http://localhost/x", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function cookieString(res: Response, name: string): string | undefined {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const match = setCookie.find((c) => c.startsWith(`${name}=`));
  return match?.split(";")[0];
}

describe("auth flow", () => {
  it("register -> login -> refresh -> logout end-to-end", async () => {
    const email = `${Date.now()}@x.com`;

    const reg = await register(makeReq({ email, password: "secret123" }) as any);
    expect(reg.status).toBe(200);
    const access1 = cookieString(reg, "access_token");
    expect(access1).toBeDefined();

    const log = await login(makeReq({ email, password: "secret123" }) as any);
    expect(log.status).toBe(200);
    const refresh1 = cookieString(log, "refresh_token");
    expect(refresh1).toBeDefined();

    const ref = await refresh(makeReq({}, refresh1) as any);
    expect(ref.status).toBe(200);

    const out = await logout(makeReq({}, refresh1) as any);
    expect(out.status).toBe(200);

    // second refresh after the first refresh has rotated is also a no-op (token already used)
    const failed = await refresh(makeReq({}, refresh1) as any);
    expect(failed.status).toBe(401);
  });

  it("login with wrong password returns 401", async () => {
    const email = `${Date.now()}@x.com`;
    await register(makeReq({ email, password: "secret123" }) as any);
    const res = await login(makeReq({ email, password: "wrong" }) as any);
    expect(res.status).toBe(401);
  });

  it("register with weak password returns 400", async () => {
    const res = await register(makeReq({ email: "x@x.com", password: "short" }) as any);
    expect(res.status).toBe(400);
  });
});
