import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export { signAccessToken, verifyAccessToken } from "./jwt";

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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
