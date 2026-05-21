# Phase 2 — JWT auth + Gemini LLM (rip out Makebell)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Read [`2026-05-17-vakil-rebrand-index.md`](./2026-05-17-vakil-rebrand-index.md) for the per-phase workflow.

**Pre-requisite:** Phase 1 PR merged to `main`. `prisma` and `vitest` are installed; `lib/db.ts` exports a cached `PrismaClient`.

**Goal:** Replace every Makebell dependency (auth middleware, LLM proxy, `services/authService.ts`, the user-context flow) with self-contained alternatives. After this phase, the app authenticates via local JWT against the Prisma `User` table and calls Google Gemini directly. Nothing in the codebase mentions `platform.makebell.com`.

**Architecture:** Two new `Prisma` models (`User`, `RefreshToken`). A `lib/auth/` library does password hashing (bcryptjs), JWT signing (jsonwebtoken), and refresh-token rotation in a transaction. Five REST endpoints. A new TypeScript `middleware.ts` verifies the access JWT and gates app + API routes. `lib/llm/index.ts` is rewritten to use `@google/genai` directly with the same `queryLLM()` interface, minus the `accessToken` parameter.

**Tech stack additions:** `bcryptjs`, `@types/bcryptjs`, `jsonwebtoken`, `@types/jsonwebtoken`. `@google/genai` is already a dep.

---

## File Structure

**Created:**
- `lib/auth/password.ts` — bcrypt hash + verify
- `lib/auth/tokens.ts` — JWT sign/verify, refresh mint/rotate/revoke
- `lib/auth/session.ts` — `getCurrentUser()` helper for server components/routes
- `lib/auth/cookies.ts` — cookie name + option constants
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/login/page.tsx` — minimal functional login form (visual polish in Phase 5)
- `app/register/page.tsx` — minimal functional register form
- `middleware.ts` — new gating middleware (replaces `middleware.js`)
- `tests/auth/password.test.ts`
- `tests/auth/tokens.test.ts`
- `tests/api/auth.test.ts` — integration test for register → login → refresh → me → logout

**Modified:**
- `prisma/schema.prisma` — `User`, `RefreshToken` models, fresh migration
- `lib/llm/index.ts` — rewritten to Gemini direct
- `hooks/useAuth.ts` — calls new endpoints, manages auto-refresh
- `contexts/AuthProvider.tsx` — updated `logout` flow (no external redirect)
- `types/auth.ts` — simplify `User` to the local shape
- `services/socService.ts`, `services/caseService.ts`, etc. — none change in this phase
- `lib/orchestration/agents/*.ts` — remove the `verifyAccessToken` / `refreshTokens` token-refresh blocks; agents no longer need `accessToken`/`refreshToken` in context (the route handler validates once before invoking the graph)
- All `app/api/**/route.ts` that called `queryLLM` — drop the `accessToken` argument; switch the auth check from cookies-with-makebell-verification to `getCurrentUser()`
- `.env.example` — add `JWT_ACCESS_SECRET`, drop `NEXT_PUBLIC_SUPABASE_URL`
- `app/page.tsx` — remove the `accessToken` cookie hacks now that auth is uniform

**Deleted:**
- `middleware.js`
- `services/authService.ts` (Makebell HTTP client)
- `app/api/auth/token/route.ts`, `app/api/auth/user-context/route.ts`, `app/api/auth/logout/route.ts` (old Makebell-shaped routes) — note the new `logout/route.ts` is created above; do the delete first, then the create
- Any other `app/api/auth/*` that pre-existed

---

## Task 1: Create phase branch

- [ ] **Step 1:** `git checkout main && git pull origin main && git status` — must be clean.
- [ ] **Step 2:** `git checkout -b feat/phase-2-auth-llm`

---

## Task 2: Add `User` and `RefreshToken` to Prisma schema

**File to modify:** `prisma/schema.prisma`

- [ ] **Step 1: Append the two models**

Add at the bottom of `prisma/schema.prisma`:

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id         String    @id @default(cuid())
  userId     String
  tokenHash  String    @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

- [ ] **Step 2: Generate migration**

```bash
npx prisma migrate dev --name add-users-and-refresh-tokens
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add User and RefreshToken models"
```

---

## Task 3: Install auth deps and set env vars

- [ ] **Step 1: Install**

```bash
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

- [ ] **Step 2: Update `.env.example`**

Edit `.env.example`. Add:

```
# JWT signing (any 32+ random bytes). Generate: node -e "console.log(crypto.randomBytes(48).toString('base64url'))"
JWT_ACCESS_SECRET=replace-with-a-long-random-string
```

Remove `NEXT_PUBLIC_SUPABASE_URL` from `.env.example` — Makebell goes away in this phase.

- [ ] **Step 3: Update local `.env`**

Add a real `JWT_ACCESS_SECRET` to `.env`:

```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))" >> .env
```

Delete the `NEXT_PUBLIC_SUPABASE_URL` line from `.env`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(auth): install bcryptjs + jsonwebtoken, add JWT_ACCESS_SECRET env"
```

---

## Task 4: Write `lib/auth/password.ts` (TDD)

**Files:** `lib/auth/password.ts`, `tests/auth/password.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// tests/auth/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
  it("hashes a password to a non-plaintext string", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifyPassword returns true on the right password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("verifyPassword returns false on the wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Confirm red.** `npx vitest run tests/auth/password.test.ts`

- [ ] **Step 3: Implementation**

```ts
// lib/auth/password.ts
import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Confirm green.**

- [ ] **Step 5: Commit**

```bash
git add lib/auth/password.ts tests/auth/password.test.ts
git commit -m "feat(auth): bcrypt password hashing"
```

---

## Task 5: Write `lib/auth/cookies.ts`

**File:** `lib/auth/cookies.ts`

- [ ] **Step 1: Implement**

No test needed — constants only.

```ts
// lib/auth/cookies.ts
export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export const ACCESS_MAX_AGE = 60 * 15;             // 15 minutes
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;   // 7 days

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/cookies.ts
git commit -m "feat(auth): cookie name and option constants"
```

---

## Task 6: Write `lib/auth/tokens.ts` (TDD)

**Files:** `lib/auth/tokens.ts`, `tests/auth/tokens.test.ts`

This is the most security-critical file in the codebase. Test every behaviour.

- [ ] **Step 1: Failing tests**

```ts
// tests/auth/tokens.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { testPrisma } from "../helpers/testDb";
import {
  signAccessToken,
  verifyAccessToken,
  mintRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokensForUser,
} from "@/lib/auth/tokens";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "test-secret-please-ignore";
});

async function makeUser() {
  return testPrisma.user.create({
    data: { email: `${Math.random()}@x.com`, passwordHash: "x" },
  });
}

describe("access tokens", () => {
  it("sign and verify round-trip", () => {
    const t = signAccessToken("user-123");
    expect(verifyAccessToken(t)).toEqual({ userId: "user-123" });
  });

  it("verifyAccessToken returns null on tampered token", () => {
    const t = signAccessToken("user-123");
    expect(verifyAccessToken(t + "x")).toBeNull();
  });

  it("verifyAccessToken returns null on a token signed with a different secret", () => {
    const t = signAccessToken("user-123");
    process.env.JWT_ACCESS_SECRET = "different-secret";
    expect(verifyAccessToken(t)).toBeNull();
    process.env.JWT_ACCESS_SECRET = "test-secret-please-ignore";
  });
});

describe("refresh tokens", () => {
  it("mintRefreshToken creates a DB row and returns the raw token", async () => {
    const u = await makeUser();
    const raw = await mintRefreshToken(u.id);
    expect(raw.length).toBeGreaterThan(20);
    const rows = await testPrisma.refreshToken.findMany({ where: { userId: u.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);  // stored hashed
  });

  it("rotateRefreshToken returns a new token and revokes the old one", async () => {
    const u = await makeUser();
    const raw = await mintRefreshToken(u.id);
    const next = await rotateRefreshToken(raw);
    expect(next).not.toBeNull();
    expect(next!.userId).toBe(u.id);
    expect(next!.token).not.toBe(raw);

    const rows = await testPrisma.refreshToken.findMany({ where: { userId: u.id } });
    expect(rows).toHaveLength(2);
    const old = rows.find((r) => r.id !== rows.find((x) => x.revokedAt === null)?.id);
    // exactly one row is revoked, one is fresh
    expect(rows.filter((r) => r.revokedAt !== null)).toHaveLength(1);
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(1);
  });

  it("rotateRefreshToken returns null on a revoked token (re-use detection)", async () => {
    const u = await makeUser();
    const raw = await mintRefreshToken(u.id);
    await rotateRefreshToken(raw);             // first rotate ok
    const again = await rotateRefreshToken(raw); // second rotate must fail
    expect(again).toBeNull();
  });

  it("rotateRefreshToken returns null on an expired token", async () => {
    const u = await makeUser();
    const raw = await mintRefreshToken(u.id);
    await testPrisma.refreshToken.updateMany({
      where: { userId: u.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await rotateRefreshToken(raw)).toBeNull();
  });

  it("revokeAllRefreshTokensForUser marks every row revoked", async () => {
    const u = await makeUser();
    await mintRefreshToken(u.id);
    await mintRefreshToken(u.id);
    await revokeAllRefreshTokensForUser(u.id);
    const rows = await testPrisma.refreshToken.findMany({ where: { userId: u.id } });
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Confirm red.**

- [ ] **Step 3: Implementation**

```ts
// lib/auth/tokens.ts
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

const ACCESS_TTL_SECONDS = 60 * 15;          // 15 minutes
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("JWT_ACCESS_SECRET is not set");
  return s;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: ACCESS_TTL_SECONDS });
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, secret()) as jwt.JwtPayload;
    if (typeof decoded.sub !== "string") return null;
    return { userId: decoded.sub };
  } catch {
    return null;
  }
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function mintRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
    },
  });
  return raw;
}

export async function rotateRefreshToken(
  raw: string,
): Promise<{ token: string; userId: string } | null> {
  const tokenHash = hashToken(raw);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!existing) return null;
    if (existing.revokedAt) return null;
    if (existing.expiresAt.getTime() < Date.now()) return null;

    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const nextRaw = crypto.randomBytes(32).toString("base64url");
    await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(nextRaw),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      },
    });

    return { token: nextRaw, userId: existing.userId };
  });
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
```

- [ ] **Step 4: Confirm green.**

```bash
npx vitest run tests/auth/tokens.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth/tokens.ts tests/auth/tokens.test.ts
git commit -m "feat(auth): jwt access tokens and rotating refresh tokens"
```

---

## Task 7: Write `lib/auth/session.ts`

**File:** `lib/auth/session.ts`

- [ ] **Step 1: Implement**

```ts
// lib/auth/session.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "./tokens";
import { ACCESS_COOKIE } from "./cookies";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/session.ts
git commit -m "feat(auth): getCurrentUser / requireCurrentUser server helpers"
```

---

## Task 8: Auth API routes — register

**File to delete first:** `app/api/auth/` — remove old Makebell routes.

```bash
git rm -r app/api/auth/
```

**File to create:** `app/api/auth/register/route.ts`

- [ ] **Step 1: Implement**

```ts
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, mintRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  cookieOptions,
} from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "email and password (≥8 chars) required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email already registered" }, { status: 409 });

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const access = signAccessToken(user.id);
  const refresh = await mintRefreshToken(user.id);

  const res = NextResponse.json({ user });
  res.cookies.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_MAX_AGE));
  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/register/
git commit -m "feat(auth): POST /api/auth/register"
```

---

## Task 9: Auth API routes — login, refresh, logout, me

For each route, write the implementation, then commit individually.

- [ ] **Step 1: `app/api/auth/login/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, mintRefreshToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE, REFRESH_COOKIE,
  ACCESS_MAX_AGE, REFRESH_MAX_AGE,
  cookieOptions,
} from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const access = signAccessToken(user.id);
  const refresh = await mintRefreshToken(user.id);

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  });
  res.cookies.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_MAX_AGE));
  return res;
}
```

Commit: `feat(auth): POST /api/auth/login`

- [ ] **Step 2: `app/api/auth/refresh/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken, signAccessToken } from "@/lib/auth/tokens";
import {
  ACCESS_COOKIE, REFRESH_COOKIE,
  ACCESS_MAX_AGE, REFRESH_MAX_AGE,
  cookieOptions,
} from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!raw) return NextResponse.json({ error: "no refresh token" }, { status: 401 });

  const rotated = await rotateRefreshToken(raw);
  if (!rotated) {
    const res = NextResponse.json({ error: "refresh failed" }, { status: 401 });
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  const access = signAccessToken(rotated.userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, rotated.token, cookieOptions(REFRESH_MAX_AGE));
  return res;
}
```

Commit: `feat(auth): POST /api/auth/refresh with rotation`

- [ ] **Step 3: `app/api/auth/logout/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (raw) {
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
```

Commit: `feat(auth): POST /api/auth/logout revokes refresh token`

- [ ] **Step 4: `app/api/auth/me/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
```

Commit: `feat(auth): GET /api/auth/me`

---

## Task 10: Integration test for the full auth flow

**File:** `tests/api/auth.test.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/api/auth.test.ts
import { describe, it, expect } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login }    from "@/app/api/auth/login/route";
import { POST as refresh }  from "@/app/api/auth/refresh/route";
import { POST as logout }   from "@/app/api/auth/logout/route";

function makeReq(body: object, cookieHeader?: string) {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: cookieHeader ? { cookie: cookieHeader, "content-type": "application/json" } : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function cookieString(res: Response, name: string): string | undefined {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const match = setCookie.find((c) => c.startsWith(`${name}=`));
  return match?.split(";")[0];
}

describe("auth flow", () => {
  it("register → login → refresh → logout end-to-end", async () => {
    const email = `${Date.now()}@x.com`;

    // register
    const reg = await register(makeReq({ email, password: "secret123" }) as any);
    expect(reg.status).toBe(200);
    const access1 = cookieString(reg, "access_token");
    expect(access1).toBeDefined();

    // login (separate)
    const log = await login(makeReq({ email, password: "secret123" }) as any);
    expect(log.status).toBe(200);
    const refresh1 = cookieString(log, "refresh_token");
    expect(refresh1).toBeDefined();

    // refresh
    const ref = await refresh(makeReq({}, refresh1) as any);
    expect(ref.status).toBe(200);

    // logout
    const out = await logout(makeReq({}, refresh1) as any);
    expect(out.status).toBe(200);

    // a second refresh after logout must fail
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
```

- [ ] **Step 2: Run and confirm green**

```bash
npx vitest run tests/api/auth.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/api/auth.test.ts
git commit -m "test(auth): full register/login/refresh/logout integration"
```

---

## Task 11: Replace `middleware.js` with new `middleware.ts`

- [ ] **Step 1: Delete the old middleware**

```bash
git rm middleware.js
```

- [ ] **Step 2: Write the new one**

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/manifest.json") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token || !verifyAccessToken(token)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/case/:path*",
    "/api/cases/:path*",
    "/api/files/:path*",
    "/api/orchestration/:path*",
    "/api/generate/:path*",
    "/api/soc_analysis/:path*",
    "/api/storage/:path*",
    "/api/ocrText/:path*",
    "/api/save/:path*",
    "/api/analyze-pdf/:path*",
    "/api/analyze-pdf-split/:path*",
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "refactor(middleware): replace makebell auth with local jwt gating"
```

---

## Task 12: Functional `/login` and `/register` pages

**Files:** `app/login/page.tsx`, `app/register/page.tsx`

These are intentionally minimal — Phase 5 redesigns them. Goal here is "they work" not "they look good".

- [ ] **Step 1: `app/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid email or password");
      return;
    }
    router.push(search.get("next") ?? "/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border p-6 rounded-lg">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border px-3 py-2 rounded" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border px-3 py-2 rounded" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button>
        <p className="text-sm text-center">New here? <Link href="/register" className="underline">Create an account</Link></p>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: `app/register/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border p-6 rounded-lg">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="w-full border px-3 py-2 rounded" />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border px-3 py-2 rounded" />
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" className="w-full border px-3 py-2 rounded" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">{loading ? "Creating…" : "Create account"}</button>
        <p className="text-sm text-center">Have an account? <Link href="/login" className="underline">Sign in</Link></p>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx
git commit -m "feat(auth): minimal /login and /register pages"
```

---

## Task 13: Rewrite `types/auth.ts` and `hooks/useAuth.ts`, simplify `AuthProvider`

- [ ] **Step 1: `types/auth.ts`**

Replace the file with:

```ts
// types/auth.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface AuthContextType extends AuthState {
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}
```

The old Supabase-shaped `User`, `Identity`, `AuthTokens`, `AuthActionType` enum, and the elaborate `AuthAction` union are gone. Anything still importing them must adapt.

- [ ] **Step 2: `hooks/useAuth.ts`**

Replace entirely:

```ts
// hooks/useAuth.ts
"use client";
import { useEffect, useReducer, useRef } from "react";
import { AuthState, AuthContextType, User } from "@/types/auth";

type Action =
  | { type: "init_start" }
  | { type: "init_done"; user: User | null }
  | { type: "logout_done" }
  | { type: "error"; message: string }
  | { type: "clear_error" };

const initial: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isInitialized: false,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case "init_start": return { ...state, isLoading: true, error: null };
    case "init_done":  return { ...state, isLoading: false, user: action.user, isAuthenticated: !!action.user, isInitialized: true };
    case "logout_done":return { ...state, isLoading: false, user: null, isAuthenticated: false };
    case "error":      return { ...state, isLoading: false, error: action.message };
    case "clear_error":return { ...state, error: null };
  }
}

export function useAuth(): AuthContextType {
  const [state, dispatch] = useReducer(reducer, initial);
  const initRan = useRef(false);

  async function loadUser() {
    dispatch({ type: "init_start" });
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      dispatch({ type: "init_done", user: data.user });
      return;
    }
    if (res.status === 401) {
      // try refresh once
      const ref = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (ref.ok) {
        const me = await fetch("/api/auth/me", { credentials: "include" });
        if (me.ok) {
          const data = await me.json();
          dispatch({ type: "init_done", user: data.user });
          return;
        }
      }
    }
    dispatch({ type: "init_done", user: null });
  }

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    void loadUser();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    dispatch({ type: "logout_done" });
    window.location.href = "/login";
  };

  return {
    ...state,
    logout,
    refreshAuth: loadUser,
    clearError: () => dispatch({ type: "clear_error" }),
  };
}
```

- [ ] **Step 3: `contexts/AuthProvider.tsx`**

Simplify — no more external `authService` import:

```tsx
"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthContextType } from "@/types/auth";
import Navbar from "@/components/Navbar";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      <Navbar user={auth.user} isLoading={auth.isLoading} isAuthenticated={auth.isAuthenticated} onLogout={auth.logout} />
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 4: Update `app/page.tsx`**

Find any references to `getAccessToken`, the manual cookie parsing for `accessToken`, etc. Delete them — the new auth uses cookies that the browser sends automatically with `credentials: "include"`. The `fetchCases` helper just becomes a plain `fetch('/api/cases/user/...', { credentials: 'include' })`.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Any errors here are usually files still importing deleted types (`AuthTokens`, `Identity`, etc). Fix by deleting unused code; do **not** re-add the old types.

- [ ] **Step 6: Commit**

```bash
git add types/auth.ts hooks/useAuth.ts contexts/AuthProvider.tsx app/page.tsx
git commit -m "refactor(auth): rewrite useAuth + AuthProvider for local jwt flow"
```

---

## Task 14: Delete `services/authService.ts`

- [ ] **Step 1: Find callers**

```bash
grep -rln "authService\|services/authService" --include="*.ts" --include="*.tsx" .
```

- [ ] **Step 2: Remove every reference**

- In `contexts/AuthProvider.tsx` it's already gone after Task 13.
- The `Navbar.tsx` and `hooks/useUserBalance.ts` may still import it — replace any `authService.getAccessToken()` call with `fetch('/api/auth/me')` if user info is needed, or just delete the call if it's only used to send an `Authorization` header (cookies handle auth now).

- [ ] **Step 3: Delete the file**

```bash
git rm services/authService.ts
```

- [ ] **Step 4: Type-check, test**

```bash
npx tsc --noEmit
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(auth): delete makebell authService client"
```

---

## Task 15: Rewrite `lib/llm/index.ts` for Gemini direct

**Before touching this file**, verify the current Gemini model name via Context7 (not required to call — accept the model name as a docs-derived constant).

- [ ] **Step 1: Look up current Gemini Flash model name**

If you have Context7 available, query:

```
mcp__plugin_context7_context7__resolve-library-id  "google genai"
mcp__plugin_context7_context7__query-docs  <library-id>  "available gemini flash model names 2026"
```

Otherwise default to `gemini-2.5-pro`. The spec accepts either of: `gemini-2.5-pro`, `gemini-3-flash-preview` (whichever is current at implementation time).

- [ ] **Step 2: Rewrite the file**

```ts
// lib/llm/index.ts
import { GoogleGenAI } from "@google/genai";

export interface LlmQueryOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
  task?: string;
}

export interface LlmResponse {
  success: boolean;
  content?: string;
  error?: string;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client = new GoogleGenAI({ apiKey });
  return client;
}

export async function queryLLM(opts: LlmQueryOptions): Promise<LlmResponse> {
  const { prompt, model = process.env.LLM_MODEL ?? "gemini-2.5-pro", maxTokens = 60000, task = "generic" } = opts;
  if (!prompt?.trim()) return { success: false, error: "prompt is required" };

  try {
    const res = await getClient().models.generateContent({
      model,
      contents: prompt,
      config: { maxOutputTokens: maxTokens },
    });
    const text = res.text ?? "";
    return { success: true, content: text };
  } catch (err) {
    console.error(`[llm:${task}]`, err);
    return { success: false, error: err instanceof Error ? err.message : "unknown llm error" };
  }
}
```

- [ ] **Step 3: Update every `queryLLM` call site**

```bash
grep -rln "queryLLM" --include="*.ts" --include="*.tsx" lib/ app/ services/
```

For each occurrence:
- Remove the `accessToken` argument.
- Remove the `provider`, `appName` arguments (the new function ignores them; cleaner to drop).
- Rename `max_tokens` → `maxTokens` if present.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/llm/ lib/orchestration/agents/ app/api/
git commit -m "refactor(llm): rewrite queryLLM to call gemini directly via @google/genai"
```

---

## Task 16: Strip Makebell token-refresh blocks from agents

Every `lib/orchestration/agents/Generate*.ts` and `Translate*.ts` file currently contains a token-refresh block that imports `verifyAccessToken` / `refreshTokens` from `@/middleware`. That import is now broken (the middleware module no longer exports those — they were JavaScript helpers on the old `middleware.js`).

- [ ] **Step 1: Find them**

```bash
grep -rln "from \"@/middleware\"\|from '@/middleware'" lib/orchestration/
```

- [ ] **Step 2: For each match, remove the import and the entire token-refresh `if (!verification.valid)` block.**

Agents no longer need access tokens at all — the LLM client uses `GEMINI_API_KEY` from process env, and the route handler that invokes them has already validated the session via the new middleware.

While editing each agent, also remove `context.accessToken` and `context.refreshToken` reads. The `AgentContext` shape will be tightened in Phase 3.

- [ ] **Step 3: Type-check, test**

```bash
npx tsc --noEmit
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add lib/orchestration/
git commit -m "refactor(agents): drop makebell token-refresh; trust route-level session check"
```

---

## Task 17: Smoke test the new flow end-to-end

- [ ] **Step 1: Boot the app**

```bash
npm run dev
```

- [ ] **Step 2: Manual checklist** — open in browser:

1. Visit http://localhost:3000 → redirected to `/login?next=/`.
2. Click "Create an account" → register with `test@vakil.app` / `Password1`.
3. After register → land on `/` (cases page, empty).
4. In a new incognito window, visit `/` → redirected to `/login`.
5. Sign in with same credentials → redirected to `/`.
6. Click "Sign out" in the navbar → redirected to `/login`.
7. Hit `/api/auth/me` directly in browser while logged out → 401 JSON response.

- [ ] **Step 3: Confirm no console errors mentioning `platform.makebell.com`.**

```bash
grep -rln "makebell\|platform.makebell" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" .
```
Only allowed match: `docs/superpowers/specs/...` (the spec naturally references it as the thing being removed).

- [ ] **Step 4: Type-check, test, build**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```
The build must succeed.

---

## Task 18: Open PR and merge

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/phase-2-auth-llm
```

- [ ] **Step 2: PR body**

Write `docs/superpowers/plans/.pr-body.md`:

```markdown
## Summary

Rip out every Makebell dependency. Replace with local JWT auth (access + rotating refresh, bcrypt) and Google Gemini direct (`@google/genai`).

## Highlights
- `User` and `RefreshToken` Prisma models.
- `lib/auth/` library with full unit tests on password hashing and token rotation (including re-use detection and expiry).
- 5 new auth routes: register, login, refresh, logout, me. Integration test covers the full flow.
- New `middleware.ts` (TS) replaces `middleware.js` — gates app pages and protected API routes.
- Minimal `/login` and `/register` pages (visual polish lands in Phase 5).
- `lib/llm/index.ts` rewritten — calls Gemini direct, `queryLLM()` no longer takes `accessToken`.
- Agents lose their token-refresh blocks (no longer relevant).
- `services/authService.ts` deleted.

## Test plan
- [x] `npx vitest run` — 5 service tests + 6 auth tests pass
- [x] `npx tsc --noEmit` — clean
- [x] `npm run build` — clean
- [x] Manual: register → login → land on dashboard → logout → re-login (see Task 17)
- [x] `grep -rln makebell` returns only the spec doc

## Out of scope (next phase)
LangGraph orchestration (Phase 3).
```

- [ ] **Step 3: Open PR, merge, sync main**

```bash
gh pr create --base main --head feat/phase-2-auth-llm \
  --title "feat: phase 2 — jwt auth + gemini direct, remove makebell" \
  --body-file docs/superpowers/plans/.pr-body.md
gh pr merge --merge --delete-branch
git checkout main
git pull origin main
```

---

**Phase 2 complete.** Proceed to [Phase 3 — LangGraph orchestration](./2026-05-17-vakil-rebrand-phase-3-langgraph.md).
