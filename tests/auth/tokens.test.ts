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
  it("sign and verify round-trip", async () => {
    const t = await signAccessToken("user-123");
    expect(await verifyAccessToken(t)).toEqual({ userId: "user-123" });
  });

  it("verifyAccessToken returns null on tampered token", async () => {
    const t = await signAccessToken("user-123");
    expect(await verifyAccessToken(t + "x")).toBeNull();
  });

  it("verifyAccessToken returns null on a token signed with a different secret", async () => {
    const t = await signAccessToken("user-123");
    process.env.JWT_ACCESS_SECRET = "different-secret";
    expect(await verifyAccessToken(t)).toBeNull();
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
    expect(rows[0].tokenHash).not.toBe(raw);
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
    expect(rows.filter((r) => r.revokedAt !== null)).toHaveLength(1);
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(1);
  });

  it("rotateRefreshToken returns null on a revoked token (reuse detection)", async () => {
    const u = await makeUser();
    const raw = await mintRefreshToken(u.id);
    await rotateRefreshToken(raw);
    const again = await rotateRefreshToken(raw);
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
